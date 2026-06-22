import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  // Public webhook — store reports an order payment
  @Post('webhooks/order-paid')
  handleOrderPaid(
    @Body()
    body: {
      storeApiKey: string;
      orderId: string;
      promoCode?: string;
      orderAmount: number;
    },
  ) {
    return this.webhooksService.handleOrderPaid(body);
  }

  // Merchant gets their API key
  @Get('my/api-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getApiKey(@Request() req: any) {
    return this.webhooksService.getStoreApiKey(req.user.id);
  }

  // Rotate API key
  @Post('my/api-key/rotate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  rotateApiKey(@Request() req: any) {
    return this.webhooksService.rotateApiKey(req.user.id);
  }
}
