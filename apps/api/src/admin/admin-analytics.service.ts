import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Gender } from '@prisma/client';

export interface AnalyticsFilter {
  from?: string;
  to?: string;
  gender?: Gender;
  country?: string;
  ageMin?: number;
  ageMax?: number;
  category?: string;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(filter: AnalyticsFilter) {
    const to = filter.to ? new Date(filter.to) : new Date();
    const from = filter.from ? new Date(filter.from) : new Date(Date.now() - 30 * 86400_000);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async getUserStats(filter: AnalyticsFilter) {
    const { from, to } = this.dateRange(filter);

    const userWhere: any = { role: 'CUSTOMER', createdAt: { gte: from, lte: to } };
    if (filter.gender) userWhere.gender = filter.gender;
    if (filter.country) userWhere.country = filter.country;
    if (filter.ageMin || filter.ageMax) {
      const now = new Date();
      if (filter.ageMax) {
        userWhere.birthDate = { ...(userWhere.birthDate || {}), gte: new Date(now.getFullYear() - filter.ageMax - 1, now.getMonth(), now.getDate()) };
      }
      if (filter.ageMin) {
        userWhere.birthDate = { ...(userWhere.birthDate || {}), lte: new Date(now.getFullYear() - filter.ageMin, now.getMonth(), now.getDate()) };
      }
    }

    const [totalUsers, newUsers, usersWithCodes] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', promoCodes: { some: {} } } }),
    ]);

    const codeStats = await this.prisma.promoCode.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        ...(filter.gender || filter.country ? { user: { gender: filter.gender, country: filter.country } } : {}),
      },
      _count: true,
    });

    const redeemedCodes = await this.prisma.promoCode.count({
      where: {
        status: { in: ['REDEEMED', 'CONVERTED'] },
        usedAt: { gte: from, lte: to },
      },
    });

    const convertedCodes = await this.prisma.promoCode.count({
      where: { status: 'CONVERTED', usedAt: { gte: from, lte: to } },
    });

    const topCountries = await this.prisma.user.groupBy({
      by: ['country'],
      where: { role: 'CUSTOMER', country: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const genderBreakdown = await this.prisma.user.groupBy({
      by: ['gender'],
      where: { role: 'CUSTOMER', gender: { not: null } },
      _count: { id: true },
    });

    return {
      totalUsers,
      newUsers,
      usersWithCodes,
      codesIssued: codeStats._count,
      codesRedeemed: redeemedCodes,
      codesConverted: convertedCodes,
      avgCodesPerUser: totalUsers > 0 ? (codeStats._count / totalUsers).toFixed(2) : '0',
      topCountries: topCountries.map(c => ({ country: c.country, count: c._count.id })),
      genderBreakdown: genderBreakdown.map(g => ({ gender: g.gender, count: g._count.id })),
    };
  }

  async getTimeSeries(filter: AnalyticsFilter, groupBy: 'day' | 'week' | 'month' = 'day') {
    const { from, to } = this.dateRange(filter);
    const days = Math.ceil((to.getTime() - from.getTime()) / 86400_000);

    const points: { date: string; newUsers: number; codesIssued: number; codesRedeemed: number }[] = [];

    // Build daily buckets
    const step = groupBy === 'month' ? 30 : groupBy === 'week' ? 7 : 1;
    let cursor = new Date(from);

    while (cursor <= to) {
      const bucketEnd = new Date(Math.min(cursor.getTime() + step * 86400_000 - 1, to.getTime()));

      const [newUsers, codesIssued, codesRedeemed] = await Promise.all([
        this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: cursor, lte: bucketEnd } } }),
        this.prisma.promoCode.count({ where: { createdAt: { gte: cursor, lte: bucketEnd } } }),
        this.prisma.promoCode.count({ where: { status: { in: ['REDEEMED', 'CONVERTED'] }, usedAt: { gte: cursor, lte: bucketEnd } } }),
      ]);

      points.push({
        date: cursor.toISOString().slice(0, 10),
        newUsers,
        codesIssued,
        codesRedeemed,
      });

      cursor = new Date(cursor.getTime() + step * 86400_000);
    }

    return points;
  }

  async getStoreTimeSeries(filter: AnalyticsFilter) {
    const { from, to } = this.dateRange(filter);
    const days = Math.ceil((to.getTime() - from.getTime()) / 86400_000);
    const step = days > 90 ? 30 : days > 30 ? 7 : 1;

    const stores = await this.prisma.store.findMany({
      select: { id: true, name: true },
      take: 5,
    });

    const series: any[] = [];
    let cursor = new Date(from);

    while (cursor <= to) {
      const bucketEnd = new Date(Math.min(cursor.getTime() + step * 86400_000 - 1, to.getTime()));
      const point: any = { date: cursor.toISOString().slice(0, 10) };

      for (const store of stores) {
        point[store.name] = await this.prisma.event.count({
          where: { storeId: store.id, type: 'CONVERSION', createdAt: { gte: cursor, lte: bucketEnd } },
        });
      }

      series.push(point);
      cursor = new Date(cursor.getTime() + step * 86400_000);
    }

    return { series, stores: stores.map(s => s.name) };
  }

  async getUsersTable(filter: AnalyticsFilter) {
    const { from, to } = this.dateRange(filter);

    const where: any = { role: 'CUSTOMER' };
    if (filter.gender) where.gender = filter.gender;
    if (filter.country) where.country = filter.country;
    if (filter.from || filter.to) where.createdAt = { gte: from, lte: to };

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        firstName: true,
        lastName: true,
        middleName: true,
        gender: true,
        birthDate: true,
        country: true,
        createdAt: true,
        promoCodes: {
          select: { id: true, status: true, usedAt: true, campaign: { select: { discountType: true, discountValue: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return users.map(u => {
      const redeemed = u.promoCodes.filter(c => ['REDEEMED', 'CONVERTED'].includes(c.status));
      const avgDiscount = redeemed.length > 0
        ? (redeemed.reduce((sum, c) => sum + (c.campaign?.discountType === 'FIXED' ? c.campaign.discountValue : 0), 0) / redeemed.length).toFixed(0)
        : 0;

      const age = u.birthDate
        ? Math.floor((Date.now() - new Date(u.birthDate).getTime()) / (365.25 * 86400_000))
        : null;

      return {
        id: u.id,
        email: u.email,
        phone: u.phone,
        fullName: [u.lastName, u.firstName, u.middleName].filter(Boolean).join(' ') || u.name || '—',
        gender: u.gender,
        age,
        country: u.country,
        registeredAt: u.createdAt,
        totalCodes: u.promoCodes.length,
        redeemedCodes: redeemed.length,
        avgCheck: avgDiscount,
      };
    });
  }

  async exportCsv(filter: AnalyticsFilter): Promise<string> {
    const users = await this.getUsersTable(filter);
    const headers = ['ID', 'Email', 'Phone', 'Full Name', 'Gender', 'Age', 'Country', 'Registered', 'Total Codes', 'Redeemed', 'Avg Discount (฿)'];
    const rows = users.map(u => [
      u.id,
      u.email || '',
      u.phone || '',
      u.fullName,
      u.gender || '',
      u.age || '',
      u.country || '',
      new Date(u.registeredAt).toLocaleDateString('en-GB'),
      u.totalCodes,
      u.redeemedCodes,
      u.avgCheck,
    ]);

    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    return csv;
  }
}
