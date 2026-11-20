import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { CreatePostRequestDtoV1 } from 'src/post/dtos/requests/v1/create-post-request.dto';
import {
  LocalizedPostV1,
  PostDeletedResponseV1,
  PostListResponseV1,
  PostResponseV1,
  PostSearchParamsV1,
  PostV1,
  UpdatedPostV1,
  UpdatePostDataV1,
} from 'src/post/interfaces/post';
import { PostServiceV1 } from 'src/post/services/v1/post.service';
import { UpdatePostRequestDtoV1 } from 'src/post/dtos/requests/v1/update-post-request.dto';
import { DeletePostResponseDtoV1 } from 'src/post/dtos/responses/v1/delete-post-response.dto';
import { GetPostsResponseDtoV1 } from 'src/post/dtos/responses/v1/get-posts-response.dto';
import {
  CreatePostResponseDtoV1,
  GetPostResponseDtoV1,
  UpdatePostResponseDtoV1,
} from 'src/post/dtos/responses/v1/post-response.dto';

// NOTE: every route is public — legacy post.route never mounted authenticate. `search/:lang` must stay above
// `:id/:lang`, or `id = 'search'` swallows the search. Search query and PATCH body are unvalidated, as in legacy.
@Public()
@Controller({ path: 'posts', version: '1' })
export class PostControllerV1 {
  constructor(private readonly postService: PostServiceV1) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreatePostResponseDtoV1 })
  async createPost(
    @Body() dto: CreatePostRequestDtoV1,
  ): Promise<PostResponseV1<PostV1>> {
    return await this.postService.createPost(dto);
  }

  @Get('search/:lang')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiOkResponse({ type: GetPostsResponseDtoV1 })
  async getFilteredPosts(
    @Param('lang') lang: string,
    @Query() query: PostSearchParamsV1,
  ): Promise<PostListResponseV1> {
    return await this.postService.getFilteredPosts(query, lang);
  }

  @Get(':lang')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetPostsResponseDtoV1 })
  async getAllPosts(@Param('lang') lang: string): Promise<PostListResponseV1> {
    return await this.postService.getAllPosts(lang);
  }

  @Get(':id/:lang')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetPostResponseDtoV1 })
  async getPostById(
    @Param('id') id: string,
    @Param('lang') lang: string,
  ): Promise<PostResponseV1<LocalizedPostV1>> {
    return await this.postService.getPostById(id, lang);
  }

  @Patch(':id/:lang')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'lang', type: String })
  @ApiBody({ type: UpdatePostRequestDtoV1 })
  @ApiOkResponse({ type: UpdatePostResponseDtoV1 })
  async updatePost(
    @Param('id') id: string,
    @Body() body: UpdatePostDataV1,
  ): Promise<PostResponseV1<UpdatedPostV1>> {
    return await this.postService.updatePost(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DeletePostResponseDtoV1 })
  async deletePost(@Param('id') id: string): Promise<PostDeletedResponseV1> {
    return await this.postService.deletePost(id);
  }
}
