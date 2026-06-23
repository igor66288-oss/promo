import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found for this user');

    return this.prisma.campaign.create({
      data: {
        storeId: store.id,
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        conditions: dto.conditions,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        totalLimit: dto.totalLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        status: dto.status ?? 'DRAFT',
        promoted: dto.promoted ?? false,
        category: dto.category ?? 'OTHER',
      },
      include: { store: { select: { id: true, name: true } } },
    });
  }

  async findAll(category?: string) {
    await this.deactivateExpiredPromotions();
    const where: any = { status: 'ACTIVE' };
    if (category && category !== 'ALL') where.category = category;
    return this.prisma.campaign.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, logo: true } },
        _count: { select: { promoCodes: true } },
      },
      orderBy: [
        { promoted: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, logo: true, website: true } },
        roulette: true,
        _count: { select: { promoCodes: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async findNearby(lat: number, lng: number, radiusKm = 10, category?: string) {
    await this.deactivateExpiredPromotions();
    const where: any = { status: 'ACTIVE', store: { lat: { not: null as any }, lng: { not: null as any } } };
    if (category && category !== 'ALL') where.category = category;

    const campaigns = await (this.prisma.campaign.findMany as any)({
      where,
      include: {
        store: { select: { id: true, name: true, logo: true, lat: true, lng: true, address: true, city: true } },
        _count: { select: { promoCodes: true } },
      },
      orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],
    }) as any[];

    // Haversine filter
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    return (campaigns as any[])
      .map(c => {
        const sLat = c.store.lat as number;
        const sLng = c.store.lng as number;
        const dLat = toRad(sLat - lat);
        const dLng = toRad(sLng - lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(sLat)) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...c, distanceKm: Math.round(dist * 10) / 10 };
      })
      .filter((c: any) => c.distanceKm <= radiusKm)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
  }

  async findByStore(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.campaign.findMany({
      where: { storeId },
      include: {
        _count: { select: { promoCodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.store.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async promoteCampaign(campaignId: string, merchantUserId: string, days: number) {
    // Тарифы продвижения (в сатангах)
    const PROMO_PRICES: Record<number, number> = { 1: 9900, 3: 24900, 7: 49900, 14: 89900, 30: 149900 };
    const price = PROMO_PRICES[days];
    if (!price) throw new BadRequestException('Invalid promotion duration. Choose: 1, 3, 7, 14, or 30 days');

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.store.userId !== merchantUserId) throw new ForbiddenException('Not your campaign');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Only active campaigns can be promoted');

    // Списываем с баланса магазина
    const store = campaign.store;
    if (store.balance < price) throw new BadRequestException(`Insufficient balance. Need ฿${price / 100}, have ฿${store.balance / 100}`);

    const promotedUntil = new Date();
    promotedUntil.setDate(promotedUntil.getDate() + days);

    // Транзакция: списать баланс + обновить кампанию + создать инвойс
    const [updatedCampaign] = await this.prisma.$transaction([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { promoted: true, promotedUntil },
      }),
      this.prisma.store.update({
        where: { id: store.id },
        data: { balance: { decrement: price } },
      }),
      this.prisma.invoice.create({
        data: {
          storeId: store.id,
          amount: price,
          status: 'PAID',
          paidAt: new Date(),
          items: [{ description: `Campaign promotion — "${campaign.title}" for ${days} day(s)`, amount: price, campaignId }] as any,
        },
      }),
    ]);

    return {
      campaign: updatedCampaign,
      charged: price,
      promotedUntil,
      newBalance: store.balance - price,
      message: `Campaign promoted for ${days} days until ${promotedUntil.toLocaleDateString()}`,
    };
  }

  async deactivateExpiredPromotions() {
    await this.prisma.campaign.updateMany({
      where: { promoted: true, promotedUntil: { lt: new Date() } },
      data: { promoted: false },
    });
  }
}
