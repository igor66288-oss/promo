import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Role } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Store already exists for this user');

    return this.prisma.store.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        logo: dto.logo,
        website: dto.website,
        tariff: dto.tariff,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async findAll() {
    return this.prisma.store.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true } },
        campaigns: {
          where: { status: 'ACTIVE' },
          select: { id: true, title: true, discountType: true, discountValue: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        campaigns: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findByUserId(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { userId },
      include: { campaigns: { orderBy: { createdAt: 'desc' } } },
    });
    if (!store) throw new NotFoundException('Store not found for this user');
    return store;
  }

  async verifyCode(merchantUserId: string, code: string) {
    const store = await this.prisma.store.findUnique({ where: { userId: merchantUserId } });
    if (!store) throw new NotFoundException('Store not found');

    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code },
      include: {
        campaign: { include: { store: true } },
        user: { select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    if (!promoCode) throw new NotFoundException('Promo code not found');
    if (promoCode.campaign.storeId !== store.id) throw new ForbiddenException('This code belongs to a different store');
    if (promoCode.status === 'REDEEMED' || promoCode.status === 'CONVERTED') throw new BadRequestException('Code already used');
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) throw new BadRequestException('Code expired');

    const updated = await this.prisma.promoCode.update({
      where: { code },
      data: { status: 'REDEEMED', usedAt: new Date() },
    });

    // Charge CPA if tariff is CPA
    if (store.tariff === 'CPA' && store.balance > 0) {
      const cpaAmount = Math.min(store.balance, promoCode.campaign.discountValue);
      await this.prisma.store.update({
        where: { id: store.id },
        data: { balance: { decrement: cpaAmount } },
      });
    }

    return {
      success: true,
      code: updated.code,
      status: updated.status,
      campaign: {
        title: promoCode.campaign.title,
        discountType: promoCode.campaign.discountType,
        discountValue: promoCode.campaign.discountValue,
      },
      customer: promoCode.user,
      usedAt: updated.usedAt,
    };
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateStoreDto) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    if (store.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only update your own store');
    }

    return this.prisma.store.update({
      where: { id },
      data: dto,
    });
  }
}
