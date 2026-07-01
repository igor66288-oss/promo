import { Controller, Post, Get, Patch, Body, Headers, UseGuards, Request, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  // Store reports a completed order (inbound webhook: store → Promo)
  @Post('webhooks/order-paid')
  @HttpCode(200)
  handleOrderPaid(
    @Body() body: { storeApiKey: string; orderId: string; promoCode?: string; orderAmount: number },
  ) {
    return this.webhooksService.handleOrderPaid(body);
  }

  // Public code verification — used by store checkout system, no JWT needed
  // X-Store-Key: <apiKey>
  @Post('public/verify-code')
  @HttpCode(200)
  verifyCodePublic(
    @Headers('x-store-key') apiKey: string,
    @Body('code') code: string,
    @Body('orderId') orderId?: string,
  ) {
    return this.webhooksService.verifyCodePublic(apiKey, code, orderId);
  }

  // Merchant: get API key + webhook URL
  @Get('my/api-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getApiKey(@Request() req: any) {
    return this.webhooksService.getStoreApiKey(req.user.id);
  }

  // Merchant: rotate API key
  @Post('my/api-key/rotate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  rotateApiKey(@Request() req: any) {
    return this.webhooksService.rotateApiKey(req.user.id);
  }

  // Merchant: set webhook URL
  @Patch('my/webhook-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  setWebhookUrl(@Request() req: any, @Body('webhookUrl') webhookUrl: string) {
    return this.webhooksService.setWebhookUrl(req.user.id, webhookUrl);
  }

  // Merchant: send test webhook
  @Post('my/webhook-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  testWebhook(@Request() req: any) {
    return this.webhooksService.testWebhook(req.user.id);
  }
}
