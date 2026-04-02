import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { WorkoutService } from './workout.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GenerateWorkoutDto } from '../auth/dto/generate-workout.dto';


@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('workout')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post('generate')
  async generateWorkout(
    @Body() body: GenerateWorkoutDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.workoutService.generateWorkout(
      body.level,
      body.daysPerWeek,
      user,
    );
  }

  // ✅ ADMIN ONLY
  @Roles(Role.ADMIN)
  @Get('all-workouts')
  async getAllWorkouts() {
    return this.workoutService.getAllWorkouts();
  }

  @Get('my-workouts')
async getMyWorkouts(@Req() req: any) {
  const user = req.user;
  return this.workoutService.getUserWorkouts(user.sub);
}

@Get("dashboard-data")
@UseGuards(JwtAuthGuard)
async getDashboard(@Req() req: any) {
  return this.workoutService.getDashboardData(req.user.sub);
}

@Post('complete')
@UseGuards(JwtAuthGuard)
async completeWorkout(
  @Req() req: any,
  @Body() body: { workoutId: string; dayName: string },
) {
  return this.workoutService.completeWorkout(
    req.user.sub,
    body.workoutId,
    body.dayName,
  );
}
}

