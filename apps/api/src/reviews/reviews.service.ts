import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, storeId: string, rating: number, comment?: string, campaignId?: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be 1-5');

    // Check user has used a code from this store
    const usedCode = await this.prisma.promoCode.findFirst({
      where: { userId, status: { in: ['REDEEMED', 'CONVERTED'] }, campaign: { storeId } },
    });
    if (!usedCode) throw new BadRequestException('You must use a promo code from this store before reviewing');

    return this.prisma.review.upsert({
      where: { userId_storeId: { userId, storeId } },
      create: { userId, storeId, campaignId, rating, comment },
      update: { rating, comment, campaignId },
      include: { user: { select: { name: true, firstName: true } } },
    });
  }

  async findByStore(storeId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { storeId },
      include: { user: { select: { name: true, firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { reviews, avgRating: Math.round(avg * 10) / 10, total: reviews.length };
  }

  async findByUser(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { store: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
