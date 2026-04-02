import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

 @Post('register')
register(@Body() body: RegisterDto) {
  return this.authService.register(
    body.email,
    body.password,
  );
}

@Post("verify-otp")
verifyOtp(@Body() body: { email: string; otp: string }) {
  return this.authService.verifyOtp(body.email, body.otp);
}

@Post('resend-otp')
async resendOtp(@Body() body: { email: string }) {
  return this.authService.resendOtp(body.email);
}

@Post('login')
login(@Body() body: LoginDto) {
  return this.authService.login(
    body.email,
    body.password,
  );
}
}
