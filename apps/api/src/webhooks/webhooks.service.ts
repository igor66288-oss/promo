import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  // Called when a purchase is made in the store
  async handleOrderPaid(body: {
    storeApiKey: string;
    orderId: string;
    promoCode?: string;
    orderAmount: number; // in satangs
  }) {
    // Find store by apiKey
    const store = await this.prisma.store.findUnique({
      where: { apiKey: body.storeApiKey },
    });
    if (!store) throw new UnauthorizedException('Invalid store API key');

    // Record conversion event
    const eventData: any = {
      type: 'CONVERSION',
      storeId: store.id,
      metadata: { orderId: body.orderId, orderAmount: body.orderAmount },
    };

    // If promo code provided — update its status
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

        // CPA billing: deduct conversion fee from store balance
        await this.billingService.chargeConversion(store.id, promo.campaignId);
      }
    }

    await this.prisma.event.create({ data: eventData });

    return { received: true, orderId: body.orderId };
  }

  // Get store API key (for merchant)
  async getStoreApiKey(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    return { apiKey: store.apiKey, storeId: store.id, storeName: store.name };
  }

  // Rotate API key
  async rotateApiKey(userId: string) {
    const store = await this.prisma.store.findUnique({ where: { userId } });
    if (!store) throw new NotFoundException('Store not found');
    const newKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: { apiKey: newKey },
    });
    return { apiKey: updated.apiKey };
  }
}
