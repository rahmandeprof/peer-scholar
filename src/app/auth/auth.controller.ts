import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from '@/app/users/dto/create-user.dto';

import { AuthService } from './auth.service';

import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user, loginDto.rememberMe);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard('jwt'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resendVerification(@Req() req: any) {
    return this.authService.resendVerification(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const data = await this.authService.googleLogin(req);
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

    if (typeof data === 'string') {
      res.redirect(`${clientUrl}/login?error=auth_failed`);

      return;
    }

    const userStr = encodeURIComponent(JSON.stringify(data.user));

    res.redirect(
      `${clientUrl}/auth/callback?token=${data.access_token}&user=${userStr}`,
    );
  }
}
