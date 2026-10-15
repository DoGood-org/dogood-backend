-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_ownerId_fkey";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "ownerId",
ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ChatMembership" ADD COLUMN     "pinPosition" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_directKey_key" ON "Chat"("directKey");
