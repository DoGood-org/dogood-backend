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
  UseGuards,
} from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { AuthUser, User } from '@shared/decorators/user.decorator';
import { CreateOrganizationReviewRequestDtoV1 } from 'src/review/dtos/requests/v1/create-organization-review-request.dto';
import { CreatePlatformReviewRequestDtoV1 } from 'src/review/dtos/requests/v1/create-platform-review-request.dto';
import { CreateUserReviewRequestDtoV1 } from 'src/review/dtos/requests/v1/create-user-review-request.dto';
import { GetAdminReviewsRequestDtoV1 } from 'src/review/dtos/requests/v1/get-admin-reviews-request.dto';
import { ModerateReviewRequestDtoV1 } from 'src/review/dtos/requests/v1/moderate-review-request.dto';
import { UpdateReviewRequestDtoV1 } from 'src/review/dtos/requests/v1/update-review-request.dto';
import { ReviewAdminV1Guard } from 'src/review/guards/review-admin-v1.guard';
import {
  ReviewDeletedResponseV1,
  ReviewListV1,
  ReviewResponseV1,
  ReviewV1,
  UpdatedReviewV1,
} from 'src/review/interfaces/review';
import { ReviewServiceV1 } from 'src/review/services/v1/review.service';

@Controller({ path: 'reviews', version: '1' })
export class ReviewControllerV1 {
  constructor(private readonly reviewService: ReviewServiceV1) {}

  @Get('admin/all')
  @UseGuards(ReviewAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  async getAdminReviews(
    @Query() query: GetAdminReviewsRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    return await this.reviewService.getAdminReviews(query);
  }

  @Public()
  @Get('platform')
  @HttpCode(HttpStatus.OK)
  async getPlatformReviews(): Promise<ReviewResponseV1<ReviewListV1>> {
    return await this.reviewService.getPlatformReviews();
  }

  @Patch('admin/:id/status')
  @UseGuards(ReviewAdminV1Guard)
  @HttpCode(HttpStatus.OK)
  async moderateReview(
    @Param('id') id: string,
    @Body() dto: ModerateReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    return await this.reviewService.moderateReview(id, dto);
  }

  @Public()
  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  async getUserReviews(
    @Param('id') id: string,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    return await this.reviewService.getUserReviews(id);
  }

  @Public()
  @Get('organizations/:id')
  @HttpCode(HttpStatus.OK)
  async getOrganizationReviews(
    @Param('id') id: string,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    return await this.reviewService.getOrganizationReviews(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUserReview(
    @User('id') userId: string,
    @Body() dto: CreateUserReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    return await this.reviewService.createUserReview(userId, dto);
  }

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  async createOrganizationReview(
    @User('id') userId: string,
    @Body() dto: CreateOrganizationReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    return await this.reviewService.createOrganizationReview(userId, dto);
  }

  @Post('platform')
  @HttpCode(HttpStatus.CREATED)
  async createPlatformReview(
    @User('id') userId: string,
    @Body() dto: CreatePlatformReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    return await this.reviewService.createPlatformReview(userId, dto);
  }

  @Post(':taskId/users')
  @HttpCode(HttpStatus.CREATED)
  async createTaskUserReview(
    @User('id') userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateUserReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    return await this.reviewService.createTaskUserReview(userId, taskId, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateReview(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReviewRequestDtoV1,
  ): Promise<ReviewResponseV1<UpdatedReviewV1>> {
    return await this.reviewService.updateReview(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(
    @User() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ReviewDeletedResponseV1> {
    const { id: userId, role } = user;

    return await this.reviewService.deleteReview(id, userId, role);
  }
}
