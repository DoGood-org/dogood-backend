import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SharedModule } from '@shared/shared.module';
import { ChatControllerV1 } from 'src/chat/controllers/v1/chat.controller';
import { ChatGatewayV1 } from 'src/chat/gateways/v1/chat.gateway';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';
import { ChatMessageServiceV1 } from 'src/chat/services/v1/chat-message.service';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [ChatControllerV1],
  providers: [ChatServiceV1, ChatMessageServiceV1, ChatMapperV1, ChatGatewayV1],
})
export class ChatModule {}
