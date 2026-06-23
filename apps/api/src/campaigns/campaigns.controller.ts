import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  create(@Request() req: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.id, dto);
  }

  @Get('campaigns')
  findAll(@Query('category') category?: string) {
    return this.campaignsService.findAll(category);
  }

  @Get('campaigns/:id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, req.user.id, req.user.role, dto);
  }

  @Get('campaigns/nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
  ) {
    return this.campaignsService.findNearby(+lat, +lng, radius ? +radius : 10, category);
  }

  @Get('stores/:storeId/campaigns')
  findByStore(@Param('storeId') storeId: string) {
    return this.campaignsService.findByStore(storeId);
  }

  // Продвинуть кампанию (MERCHANT)
  @Post('campaigns/:id/promote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  promoteCampaign(
    @Param('id') id: string,
    @Body() body: { days: number },
    @Request() req: any,
  ) {
    return this.campaignsService.promoteCampaign(id, req.user.id, body.days);
  }
}
