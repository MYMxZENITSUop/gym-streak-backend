import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post("onboarding")
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(
    @Req() req,
    @Body() body: { level: string; workoutDaysPerWeek: number }
  ) {
    return this.usersService.completeOnboarding(
      req.user.sub,
      body
    );
  }
}