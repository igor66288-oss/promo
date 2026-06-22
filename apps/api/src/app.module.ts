import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RouletteModule } from './roulette/roulette.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    CampaignsModule,
    PromoCodesModule,
    WebhooksModule,
    RouletteModule,
    AnalyticsModule,
    BillingModule,
  ],
})
export class AppModule {}
