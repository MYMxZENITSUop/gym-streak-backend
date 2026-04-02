import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class WorkoutService {
  private client: GoogleGenAI;

  constructor(private configService: ConfigService, private prisma: PrismaService) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY')!,
    });
  }

  async generateWorkout(level: string, daysPerWeek: number, user: any) {
    const prompt = `
Generate a ${daysPerWeek}-day workout plan for a ${level} level gym-goer.
Return ONLY valid JSON in this format:
{
  "days": [
    {
      "day": "Day 1",
      "exercises": [
        { "name": "Exercise name", "sets": 3, "reps": "10-12" }
        ]
        }
        ]
        }
        `;
        
        const response = await this.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log("RAW RESPONSE:", text);
        
        const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
        try {
          const workoutPlan = JSON.parse(cleaned);
          
          // 🔥 Save to database
          const savedWorkout = await this.prisma.workout.create({
            data: {
              level,
              daysPerWeek,
              data: workoutPlan,
              userId: user.sub, // from JWT payload
            },
          });
          
          return savedWorkout;
        } catch (err) {
          console.error("JSON Parse failed. Raw output:", cleaned);
          throw new InternalServerErrorException(
            "Workout generation failed. Please try again."
          );
        }
      }
      private calculateTier(level: number): string {
        if (level >= 21) return "Diamond";
        if (level >= 16) return "Platinum";
        if (level >= 11) return "Gold";
        if (level >= 6) return "Silver";
        return "Bronze";
      }
      private async updateRankAfterCompletion(userId: string) {
        const streak = await this.prisma.streak.findUnique({
          where: { userId },
        });
      
        let rank = await this.prisma.rank.findUnique({
        where: { userId },
      });
      
      if (!rank) {
        rank = await this.prisma.rank.create({
          data: {
            userId,
          },
        });
      }
      
        const currentStreak = streak?.currentStreak ?? 0;
      
        // Base EXP
        let gainedExp = 10 + currentStreak * 5;
      
        // 7-day milestone bonus
        if (currentStreak !== 0 && currentStreak % 7 === 0) {
          gainedExp += 20;
        }
      
        const newExp = rank.xp + gainedExp;
      
        const newLevel = this.calculateLevel(newExp);
        const newTier = this.calculateTier(newLevel);
      
        await this.prisma.rank.update({
          where: { userId },
          data: {
            xp: newExp,
            level: newLevel,
            tier: newTier,
          },
        });
      }
async getUserWorkouts(userId: string) {
  return this.prisma.workout.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
async getAllWorkouts() {
  return this.prisma.workout.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}


async completeWorkout(userId: string, workoutId: string, dayName: string) {

  // 1️⃣ Create completion record
  await this.prisma.workoutCompletion.create({
    data: {
      userId,
      workoutId,
      dayName,
    },
  });

  // 2️⃣ Update streak
  let streak = await this.prisma.streak.findUnique({
  where: { userId },
});

if (!streak) {
  streak = await this.prisma.streak.create({
    data: {
      userId,
    },
  });
}
  const today = new Date();
  const lastWorkout = streak?.lastWorkoutDate;

  let newCurrentStreak = 1;

  if (lastWorkout) {
    const diff = Math.floor(
      (today.getTime() - new Date(lastWorkout).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (diff === 1) {
      newCurrentStreak = (streak?.currentStreak ?? 0) + 1;
    } else if (diff === 0) {
      throw new BadRequestException("Workout already completed today");
    }
  }

  await this.prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: Math.max(
        newCurrentStreak,
        streak?.longestStreak ?? 0
      ),
      lastWorkoutDate: today,
    },
  });

  // 3️⃣ Update rank
  await this.updateRankAfterCompletion(userId);

  return { message: "Workout completed successfully" };
}

async getDashboardData(userId: string) {
  const profile = await this.prisma.profile.findUnique({
    where: { userId },
  });

  const rank = await this.prisma.rank.findUnique({
    where: { userId },
  });

  const streak = await this.prisma.streak.findUnique({
    where: { userId },
  });

  const latestWorkout = await this.prisma.workout.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const completions = await this.prisma.workoutCompletion.findMany({
    where: { userId },
  });

  return {
    profile,
    rank,
    streak,
    latestWorkout,
    completions,
  };
}
private calculateLevel(exp: number): number {
  return Math.floor(exp / 100) + 1;
}


}