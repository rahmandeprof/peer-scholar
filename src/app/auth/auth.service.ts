import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { User } from '@/app/users/entities/user.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';

import { UsersService } from '@/app/users/users.service';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    department: string;
    yearOfStudy: number;
  } | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;

      return result as {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        department: string;
        yearOfStudy: number;
      };
    }

    return null;
  }

  login(
    user:
      | User
      | Omit<User, 'password'>
      | {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        department: string;
        yearOfStudy: number;
      },
  ) {
    const payload = {
      email: user.email,
      sub: user.id,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
      },
    };
  }

  async register(userData: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userDataPlain = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      department: userData.department,
      yearOfStudy: userData.yearOfStudy,
      password: hashedPassword,
    };
    const newUser = await this.usersService.create(userDataPlain);

    return this.login(newUser);
  }

  async googleLogin(req: any) {
    if (!req.user) {
      return 'No user from google';
    }

    const { email, firstName, lastName, picture, googleId } = req.user;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user
      const userData = {
        email,
        firstName,
        lastName,
        image: picture,
        googleId,
        password: '', // No password for google users
        department: 'General', // Default
        yearOfStudy: 1, // Default
      };
      user = await this.usersService.create(userData as any);
    } else if (!user.googleId) {
      // Link existing user
      await this.usersService.update(user.id, { googleId, image: picture });
      user.googleId = googleId;
    }

    return this.login(user);
  }
}
