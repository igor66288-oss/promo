-- CreateEnum
CREATE TYPE "SpinStatus" AS ENUM ('COMPLETED', 'EXPIRED', 'NO_CAMPAIGNS');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "inPartnerRoulette" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PartnerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSpin" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "promoCodeId" TEXT,
    "campaignId" TEXT,
    "sectors" JSONB NOT NULL,
    "winnerIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "SpinStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSpin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerConfig_slug_key" ON "PartnerConfig"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerConfig_secretKey_key" ON "PartnerConfig"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSpin_transactionId_key" ON "PartnerSpin"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSpin_promoCodeId_key" ON "PartnerSpin"("promoCodeId");

-- AddForeignKey
ALTER TABLE "PartnerSpin" ADD CONSTRAINT "PartnerSpin_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSpin" ADD CONSTRAINT "PartnerSpin_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSpin" ADD CONSTRAINT "PartnerSpin_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
