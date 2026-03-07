import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

import { AuthService } from './app/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    // Create a test user
    const testUser = await authService.register({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@peerscholar.com',
      password: 'Test123!@#',
      department: 'Computer Science',
      yearOfStudy: 3,
    } as any);

    console.log(
      '\n✅ Test user created successfully! Please check the database and verify the email.',
    );
    console.log('\n📧 Login Credentials:');
    console.log('Email: test@peerscholar.com');
    console.log('Password: Test123!@#');
  } catch (err: any) {
    if (err?.message?.includes('duplicate') || err?.code === '23505') {
      console.log('\n⚠️  Test user already exists!');
      console.log('\n📧 Login Credentials:');
      console.log('Email: test@peerscholar.com');
      console.log('Password: Test123!@#');
    } else {
      console.error('\n❌ Error creating test user:', err?.message || err);
    }
  }

  await app.close();
}

bootstrap();
