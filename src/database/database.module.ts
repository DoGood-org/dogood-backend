import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
