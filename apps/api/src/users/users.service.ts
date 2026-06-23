import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Gender } from '@prisma/client';

export interface UpdateProfileDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: Gender;
  birthDate?: string;
  country?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.middleName !== undefined) data.middleName = dto.middleName;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.phone !== undefined) data.phone = dto.phone || null;

    const user = await this.prisma.user.update({ where: { id }, data });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        country: true,
        role: true,
        createdAt: true,
        _count: { select: { promoCodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async getCustomerCodes(userId: string) {
    return this.prisma.promoCode.findMany({
      where: { userId },
      include: {
        campaign: {
          include: { store: { select: { name: true, logo: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refCode: true, points: true, referredBy: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const referralCount = await this.prisma.user.count({ where: { referredBy: userId } });
    return { refCode: user.refCode, points: user.points, referralCount };
  }

  async claimCode(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { promoCodes: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Check per-user limit
    const userCodes = await this.prisma.promoCode.count({
      where: { userId, campaignId },
    });
    if (userCodes >= campaign.perUserLimit) {
      throw new NotFoundException('You already have a code for this campaign');
    }

    // Check total limit
    if (campaign.totalLimit && campaign._count.promoCodes >= campaign.totalLimit) {
      throw new NotFoundException('Campaign is out of codes');
    }

    const prefix = 'PROMO';
    const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${rand()}-${rand()}`;

    return this.prisma.promoCode.create({
      data: {
        code,
        campaignId,
        userId,
        status: 'ISSUED',
        expiresAt: campaign.endsAt,
      },
      include: {
        campaign: { include: { store: { select: { name: true, logo: true } } } },
      },
    });
  }
}
