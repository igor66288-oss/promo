import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Request() req: any,
    @Body('storeId') storeId: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
    @Body('campaignId') campaignId?: string,
  ) {
    return this.service.create(req.user.id, storeId, Number(rating), comment, campaignId);
  }

  @Get('store/:storeId')
  findByStore(@Param('storeId') storeId: string) {
    return this.service.findByStore(storeId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Request() req: any) {
    return this.service.findByUser(req.user.id);
  }
}
