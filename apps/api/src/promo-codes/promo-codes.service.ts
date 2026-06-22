import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromoStatus } from '@prisma/client';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  private generateUniqueCode(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = () =>
      Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    return `${prefix}-${randomPart()}-${randomPart()}`;
  }

  async claimCode(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true, _count: { select: { promoCodes: true } } },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE')
      throw new BadRequestException('Campaign is not active');

    const now = new Date();
    if (now < campaign.startsAt || now > campaign.endsAt)
      throw new BadRequestException('Campaign is not running');

    if (
      campaign.totalLimit &&
      campaign._count.promoCodes >= campaign.totalLimit
    )
      throw new BadRequestException('Campaign limit reached');

    const userCodes = await this.prisma.promoCode.count({
      where: { campaignId, userId },
    });
    if (userCodes >= campaign.perUserLimit)
      throw new BadRequestException(
        'You already have a code for this campaign',
      );

    let code: string;
    let attempts = 0;
    const prefix = campaign.store.name
      .slice(0, 5)
      .toUpperCase()
      .replace(/\s/g, '');
    do {
      code = this.generateUniqueCode(prefix);
      attempts++;
      if (attempts > 10)
        throw new BadRequestException('Failed to generate unique code');
    } while (await this.prisma.promoCode.findUnique({ where: { code } }));

    const expiresAt = new Date(campaign.endsAt);

    const promoCode = await this.prisma.promoCode.create({
      data: {
        code,
        campaignId,
        userId,
        status: PromoStatus.ISSUED,
        expiresAt,
      },
      include: { campaign: { include: { store: true } } },
    });

    await this.prisma.event.create({
      data: {
        type: 'CLICK',
        storeId: campaign.storeId,
        campaignId,
        userId,
        promoCodeId: promoCode.id,
      },
    });

    return promoCode;
  }

  async validateCode(code: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { campaign: { include: { store: true } }, user: true },
    });

    if (!promoCode) throw new NotFoundException('Promo code not found');

    const now = new Date();
    const isExpired = !!(promoCode.expiresAt && now > promoCode.expiresAt);
    const isUsed =
      promoCode.status === PromoStatus.REDEEMED ||
      promoCode.status === PromoStatus.CONVERTED;

    return {
      valid: !isExpired && !isUsed,
      code: promoCode.code,
      status: promoCode.status,
      campaign: {
        title: promoCode.campaign.title,
        discountType: promoCode.campaign.discountType,
        discountValue: promoCode.campaign.discountValue,
        store: promoCode.campaign.store.name,
      },
      expiresAt: promoCode.expiresAt,
      isExpired,
      isUsed,
    };
  }

  async redeemCode(code: string, merchantUserId: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { campaign: { include: { store: true } } },
    });

    if (!promoCode) throw new NotFoundException('Promo code not found');
    if (promoCode.campaign.store.userId !== merchantUserId)
      throw new ForbiddenException('Not your store');
    if (
      promoCode.status === PromoStatus.REDEEMED ||
      promoCode.status === PromoStatus.CONVERTED
    )
      throw new BadRequestException('Code already used');

    const now = new Date();
    if (promoCode.expiresAt && now > promoCode.expiresAt)
      throw new BadRequestException('Code has expired');

    const updated = await this.prisma.promoCode.update({
      where: { code },
      data: { status: PromoStatus.REDEEMED, usedAt: now },
    });

    await this.prisma.event.create({
      data: {
        type: 'REDEMPTION',
        storeId: promoCode.campaign.storeId,
        campaignId: promoCode.campaignId,
        userId: promoCode.userId,
        promoCodeId: promoCode.id,
      },
    });

    return updated;
  }

  async getMyCodes(userId: string) {
    return this.prisma.promoCode.findMany({
      where: { userId },
      include: {
        campaign: {
          include: { store: { select: { id: true, name: true, logo: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignCodes(campaignId: string, merchantUserId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.store.userId !== merchantUserId)
      throw new ForbiddenException('Not your campaign');

    return this.prisma.promoCode.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
