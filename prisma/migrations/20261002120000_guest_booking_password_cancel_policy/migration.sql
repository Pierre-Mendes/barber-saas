-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('NONE', 'HOURS_BEFORE_START', 'WINDOW_AFTER_BOOKING');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "accessToken" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "cancelWindowMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'HOURS_BEFORE_START';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_accessToken_key" ON "Booking"("accessToken");

-- Backfill: clientes existentes passam a ter o e-mail da conta (chave para quem agenda sem conta).
UPDATE "Customer" c SET "email" = lower(u."email") FROM "User" u WHERE u."id" = c."userId";

-- Todo cliente é identificável: pela conta ou pelo e-mail.
ALTER TABLE "Customer" ADD CONSTRAINT "customer_identified" CHECK ("userId" IS NOT NULL OR "email" IS NOT NULL);
ALTER TABLE "Tenant" ADD CONSTRAINT "tenant_cancel_window_range" CHECK ("cancelWindowMinutes" BETWEEN 0 AND 10080);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_email_key" ON "Customer"("tenantId", "email");

