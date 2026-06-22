import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Аналитика магазина (для мерчанта)
  async getStoreAnalytics(merchantUserId: string, days = 30) {
    const store = await this.prisma.store.findUnique({ where: { userId: merchantUserId } });
    if (!store) throw new NotFoundException('Store not found');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Агрегаты по типам событий
    const [impressions, clicks, redemptions, conversions, rouletteSpins] = await Promise.all([
      this.prisma.event.count({ where: { storeId: store.id, type: 'IMPRESSION', createdAt: { gte: since } } }),
      this.prisma.event.count({ where: { storeId: store.id, type: 'CLICK', createdAt: { gte: since } } }),
      this.prisma.event.count({ where: { storeId: store.id, type: 'REDEMPTION', createdAt: { gte: since } } }),
      this.prisma.event.count({ where: { storeId: store.id, type: 'CONVERSION', createdAt: { gte: since } } }),
      this.prisma.event.count({ where: { storeId: store.id, type: 'ROULETTE_SPIN', createdAt: { gte: since } } }),
    ]);

    // События по дням (для графика)
    const dailyEvents = await this.prisma.event.groupBy({
      by: ['type'],
      where: { storeId: store.id, createdAt: { gte: since } },
      _count: true,
    });

    // По дням для line chart
    const eventsByDay = await this.prisma.$queryRaw<Array<{ date: string; type: string; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        type,
        COUNT(*) as count
      FROM "Event"
      WHERE "storeId" = ${store.id}
        AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt"), type
      ORDER BY date ASC
    `;

    // Лучшие кампании
    const topCampaigns = await this.prisma.event.groupBy({
      by: ['campaignId'],
      where: { storeId: store.id, createdAt: { gte: since }, campaignId: { not: null } },
      _count: true,
      orderBy: { _count: { campaignId: 'desc' } },
      take: 5,
    });

    const topCampaignDetails = await Promise.all(
      topCampaigns.map(async (tc) => {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: tc.campaignId! },
          select: { id: true, title: true, discountType: true, discountValue: true, status: true },
        });
        const [camp_clicks, camp_redemptions, camp_conversions] = await Promise.all([
          this.prisma.event.count({ where: { campaignId: tc.campaignId!, type: 'CLICK' } }),
          this.prisma.event.count({ where: { campaignId: tc.campaignId!, type: 'REDEMPTION' } }),
          this.prisma.event.count({ where: { campaignId: tc.campaignId!, type: 'CONVERSION' } }),
        ]);
        return {
          campaign,
          clicks: camp_clicks,
          redemptions: camp_redemptions,
          conversions: camp_conversions,
          conversionRate: camp_clicks > 0 ? ((camp_conversions / camp_clicks) * 100).toFixed(1) : '0',
        };
      })
    );

    // Всего промокодов
    const totalCodes = await this.prisma.promoCode.count({ where: { campaign: { storeId: store.id } } });
    const redeemedCodes = await this.prisma.promoCode.count({ where: { campaign: { storeId: store.id }, status: { in: ['REDEEMED', 'CONVERTED'] } } });

    return {
      period: { days, since },
      funnel: { impressions, clicks, redemptions, conversions, rouletteSpins },
      rates: {
        clickThrough: impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0',
        redemption: clicks > 0 ? ((redemptions / clicks) * 100).toFixed(1) : '0',
        conversion: redemptions > 0 ? ((conversions / redemptions) * 100).toFixed(1) : '0',
      },
      codes: { total: totalCodes, redeemed: redeemedCodes },
      topCampaigns: topCampaignDetails,
      eventsByDay: eventsByDay.map(e => ({ date: e.date, type: e.type, count: Number(e.count) })),
      store: { id: store.id, name: store.name, balance: store.balance },
    };
  }

  // Аналитика конкретной кампании
  async getCampaignAnalytics(campaignId: string, merchantUserId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.store.userId !== merchantUserId) throw new ForbiddenException('Not your campaign');

    const [impressions, clicks, redemptions, conversions, spins] = await Promise.all([
      this.prisma.event.count({ where: { campaignId, type: 'IMPRESSION' } }),
      this.prisma.event.count({ where: { campaignId, type: 'CLICK' } }),
      this.prisma.event.count({ where: { campaignId, type: 'REDEMPTION' } }),
      this.prisma.event.count({ where: { campaignId, type: 'CONVERSION' } }),
      this.prisma.event.count({ where: { campaignId, type: 'ROULETTE_SPIN' } }),
    ]);

    const codeStats = await this.prisma.promoCode.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    return {
      campaign: { id: campaign.id, title: campaign.title, status: campaign.status, discountType: campaign.discountType, discountValue: campaign.discountValue },
      funnel: { impressions, clicks, redemptions, conversions, spins },
      rates: {
        clickThrough: impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0',
        redemption: clicks > 0 ? ((redemptions / clicks) * 100).toFixed(1) : '0',
        conversion: redemptions > 0 ? ((conversions / redemptions) * 100).toFixed(1) : '0',
      },
      codeStats: codeStats.map(s => ({ status: s.status, count: s._count })),
    };
  }

  // Аналитика платформы (только admin)
  async getPlatformAnalytics(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalStores, activeStores, totalCampaigns, activeCampaigns, totalEvents, totalCodes] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.event.count({ where: { createdAt: { gte: since } } }),
      this.prisma.promoCode.count(),
    ]);

    const eventsByType = await this.prisma.event.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    const topStores = await this.prisma.event.groupBy({
      by: ['storeId'],
      where: { createdAt: { gte: since }, storeId: { not: null } },
      _count: true,
      orderBy: { _count: { storeId: 'desc' } },
      take: 10,
    });

    const topStoreDetails = await Promise.all(
      topStores.map(async (ts) => {
        const store = await this.prisma.store.findUnique({
          where: { id: ts.storeId! },
          select: { id: true, name: true, balance: true, status: true },
        });
        return { store, events: ts._count };
      })
    );

    // Выручка платформы (сумма балансов всех магазинов, упрощённо)
    const balanceAgg = await this.prisma.store.aggregate({ _sum: { balance: true } });

    return {
      period: { days, since },
      overview: { totalStores, activeStores, totalCampaigns, activeCampaigns, totalEvents, totalCodes },
      eventsByType: eventsByType.map(e => ({ type: e.type, count: e._count })),
      topStores: topStoreDetails,
      totalBalance: balanceAgg._sum.balance || 0,
    };
  }
}
