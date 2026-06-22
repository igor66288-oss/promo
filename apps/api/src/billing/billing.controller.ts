import { Controller, Get, Post, Param, Body, Res, Query, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('balance')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  getBalance(@Request() req: any) {
    return this.billingService.getBalance(req.user.id);
  }

  @Post('top-up')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  topUp(@Request() req: any, @Body() body: { amount: number; token?: string }) {
    return this.billingService.createTopUp(req.user.id, body.amount, body.token);
  }

  @Get('invoices/:id/pdf')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  downloadPdf(@Param('id') id: string, @Request() req: any, @Res() res: any) {
    return this.billingService.generateInvoicePdf(id, req.user.id, res);
  }

  @Get('admin/invoices')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAllInvoices(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.billingService.getAllInvoices(Number(page) || 1, Number(limit) || 20);
  }
}
