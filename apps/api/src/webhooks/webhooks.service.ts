import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  // Called when a purchase is made in the store (store → us)
  async handleOrderPaid(body: {
    storeApiKey: string;
    orderId: string;
    promoCode?: string;
    orderAmount: number;
  }) {
    const store = await this.prisma.store.findUnique({ where: { apiKey: body.storeApiKey } });
    if (!store) throw new UnauthorizedException('Invalid store API key');

    const eventData: any = {
      type: 'CONVERSION',
      storeId: store.id,
      metadata: { orderId: body.orderId, orderAmount: body.orderAmount },
    };

    if (body.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({
        where: { code: body.promoCode },
        include: { campaign: true },
      });
      if (promo && promo.campaign.storeId === store.id) {
        await this.prisma.promoCode.update({
          where: { code: body.promoCode },
          data: { status: 'CONVERTED', usedAt: new Date() },
        });
        eventData.campaignId = promo.campaignId;
        eventData.promoCodeId = promo.id;
        eventData.userId = promo.userId;
        await this.billingService.chargeConversion(store.id, promo.campaignId);
      }
    }

    await this.prisma.event.create({ data: eventData });
    return { received: true, orderId: body.orderId };
  }

  // Public code verification endpoint — used by store checkout (no JWT required)
  async verifyCodePublic(apiKey: string, code: string, orderId?: string) {
    const store = await this.prisma.store.findUnique({ where: { apiKey } });
    if (!store) throw new UnauthorizedException('Invalid X-Store-Key');

    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code },
      include: {
        campaign: { include: { store: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!promoCode) {
      return { valid: false, error: 'code_not_found' };
    }
    if (promoCode.campaign.storeId !== store.id) {
      return { valid: false, error: 'wrong_store' };
    }
    if (promoCode.status === 'REDEEMED' || promoCode.status === 'CONVERTED') {
      return { valid: false, error: 'already_used', usedAt: promoCode.usedAt };
    }
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      return { valid: false, error: 'expired', expiresAt: promoCode.expiresAt };
    }

    // Mark as redeemed
    await this.prisma.promoCode.update({
      where: { code },
      data: { status: 'REDEEMED', usedAt: new Date() },
    });

    // CPA charge
    if (store.tariff === 'CPA' && store.balance > 0) {
      const fee = Math.min(store.balance, promoCode.campaign.discountValue);
      await this.prisma.store.update({ where: { id: store.id }, data: { balance: { decrement: fee } } });
    }

    // Award loyalty points
    if (promoCode.userId) {
      await this.prisma.user.update({
        where: { id: promoCode.userId },
        data: { points: { increment: 10 } },
      }).catch(() => {});
    }

    // Log event
    await this.prisma.event.create({
      data: {
        type: 'REDEMPTION',
        storeId: store.id,
        campaignId: promoCode.campaignId,
        promoCodeId: promoCode.id,
        userId: promoCode.userId ?? undefined,
        metadata: orderId ? { orderId } : undefined,
      },
    });

    const result = {
      valid: true,
      code: promoCode.code,
      orderId: orderId ?? null,
      discount: {
        type: promoCode.campaign.discountType,
        value: promoCode.campaign.discountValue,
      },
      campaign: promoCode.campaign.title,
      store: store.name,
      redeemedAt: new Date().toISOString(),
    };

    // Fire outbound webhook if configured
    if (store.webhookUrl) {
      this.sendOutboundWebhook(store.webhookUrl, {
        event: 'code.redeemed',
        ...result,
      }).catch(() => {});
    }

    return result;
  }

  // Outbound webhook: us → store's server
  private async sendOutboundWebhook(url: string, payload: any) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Promo-Event': payload.event },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  }

  // Test outbound webhook
  async testWebhook(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    if (!store.webhookUrl) throw new BadRequestException('No webhook URL configured');

    const payload = {
      event: 'webhook.test',
      store: store.name,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from Promo Platform',
    };

    try {
      const res = await fetch(store.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Promo-Event': 'webhook.test' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      return { success: res.ok, status: res.status };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getStoreApiKey(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    return { apiKey: store.apiKey, webhookUrl: store.webhookUrl, storeId: store.id, storeName: store.name };
  }

  async rotateApiKey(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    const newKey = `sk_live_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const updated = await this.prisma.store.update({ where: { id: store.id }, data: { apiKey: newKey } });
    return { apiKey: updated.apiKey };
  }

  async setWebhookUrl(userId: string, webhookUrl: string | null) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: { webhookUrl: webhookUrl || null },
    });
    return { webhookUrl: updated.webhookUrl };
  }
}
