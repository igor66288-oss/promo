import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class PromoCodesController {
  constructor(private promoCodesService: PromoCodesService) {}

  // Client claims a promo code for a campaign
  @Post('campaigns/:id/claim')
  @UseGuards(JwtAuthGuard)
  claimCode(@Param('id') id: string, @Request() req: any) {
    return this.promoCodesService.claimCode(id, req.user.id);
  }

  // Public endpoint — validate a code (for stores integrating via API)
  @Get('promo-codes/:code/validate')
  validateCode(@Param('code') code: string) {
    return this.promoCodesService.validateCode(code);
  }

  // Merchant marks a code as redeemed
  @Post('promo-codes/:code/redeem')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  redeemCode(@Param('code') code: string, @Request() req: any) {
    return this.promoCodesService.redeemCode(code, req.user.id);
  }

  // Client: list my codes
  @Get('my/codes')
  @UseGuards(JwtAuthGuard)
  getMyCodes(@Request() req: any) {
    return this.promoCodesService.getMyCodes(req.user.id);
  }

  // Merchant: list codes for a campaign
  @Get('campaigns/:id/codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getCampaignCodes(@Param('id') id: string, @Request() req: any) {
    return this.promoCodesService.getCampaignCodes(id, req.user.id);
  }
}
