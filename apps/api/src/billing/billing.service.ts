import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private getOmise() {
    const key = process.env.OMISE_SECRET_KEY;
    if (!key) return null;
    try {
      const omise = require('omise')({ secretKey: key, publicKey: process.env.OMISE_PUBLIC_KEY });
      return omise;
    } catch {
      return null;
    }
  }

  // Получить баланс и историю
  async getBalance(merchantUserId: string) {
    const store = await this.prisma.store.findUnique({
      where: { userId: merchantUserId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return {
      balance: store.balance,
      balanceTHB: store.balance / 100,
      tariff: store.tariff,
      status: store.status,
      invoices: store.invoices,
    };
  }

  // Создать инвойс и оплатить через Omise
  async createTopUp(merchantUserId: string, amountTHB: number, token?: string) {
    const store = await this.prisma.store.findUnique({ where: { userId: merchantUserId } });
    if (!store) throw new NotFoundException('Store not found');

    if (amountTHB < 20) throw new BadRequestException('Minimum top-up is 20 THB');

    const amountSatangs = Math.round(amountTHB * 100);

    // Создаём инвойс
    const invoice = await this.prisma.invoice.create({
      data: {
        storeId: store.id,
        amount: amountSatangs,
        status: 'PENDING',
        items: [{ description: `Balance top-up — ${amountTHB} THB`, amount: amountSatangs }] as any,
      },
    });

    // Если нет токена Omise — возвращаем инвойс (демо-режим)
    const omise = this.getOmise();
    if (!omise || !token) {
      // Демо-режим: сразу зачисляем баланс
      await this.prisma.store.update({
        where: { id: store.id },
        data: { balance: { increment: amountSatangs } },
      });
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      // Если магазин был заморожен — реактивируем
      if (store.status === 'SUSPENDED') {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { status: 'ACTIVE' },
        });
      }

      return {
        success: true,
        invoice: { ...invoice, status: 'PAID' },
        demo: true,
        newBalance: store.balance + amountSatangs,
      };
    }

    // Реальный платёж через Omise
    try {
      const charge = await new Promise<any>((resolve, reject) => {
        omise.charges.create(
          {
            amount: amountSatangs,
            currency: 'thb',
            card: token,
            description: `Promo Platform top-up — Store: ${store.name}`,
            metadata: { invoiceId: invoice.id, storeId: store.id },
          },
          (err: any, res: any) => (err ? reject(err) : resolve(res)),
        );
      });

      if (charge.status === 'successful') {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { balance: { increment: amountSatangs } },
        });

        // Если магазин был заморожен — реактивируем
        if (store.status === 'SUSPENDED') {
          await this.prisma.store.update({
            where: { id: store.id },
            data: { status: 'ACTIVE' },
          });
        }

        const updated = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', paidAt: new Date(), omiseChargeId: charge.id },
        });
        return { success: true, invoice: updated, newBalance: store.balance + amountSatangs };
      } else {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException(`Payment failed: ${charge.failure_message}`);
      }
    } catch (e: any) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(e.message || 'Payment failed');
    }
  }

  // CPA списание — вызывается при подтверждённой конверсии
  async chargeConversion(storeId: string, campaignId: string, amount = 1000) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.tariff !== 'CPA') return;

    if (store.balance < amount) {
      // Приостанавливаем показы при нулевом балансе
      await this.prisma.store.update({ where: { id: storeId }, data: { status: 'SUSPENDED' } });
      return { suspended: true };
    }

    await this.prisma.store.update({
      where: { id: storeId },
      data: { balance: { decrement: amount } },
    });

    await this.prisma.invoice.create({
      data: {
        storeId,
        amount,
        status: 'PAID',
        paidAt: new Date(),
        items: [{ description: `CPA charge — conversion via campaign`, amount, campaignId }] as any,
      },
    });

    return { charged: amount, newBalance: store.balance - amount };
  }

  // Генерация PDF счёт-фактуры
  async generateInvoicePdf(invoiceId: string, merchantUserId: string, res: any) {
    const store = await this.prisma.store.findUnique({ where: { userId: merchantUserId } });
    if (!store) throw new NotFoundException('Store not found');

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, storeId: store.id },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PROMO PLATFORM', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('promo.th | support@promo.th', 50, 80);
    doc.fillColor('#7C3AED').rect(50, 100, 500, 3).fill();

    // Invoice details
    doc.fillColor('#000').fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 120);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Invoice ID: ${invoice.id}`, 50, 150);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}`, 50, 165);
    doc.text(`Status: ${invoice.status}`, 50, 180);
    if (invoice.paidAt) doc.text(`Paid: ${new Date(invoice.paidAt).toLocaleDateString('en-GB')}`, 50, 195);

    // Store info
    doc.text(`Store: ${store.name}`, 300, 150);
    doc.text(`Tariff: ${store.tariff}`, 300, 165);

    // Items table
    doc.fillColor('#7C3AED').rect(50, 230, 500, 25).fill();
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10);
    doc.text('Description', 60, 238);
    doc.text('Amount (THB)', 430, 238);

    doc.fillColor('#000').font('Helvetica').fontSize(10);
    const items = Array.isArray(invoice.items) ? (invoice.items as any[]) : [];
    let y = 270;
    for (const item of items) {
      doc.text(item.description || '-', 60, y);
      doc.text(`฿${((item.amount || 0) / 100).toFixed(2)}`, 430, y);
      y += 20;
    }

    // Total
    doc.fillColor('#333').rect(50, y + 10, 500, 1).fill();
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL', 60, y + 20);
    doc.fillColor('#7C3AED').text(`฿${(invoice.amount / 100).toFixed(2)}`, 430, y + 20);

    doc.end();
  }

  // История инвойсов для admin
  async getAllInvoices(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { store: { select: { id: true, name: true } } },
      }),
      this.prisma.invoice.count(),
    ]);
    return { invoices, total, page, pages: Math.ceil(total / limit) };
  }
}
