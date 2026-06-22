import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RouletteService } from './roulette.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class RouletteController {
  constructor(private rouletteService: RouletteService) {}

  // Мерчант настраивает рулетку
  @Post('campaigns/:id/roulette')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  upsertConfig(
    @Param('id') id: string,
    @Body() body: { sectors: any[]; maxSpinsPerUser?: number; periodHours?: number },
    @Request() req,
  ) {
    return this.rouletteService.upsertConfig(id, req.user.id, body.sectors, body.maxSpinsPerUser ?? 1, body.periodHours ?? 24);
  }

  // Получить конфиг рулетки (публично)
  @Get('campaigns/:id/roulette')
  getConfig(@Param('id') id: string) {
    return this.rouletteService.getConfig(id);
  }

  // Крутить рулетку
  @Post('campaigns/:id/roulette/spin')
  @UseGuards(JwtAuthGuard)
  spin(@Param('id') id: string, @Request() req) {
    return this.rouletteService.spin(id, req.user.id);
  }

  // Сколько спинов осталось
  @Get('campaigns/:id/roulette/spins-left')
  @UseGuards(JwtAuthGuard)
  spinsLeft(@Param('id') id: string, @Request() req) {
    return this.rouletteService.getSpinsLeft(id, req.user.id);
  }
}
