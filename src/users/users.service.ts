import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async createUser(email: string, password: string, role: Role) {
    return this.prisma.user.create({
      data: { email, password, role },
    })
  }

  async completeOnboarding(
  userId: string,
  data: { level: string; workoutDaysPerWeek: number }
) {
  // Create or update profile
  await this.prisma.profile.upsert({
    where: { userId },
    update: {
      level: data.level,
      workoutDaysPerWeek: data.workoutDaysPerWeek,
      onboardingComplete: true,
    },
    create: {
      userId,
      level: data.level,
      workoutDaysPerWeek: data.workoutDaysPerWeek,
      onboardingComplete: true,
    },
  });

  // Set initial rank based on level
  const tierMap: Record<string, string> = {
    beginner: "Bronze",
    intermediate: "Silver",
    advanced: "Gold",
  };

  await this.prisma.rank.upsert({
    where: { userId },
    update: {
      tier: tierMap[data.level],
    },
    create: {
      userId,
      tier: tierMap[data.level],
    },
  });

  return { message: "Onboarding completed" };
}
}