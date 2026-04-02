import { IsString, IsInt, Min, Max } from 'class-validator';

export class GenerateWorkoutDto {
  @IsString()
  level: string;

  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;
}
