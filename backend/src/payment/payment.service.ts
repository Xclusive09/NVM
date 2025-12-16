import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    channel: string;
    currency: string;
    customer: {
      email: string;
    };
    paid_at: string;
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  private getPaystackHeaders() {
    return {
      Authorization: `Bearer ${this.configService.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(
    userId: string,
    email: string,
    amount: number,
    callbackUrl?: string,
  ) {
    // Generate unique reference
    const reference = `NVM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Create payment transaction record
      await this.prisma.paymentTransaction.create({
        data: {
          userId,
          amount,
          reference,
          provider: 'PAYSTACK',
          status: 'PENDING',
        },
      });

      // Initialize Paystack transaction
      const response = await axios.post<PaystackInitResponse>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Paystack expects amount in kobo
          reference,
          callback_url: callbackUrl,
        },
        { headers: this.getPaystackHeaders() },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to initialize payment');
      }

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      this.logger.error('Payment initialization failed', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await axios.get<PaystackVerifyResponse>(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        { headers: this.getPaystackHeaders() },
      );

      const data = response.data.data;

      // Get payment transaction
      const paymentTx = await this.prisma.paymentTransaction.findUnique({
        where: { reference },
      });

      if (!paymentTx) {
        throw new BadRequestException('Payment transaction not found');
      }

      // Check if already processed (idempotency)
      if (paymentTx.status === 'SUCCESS') {
        return { status: 'success', message: 'Payment already processed' };
      }

      if (data.status === 'success') {
        // Update payment transaction
        await this.prisma.paymentTransaction.update({
          where: { reference },
          data: {
            status: 'SUCCESS',
            providerRef: data.id.toString(),
            metadata: data as any,
          },
        });

        // Credit wallet
        const amountInNaira = data.amount / 100;
        await this.walletService.creditWallet(
          paymentTx.userId,
          amountInNaira,
          `wallet-credit-${reference}`,
          `Wallet funding via Paystack - ${reference}`,
        );

        return { status: 'success', message: 'Payment successful' };
      } else {
        await this.prisma.paymentTransaction.update({
          where: { reference },
          data: { status: 'FAILED' },
        });

        return { status: 'failed', message: 'Payment failed' };
      }
    } catch (error) {
      this.logger.error('Payment verification failed', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', this.configService.get('PAYSTACK_SECRET_KEY') || '')
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      const reference = data.reference;

      // Check if already processed (idempotency)
      const paymentTx = await this.prisma.paymentTransaction.findUnique({
        where: { reference },
      });

      if (!paymentTx) {
        this.logger.warn(`Payment transaction not found for reference: ${reference}`);
        return { received: true };
      }

      if (paymentTx.status === 'SUCCESS') {
        this.logger.log(`Payment already processed: ${reference}`);
        return { received: true };
      }

      // Update payment transaction
      await this.prisma.paymentTransaction.update({
        where: { reference },
        data: {
          status: 'SUCCESS',
          providerRef: data.id.toString(),
          metadata: data,
        },
      });

      // Credit wallet
      const amountInNaira = data.amount / 100;
      await this.walletService.creditWallet(
        paymentTx.userId,
        amountInNaira,
        `wallet-credit-${reference}`,
        `Wallet funding via Paystack webhook - ${reference}`,
      );
    }

    return { received: true };
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({
        where: { userId },
      }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
