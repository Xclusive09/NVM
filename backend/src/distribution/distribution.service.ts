import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AirtimeProviderService } from './airtime-provider.service';
import { CreateDistributionDto, ValueType } from './dto/create-distribution.dto';
import { isValidNigerianPhoneNumber, normalizePhoneNumber } from '../common/utils/phone.util';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly airtimeProvider: AirtimeProviderService,
    @InjectQueue('distribution') private distributionQueue: Queue,
  ) {}

  async createDistribution(userId: string, dto: CreateDistributionDto) {
    // Validate phone numbers
    const normalizedPhones = dto.phoneNumbers.map(normalizePhoneNumber);
    const validPhones = normalizedPhones.filter(isValidNigerianPhoneNumber);
    const invalidPhones = normalizedPhones.filter((p) => !isValidNigerianPhoneNumber(p));

    if (validPhones.length === 0) {
      throw new BadRequestException('No valid phone numbers provided');
    }

    // Calculate total cost
    let pricePerRecipient: number;
    let dataPlanName: string | undefined;
    let dataPlanCode: string | undefined;

    if (dto.valueType === ValueType.AIRTIME) {
      if (!dto.amount) {
        throw new BadRequestException('Amount is required for airtime');
      }
      pricePerRecipient = dto.amount;
    } else {
      if (!dto.dataPlanId) {
        throw new BadRequestException('Data plan ID is required for data');
      }
      
      // Get data plan details
      const plans = await this.airtimeProvider.getDataPlans(dto.network);
      const plan = plans.find((p) => p.id === dto.dataPlanId);
      
      if (!plan) {
        throw new BadRequestException('Invalid data plan');
      }
      
      pricePerRecipient = plan.price;
      dataPlanName = plan.name;
      dataPlanCode = plan.code;
    }

    const totalCost = pricePerRecipient * validPhones.length;

    // Check wallet balance
    const balance = await this.walletService.getBalance(userId);
    if (new Decimal(balance).lessThan(totalCost)) {
      throw new BadRequestException(
        `Insufficient wallet balance. Required: ₦${totalCost}, Available: ₦${balance}`,
      );
    }

    // Create batch reference
    const batchReference = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Debit wallet first (before any distribution)
    await this.walletService.debitWallet(
      userId,
      totalCost,
      `distribution-${batchReference}`,
      `Bulk ${dto.valueType.toLowerCase()} distribution to ${validPhones.length} recipients`,
    );

    // Create distribution batch and recipients in transaction
    const batch = await this.prisma.$transaction(async (tx) => {
      const newBatch = await tx.distributionBatch.create({
        data: {
          userId,
          network: dto.network as any,
          valueType: dto.valueType as any,
          amount: dto.valueType === ValueType.AIRTIME ? dto.amount : null,
          dataPlanId: dto.dataPlanId,
          dataPlanName,
          totalCost,
          recipientCount: validPhones.length,
          status: 'PENDING',
        },
      });

      // Create recipient transactions
      await tx.recipientTransaction.createMany({
        data: validPhones.map((phone) => ({
          batchId: newBatch.id,
          phoneNumber: phone,
          amount: pricePerRecipient,
          status: 'PENDING',
        })),
      });

      return newBatch;
    });

    // Add batch to processing queue
    await this.distributionQueue.add(
      'process-batch',
      {
        batchId: batch.id,
        network: dto.network,
        valueType: dto.valueType,
        amount: dto.amount,
        dataPlanCode,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return {
      batchId: batch.id,
      network: dto.network,
      valueType: dto.valueType,
      totalRecipients: validPhones.length,
      invalidPhoneNumbers: invalidPhones,
      totalCost,
      status: 'QUEUED',
    };
  }

  async getBatch(batchId: string, userId: string) {
    const batch = await this.prisma.distributionBatch.findFirst({
      where: { id: batchId, userId },
      include: {
        recipients: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async getBatches(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      this.prisma.distributionBatch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      }),
      this.prisma.distributionBatch.count({ where: { userId } }),
    ]);

    return {
      batches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDataPlans(network: string) {
    return this.airtimeProvider.getDataPlans(network);
  }
}
