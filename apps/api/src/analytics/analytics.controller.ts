import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // Аналитика своего магазина
  @Get('store')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getStoreAnalytics(@Request() req: any, @Query('days') days?: string) {
    return this.analyticsService.getStoreAnalytics(req.user.id, days ? Number(days) : 30);
  }

  // Аналитика кампании
  @Get('campaigns/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getCampaignAnalytics(@Param('id') id: string, @Request() req: any) {
    return this.analyticsService.getCampaignAnalytics(id, req.user.id);
  }

  // Платформенная аналитика
  @Get('platform')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getPlatformAnalytics(@Query('days') days?: string) {
    return this.analyticsService.getPlatformAnalytics(days ? Number(days) : 30);
  }
}
