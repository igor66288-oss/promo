import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function genCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${seg()}-${seg()}`;
}

@Injectable()
export class PartnerService {
  constructor(private prisma: PrismaService) {}

  async spin(secretKey: string, customerRef: string, transactionId: string) {
    const partner = await this.prisma.partnerConfig.findUnique({ where: { secretKey } });
    if (!partner || !partner.active) throw new UnauthorizedException('Invalid partner key');

    // Idempotency: same transactionId → return existing spin
    const existing = await this.prisma.partnerSpin.findUnique({
      where: { transactionId },
      include: { campaign: { include: { store: true } }, promoCode: true },
    });
    if (existing) return this.formatSpin(existing);

    // Get all active campaigns opted into partner roulette
    const campaigns = await this.prisma.campaign.findMany({
      where: { inPartnerRoulette: true, status: 'ACTIVE' },
      include: { store: true },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (!campaigns.length) {
      const spin = await this.prisma.partnerSpin.create({
        data: {
          partnerId: partner.id,
          customerRef,
          transactionId,
          sectors: [],
          winnerIndex: 0,
          status: 'NO_CAMPAIGNS',
          expiresAt,
        },
        include: { campaign: { include: { store: true } }, promoCode: true },
      });
      return this.formatSpin(spin);
    }

    // Pick random winner
    const winnerIndex = Math.floor(Math.random() * campaigns.length);
    const winner = campaigns[winnerIndex];

    // Generate promo code for winner campaign
    const prefix = winner.store.name.slice(0, 4).toUpperCase().replace(/\s/g, '');
    const code = genCode(prefix);
    const promoCode = await this.prisma.promoCode.create({
      data: {
        code,
        campaignId: winner.id,
        status: 'ISSUED',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const sectors = campaigns.map((c) => ({
      campaignId: c.id,
      title: c.title,
      storeName: c.store.name,
      logo: c.store.logo,
      discountType: c.discountType,
      discountValue: c.discountValue,
    }));

    const spin = await this.prisma.partnerSpin.create({
      data: {
        partnerId: partner.id,
        customerRef,
        transactionId,
        campaignId: winner.id,
        promoCodeId: promoCode.id,
        sectors,
        winnerIndex,
        status: 'COMPLETED',
        expiresAt,
      },
      include: { campaign: { include: { store: true } }, promoCode: true },
    });

    return this.formatSpin(spin);
  }

  async getSpinResult(spinId: string) {
    const spin = await this.prisma.partnerSpin.findUnique({
      where: { id: spinId },
      include: { campaign: { include: { store: true } }, promoCode: true },
    });
    if (!spin) throw new BadRequestException('Spin not found');
    return this.formatSpin(spin);
  }

  async getActiveCampaigns() {
    return this.prisma.campaign.findMany({
      where: { inPartnerRoulette: true, status: 'ACTIVE' },
      include: { store: { select: { name: true, logo: true } } },
    });
  }

  private formatSpin(spin: any) {
    return {
      id: spin.id,
      status: spin.status,
      sectors: spin.sectors,
      winnerIndex: spin.winnerIndex,
      promoCode: spin.promoCode?.code ?? null,
      winnerCampaign: spin.campaign
        ? {
            id: spin.campaign.id,
            title: spin.campaign.title,
            storeName: spin.campaign.store?.name,
            discountType: spin.campaign.discountType,
            discountValue: spin.campaign.discountValue,
          }
        : null,
      expiresAt: spin.expiresAt,
      createdAt: spin.createdAt,
    };
  }
}
