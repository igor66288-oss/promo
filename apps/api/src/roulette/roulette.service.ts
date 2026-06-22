import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RouletteSector {
  label: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'GIFT' | 'NO_PRIZE';
  discountValue: number;
  probability: number; // 0-100, сумма всех = 100
  color: string;
}

@Injectable()
export class RouletteService {
  constructor(private prisma: PrismaService) {}

  // Мерчант настраивает рулетку для кампании
  async upsertConfig(campaignId: string, merchantUserId: string, sectors: RouletteSector[], maxSpinsPerUser: number, periodHours: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.store.userId !== merchantUserId) throw new ForbiddenException('Not your campaign');

    // Проверяем что сумма вероятностей = 100
    const total = sectors.reduce((sum, s) => sum + s.probability, 0);
    if (Math.abs(total - 100) > 0.01) throw new BadRequestException('Sector probabilities must sum to 100');

    return this.prisma.rouletteConfig.upsert({
      where: { campaignId },
      create: { campaignId, sectors: sectors as any, maxSpinsPerUser, spinsPerPeriod: maxSpinsPerUser, periodHours },
      update: { sectors: sectors as any, maxSpinsPerUser, spinsPerPeriod: maxSpinsPerUser, periodHours },
    });
  }

  // Получить конфиг рулетки для кампании
  async getConfig(campaignId: string) {
    const config = await this.prisma.rouletteConfig.findUnique({ where: { campaignId } });
    if (!config) throw new NotFoundException('Roulette not configured for this campaign');
    return config;
  }

  // Пользователь крутит рулетку
  async spin(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true, roulette: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');
    if (!campaign.roulette) throw new BadRequestException('Roulette not configured');

    const config = campaign.roulette;
    const now = new Date();
    if (now < campaign.startsAt || now > campaign.endsAt)
      throw new BadRequestException('Campaign is not running');

    // Проверяем лимит спинов
    const periodStart = new Date(now.getTime() - config.periodHours * 60 * 60 * 1000);
    const recentSpins = await this.prisma.event.count({
      where: {
        type: 'ROULETTE_SPIN',
        userId,
        campaignId,
        createdAt: { gte: periodStart },
      },
    });
    if (recentSpins >= config.maxSpinsPerUser)
      throw new BadRequestException(`Spin limit reached. Try again in ${config.periodHours} hours`);

    // Выбираем выигрышный сектор по вероятности
    const sectors = config.sectors as unknown as RouletteSector[];
    const rand = Math.random() * 100;
    let cumulative = 0;
    let winner: RouletteSector = sectors[sectors.length - 1];
    for (const sector of sectors) {
      cumulative += sector.probability;
      if (rand <= cumulative) {
        winner = sector;
        break;
      }
    }

    // Записываем событие спина
    await this.prisma.event.create({
      data: {
        type: 'ROULETTE_SPIN',
        storeId: campaign.storeId,
        campaignId,
        userId,
        metadata: { sector: winner.label, discountType: winner.discountType, discountValue: winner.discountValue },
      },
    });

    let promoCode = null;

    // Если не "no prize" — выдаём промокод
    if (winner.discountType !== 'NO_PRIZE') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const randomPart = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const prefix = (campaign.store.name.slice(0, 4).toUpperCase().replace(/\s/g, '') + 'R');
      let code: string;
      let attempts = 0;
      do {
        code = `${prefix}-${randomPart()}-${randomPart()}`;
        attempts++;
      } while (attempts < 10 && await this.prisma.promoCode.findUnique({ where: { code } }));

      promoCode = await this.prisma.promoCode.create({
        data: {
          code,
          campaignId,
          userId,
          status: 'ISSUED',
          expiresAt: campaign.endsAt,
        },
      });
    }

    return {
      winner,
      sectorIndex: sectors.indexOf(winner),
      promoCode: promoCode ? { code: promoCode.code, expiresAt: promoCode.expiresAt } : null,
      spinsLeft: config.maxSpinsPerUser - recentSpins - 1,
    };
  }

  // Проверить оставшиеся спины
  async getSpinsLeft(campaignId: string, userId: string) {
    const config = await this.prisma.rouletteConfig.findUnique({ where: { campaignId } });
    if (!config) return { spinsLeft: 0, configured: false };
    const now = new Date();
    const periodStart = new Date(now.getTime() - config.periodHours * 60 * 60 * 1000);
    const used = await this.prisma.event.count({
      where: { type: 'ROULETTE_SPIN', userId, campaignId, createdAt: { gte: periodStart } },
    });
    return { spinsLeft: Math.max(0, config.maxSpinsPerUser - used), configured: true, config };
  }
}
