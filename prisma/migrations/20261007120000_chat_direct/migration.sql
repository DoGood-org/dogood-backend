-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('GROUP', 'DIRECT');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "type" "ChatType" NOT NULL DEFAULT 'GROUP';

-- CreateIndex
CREATE UNIQUE INDEX "Chat_directKey_key" ON "Chat"("directKey");
