import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, Gender } from '@prisma/client';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get('users')
  getUserStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('gender') gender?: Gender,
    @Query('country') country?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
  ) {
    return this.service.getUserStats({
      from, to, gender, country,
      ageMin: ageMin ? +ageMin : undefined,
      ageMax: ageMax ? +ageMax : undefined,
    });
  }

  @Get('timeseries')
  getTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.service.getTimeSeries({ from, to }, groupBy || 'day');
  }

  @Get('stores/timeseries')
  getStoreTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getStoreTimeSeries({ from, to });
  }

  @Get('users/table')
  getUsersTable(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('gender') gender?: Gender,
    @Query('country') country?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
  ) {
    return this.service.getUsersTable({
      from, to, gender, country,
      ageMin: ageMin ? +ageMin : undefined,
      ageMax: ageMax ? +ageMax : undefined,
    });
  }

  @Get('export/csv')
  async exportCsv(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('gender') gender?: Gender,
    @Query('country') country?: string,
    @Res() res?: any,
  ) {
    const csv = await this.service.exportCsv({ from, to, gender, country });
    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`);
    res!.send('﻿' + csv); // BOM for Excel UTF-8
  }
}
