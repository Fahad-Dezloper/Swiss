-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "recipientWallet" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "senderWallet" TEXT NOT NULL DEFAULT '';
