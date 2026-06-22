import { PrismaClient, Role, StoreStatus, Tariff, DiscountType, CampaignStatus, PromoStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.event.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.rouletteConfig.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  // Admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@promo.th',
      password: adminPassword,
      role: Role.ADMIN,
      name: 'Admin',
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Merchant user
  const merchantPassword = await bcrypt.hash('Demo123!', 10);
  const merchant = await prisma.user.create({
    data: {
      email: 'merchant@demo.th',
      password: merchantPassword,
      role: Role.MERCHANT,
      name: 'Demo Merchant',
    },
  });
  console.log(`Created merchant: ${merchant.email}`);

  // Demo Store
  const store = await prisma.store.create({
    data: {
      userId: merchant.id,
      name: 'Demo Store',
      description: 'ร้านค้าตัวอย่างสำหรับแพลตฟอร์ม Promo',
      website: 'https://demo.promo.th',
      status: StoreStatus.ACTIVE,
      tariff: Tariff.CPA,
      balance: 50000,
    },
  });
  console.log(`Created store: ${store.name}`);

  // Campaign 1: Percentage discount
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const campaign1 = await prisma.campaign.create({
    data: {
      storeId: store.id,
      title: 'Summer Sale 20% Off',
      description: 'ส่วนลด 20% สำหรับทุกสินค้า ในช่วงซัมเมอร์เซล',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      conditions: 'ไม่มีขั้นต่ำในการสั่งซื้อ ใช้ได้ถึง 31 กรกฎาคม 2026',
      startsAt: now,
      endsAt: nextMonth,
      totalLimit: 100,
      perUserLimit: 1,
      status: CampaignStatus.ACTIVE,
      promoted: true,
      promotedUntil: nextMonth,
    },
  });
  console.log(`Created campaign: ${campaign1.title}`);

  // Campaign 2: Fixed discount
  const campaign2 = await prisma.campaign.create({
    data: {
      storeId: store.id,
      title: 'New Member 100 THB Off',
      description: 'ส่วนลด 100 บาท สำหรับสมาชิกใหม่',
      discountType: DiscountType.FIXED,
      discountValue: 100,
      conditions: 'สั่งซื้อขั้นต่ำ 500 บาท สำหรับสมาชิกใหม่เท่านั้น',
      startsAt: now,
      endsAt: nextMonth,
      totalLimit: 200,
      perUserLimit: 1,
      status: CampaignStatus.ACTIVE,
      promoted: false,
    },
  });
  console.log(`Created campaign: ${campaign2.title}`);

  // PromoCode for Campaign 1 (3 codes)
  const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const promoCodes = await Promise.all([
    prisma.promoCode.create({
      data: {
        code: 'SUMMER20A',
        campaignId: campaign1.id,
        status: PromoStatus.CREATED,
        expiresAt: expiry,
      },
    }),
    prisma.promoCode.create({
      data: {
        code: 'SUMMER20B',
        campaignId: campaign1.id,
        status: PromoStatus.ISSUED,
        expiresAt: expiry,
      },
    }),
    prisma.promoCode.create({
      data: {
        code: 'SUMMER20C',
        campaignId: campaign1.id,
        status: PromoStatus.REDEEMED,
        expiresAt: expiry,
        usedAt: new Date(),
      },
    }),
    // PromoCode for Campaign 2 (2 codes)
    prisma.promoCode.create({
      data: {
        code: 'NEW100A',
        campaignId: campaign2.id,
        status: PromoStatus.CREATED,
        expiresAt: expiry,
      },
    }),
    prisma.promoCode.create({
      data: {
        code: 'NEW100B',
        campaignId: campaign2.id,
        status: PromoStatus.ISSUED,
        expiresAt: expiry,
      },
    }),
  ]);

  console.log(`Created ${promoCodes.length} promo codes`);
  console.log('\nSeed completed successfully!');
  console.log('\nCredentials:');
  console.log('  Admin:    admin@promo.th / Admin123!');
  console.log('  Merchant: merchant@demo.th / Demo123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
