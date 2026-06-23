import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@promo.th',
        to,
        subject,
        html,
      });
    } catch (e: any) {
      this.logger.warn(`Email failed to ${to}: ${e.message}`);
    }
  }

  // Runs every day at 10:00
  @Cron('0 10 * * *')
  async sendExpiringCodeReminders() {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const codes = await this.prisma.promoCode.findMany({
      where: {
        status: { in: ['ISSUED', 'CREATED'] },
        expiresAt: { gte: tomorrow, lte: soon },
        user: { email: { not: null } },
      },
      include: {
        user: { select: { email: true, name: true, firstName: true } },
        campaign: { include: { store: { select: { name: true } } } },
      },
    });

    for (const c of codes) {
      if (!c.user?.email) continue;
      const name = c.user.firstName || c.user.name || 'คุณ';
      const expDate = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('th-TH') : '';
      await this.send(
        c.user.email,
        `⏰ โปรโมโค้ดของคุณใกล้หมดอายุ — ${c.campaign.store.name}`,
        `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#030712;color:white;padding:32px;border-radius:16px">
          <h2 style="color:#06B6D4">สวัสดี ${name}! ⏰</h2>
          <p>โปรโมโค้ดของคุณใกล้จะหมดอายุแล้ว</p>
          <div style="background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.2);border-radius:12px;padding:16px;margin:16px 0;text-align:center">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5)">PROMO CODE</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;letter-spacing:0.12em;color:#06B6D4;font-family:monospace">${c.code}</p>
          </div>
          <p><strong>${c.campaign.title}</strong> — ${c.campaign.store.name}</p>
          <p style="color:#ef4444">หมดอายุ: ${expDate}</p>
          <a href="${process.env.WEB_URL || 'http://5.223.88.83'}/th/account/codes" style="display:inline-block;background:linear-gradient(135deg,#06B6D4,#F97316);color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:8px">ดูโค้ดของฉัน</a>
        </div>
        `,
      );
    }
    if (codes.length > 0) this.logger.log(`Sent ${codes.length} expiry reminders`);
  }

  async sendNewCampaignNotification(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: { select: { name: true } } },
    });
    if (!campaign) return;

    const customers = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', email: { not: null } },
      select: { email: true, name: true, firstName: true },
      take: 500,
    });

    const webUrl = process.env.WEB_URL || 'http://5.223.88.83';
    let discountText = '';
    if (campaign.discountType === 'PERCENTAGE') discountText = `${campaign.discountValue}% OFF`;
    else if (campaign.discountType === 'FIXED') discountText = `฿${campaign.discountValue} OFF`;
    else discountText = 'FREE GIFT';

    for (const u of customers) {
      if (!u.email) continue;
      const name = u.firstName || u.name || 'คุณ';
      await this.send(
        u.email,
        `🔥 ดีลใหม่! ${discountText} จาก ${campaign.store.name}`,
        `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#030712;color:white;padding:32px;border-radius:16px">
          <h2 style="color:#F97316">สวัสดี ${name}! 🔥</h2>
          <p>มีดีลใหม่ที่น่าสนใจจาก <strong>${campaign.store.name}</strong></p>
          <div style="background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:12px;padding:20px;margin:16px 0;text-align:center">
            <p style="margin:0;font-size:28px;font-weight:900;color:#F97316">${discountText}</p>
            <p style="margin:8px 0 0;font-size:15px;font-weight:600">${campaign.title}</p>
          </div>
          <a href="${webUrl}/th" style="display:inline-block;background:linear-gradient(135deg,#06B6D4,#F97316);color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:8px">รับโปรโมโค้ดเลย</a>
        </div>
        `,
      );
    }
    this.logger.log(`Sent new campaign notification to ${customers.length} customers`);
  }
}
