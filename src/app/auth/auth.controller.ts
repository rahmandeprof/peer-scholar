import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '@/app/users/dto/create-user.dto';

import { AuthService } from './auth.service';

import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async googleAuth() {}

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
