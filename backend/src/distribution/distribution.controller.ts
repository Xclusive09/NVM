import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DistributionService } from './distribution.service';
import { CreateDistributionDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@Controller('distribution')
@UseGuards(JwtAuthGuard)
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @Post()
  async createDistribution(
    @CurrentUser() user: any,
    @Body() dto: CreateDistributionDto,
  ) {
    return this.distributionService.createDistribution(user.id, dto);
  }

  @Get('batches')
  async getBatches(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.distributionService.getBatches(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('batches/:id')
  async getBatch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.distributionService.getBatch(id, user.id);
  }

  @Get('data-plans/:network')
  async getDataPlans(@Param('network') network: string) {
    return this.distributionService.getDataPlans(network);
  }
}
