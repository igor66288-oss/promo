import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone required');
    }

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email already registered');
    }
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) throw new ConflictException('Phone already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate unique referral code for this user
    const refCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    // Check if referrer exists
    let referrerId: string | null = null;
    if ((dto as any).refCode) {
      const referrer = await this.prisma.user.findUnique({ where: { refCode: (dto as any).refCode } });
      if (referrer) referrerId = referrer.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        name: dto.name,
        role: dto.role ?? Role.CUSTOMER,
        refCode,
        referredBy: referrerId ?? undefined,
      },
    });

    // Award referral bonus points to both parties
    if (referrerId) {
      await this.prisma.user.update({ where: { id: referrerId }, data: { points: { increment: 100 } } });
      await this.prisma.user.update({ where: { id: user.id }, data: { points: { increment: 50 } } });
    }

    const token = this.signToken(user.id, user.email, user.role);
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone required');
    }
    const user = await this.validateUser(dto.email, dto.phone, dto.password);
    const token = this.signToken(user.id, user.email, user.role);
    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async validateUser(email: string | undefined, phone: string | undefined, password: string) {
    let user: any = null;
    if (email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    } else if (phone) {
      user = await this.prisma.user.findUnique({ where: { phone } });
    }
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  private signToken(userId: string, email: string | null, role: string) {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
