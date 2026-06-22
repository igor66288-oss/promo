import { Controller, Post, Get, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { PartnerService } from './partner.service';

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
}
