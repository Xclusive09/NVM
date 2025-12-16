import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getBalance(userId: string): Promise<Decimal> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.balance;
  }

  async creditWallet(
    userId: string,
    amount: number,
    reference: string,
    description?: string,
  ) {
    // Use transaction to ensure atomic operation
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate reference (idempotency)
      const existingTx = await tx.walletTransaction.findUnique({
        where: { reference },
      });

      if (existingTx) {
        // Return existing transaction if already processed
        if (existingTx.status === 'COMPLETED') {
          return existingTx;
        }
        throw new BadRequestException('Transaction reference already exists');
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(wallet.balance).add(amount);

      // Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description: description || 'Wallet credit',
          reference,
        },
      });

      return transaction;
    });
  }

  async debitWallet(
    userId: string,
    amount: number,
    reference: string,
    description?: string,
  ) {
    // Use transaction to ensure atomic operation
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate reference (idempotency)
      const existingTx = await tx.walletTransaction.findUnique({
        where: { reference },
      });

      if (existingTx) {
        // Return existing transaction if already processed
        if (existingTx.status === 'COMPLETED') {
          return existingTx;
        }
        throw new BadRequestException('Transaction reference already exists');
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Check sufficient balance
      if (new Decimal(wallet.balance).lessThan(amount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(wallet.balance).minus(amount);

      // Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          description: description || 'Wallet debit',
          reference,
        },
      });

      return transaction;
    });
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
