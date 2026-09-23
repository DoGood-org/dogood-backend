import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ContactControllerV1 } from 'src/support/controllers/v1/contact.controller';
import { SupportControllerV1 } from 'src/support/controllers/v1/support.controller';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';
import { ContactServiceV1 } from 'src/support/services/v1/contact.service';
import { SupportServiceV1 } from 'src/support/services/v1/support.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SupportControllerV1, ContactControllerV1],
  providers: [SupportServiceV1, ContactServiceV1, SupportMapperV1],
})
export class SupportModule {}
