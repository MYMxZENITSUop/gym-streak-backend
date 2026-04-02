import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class AuthService {
  private transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    const user = await this.usersService.createUser(
      email,
      hashedPassword,
      Role.USER
    );
    
    await this.sendOtpEmail(email, otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpires: otpExpiry
      }});

    await this.prisma.profile.create({
      data: {
        userId: user.id,
        level: "beginner",
        workoutDaysPerWeek: 3,
        onboardingComplete: false,
      },
    });
    
    await this.prisma.rank.create({
      data: {
        userId: user.id,
      },
    });
    
    await this.prisma.streak.create({
      data: {
        userId: user.id,
      },
    });
    return {
      message: 'User registered successfully',
      user,
    };
  }

  private async sendOtpEmail(email: string, otp: string) {
  await this.transporter.sendMail({
    to: email,
    subject: "Gym Streak Verification Code",
    html: `
      <h2>Your verification code</h2>
      <h1>${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException("Please verify your email first");
}

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async verifyOtp(email: string, otp: string) {

    const normalizedEmail = email.trim().toLowerCase();

  const user = await this.prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.otpCode || String(user.otpCode) !== otp.trim()) {
  throw new Error("Invalid OTP");
}

  if (!user.otpExpires || user.otpExpires < new Date()) {
  throw new Error("OTP expired");
}

  await this.prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      emailVerified: true,
      otpCode: null,
      otpExpires: null
    }
  });
  const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
};

return {
  access_token: this.jwtService.sign(payload),
};

  return { message: "Email verified successfully" };
}

async resendOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await this.prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpires = new Date();
  otpExpires.setMinutes(otpExpires.getMinutes() + 5);

  // Save OTP
  await this.prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      otpCode: otp,
      otpExpires,
    },
  });

  // Send email (reuse your existing mail function)
  await this.sendOtpEmail(normalizedEmail, otp);

  return { message: "OTP resent successfully" };
}
}

