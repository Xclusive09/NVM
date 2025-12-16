import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { DistributionProcessor } from './distribution.processor';
import { AirtimeProviderService } from './airtime-provider.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    WalletModule,
    BullModule.registerQueue({
      name: 'distribution',
    }),
  ],
  controllers: [DistributionController],
  providers: [DistributionService, DistributionProcessor, AirtimeProviderService],
  exports: [DistributionService],
})
export class DistributionModule {}
