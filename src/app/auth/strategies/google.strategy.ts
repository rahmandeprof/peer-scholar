import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { AuthService } from '../auth.service';

import { Request } from 'express';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

// User data extracted from Google OAuth profile
export interface GoogleOAuthUser {
  email: string | null;
  firstName: string;
  lastName: string;
  picture: string | null;
  googleId: string;
  accessToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos, id } = profile;
    const user: GoogleOAuthUser = {
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name ? name.givenName || '' : '',
      lastName: name ? name.familyName || '' : '',
      picture: photos && photos.length > 0 ? photos[0].value : null,
      googleId: id,
      accessToken,
    };

    done(null, user);
  }
}
