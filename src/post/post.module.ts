import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { PostControllerV1 } from 'src/post/controllers/v1/post.controller';
import { PostMapperV1 } from 'src/post/mappers/v1/post.mapper';
import { PostServiceV1 } from 'src/post/services/v1/post.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PostControllerV1],
  providers: [PostServiceV1, PostMapperV1],
})
export class PostModule {}
