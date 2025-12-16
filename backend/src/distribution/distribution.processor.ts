import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AirtimeProviderService } from './airtime-provider.service';

interface BatchJobData {
  batchId: string;
  network: string;
  valueType: 'AIRTIME' | 'DATA';
  amount?: number;
  dataPlanCode?: string;
}

@Processor('distribution')
export class DistributionProcessor extends WorkerHost {
  private readonly logger = new Logger(DistributionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly airtimeProvider: AirtimeProviderService,
  ) {
    super();
  }

  async process(job: Job<BatchJobData>): Promise<void> {
    const { batchId, network, valueType, amount, dataPlanCode } = job.data;
    this.logger.log(`Processing batch ${batchId}`);

    // Update batch status to processing
    await this.prisma.distributionBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    });

    // Get all pending recipients
    const recipients = await this.prisma.recipientTransaction.findMany({
      where: { batchId, status: 'PENDING' },
    });

    let successCount = 0;
    let failedCount = 0;

    // Process each recipient
    for (const recipient of recipients) {
      try {
        // Update recipient status to processing
        await this.prisma.recipientTransaction.update({
          where: { id: recipient.id },
          data: { status: 'PROCESSING' },
        });

        let result;

        if (valueType === 'AIRTIME') {
          result = await this.airtimeProvider.sendAirtime(
            recipient.phoneNumber,
            amount!,
            network,
          );
        } else {
          result = await this.airtimeProvider.sendData(
            recipient.phoneNumber,
            dataPlanCode!,
            network,
          );
        }

        if (result.success) {
          await this.prisma.recipientTransaction.update({
            where: { id: recipient.id },
            data: {
              status: 'SUCCESS',
              providerRef: result.reference,
              processedAt: new Date(),
            },
          });
          successCount++;
        } else {
          await this.prisma.recipientTransaction.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              errorMessage: result.errorMessage,
              processedAt: new Date(),
            },
          });
          failedCount++;
        }

        // Add small delay between API calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to process recipient ${recipient.id}`, error);
        await this.prisma.recipientTransaction.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            processedAt: new Date(),
          },
        });
        failedCount++;
      }
    }

    // Update batch status
    const finalStatus =
      failedCount === 0
        ? 'COMPLETED'
        : successCount === 0
        ? 'FAILED'
        : 'PARTIAL';

    await this.prisma.distributionBatch.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        successCount,
        failedCount,
      },
    });

    this.logger.log(
      `Batch ${batchId} completed. Success: ${successCount}, Failed: ${failedCount}`,
    );
  }
}
