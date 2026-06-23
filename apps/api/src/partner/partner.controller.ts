import { Controller, Post, Get, Param, Body, Headers, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post('spin')
  async spin(
    @Headers('x-partner-key') partnerKey: string,
    @Body() body: { customerRef: string; transactionId: string },
  ) {
    if (!partnerKey) throw new UnauthorizedException('Missing X-Partner-Key header');
    const result = await this.partnerService.spin(partnerKey, body.customerRef, body.transactionId);
    return {
      ...result,
      widgetUrl: `${process.env.WEB_URL || 'http://localhost:3000'}/th/partner-spin/${result.id}`,
    };
  }

  @Get('spin/:id')
  getSpinResult(@Param('id') id: string) {
    return this.partnerService.getSpinResult(id);
  }

  @Get('campaigns')
  getActiveCampaigns() {
    return this.partnerService.getActiveCampaigns();
  }

  @Get('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAllConfigs() {
    return this.partnerService.getAllConfigs();
  }

  @Post('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createConfig(@Body() body: { name: string; slug: string }) {
    return this.partnerService.createConfig(body.name, body.slug);
  }

  @Get('configs/:id/spins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getSpinsByPartner(@Param('id') id: string) {
    return this.partnerService.getSpinsByPartner(id);
  }
}
