import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app/app.module';

async function bootstrap() {
  try {
    console.log('Starting DI verification...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
      abortOnError: true,
    });
    console.log('Application context created successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('DI Verification Failed:', error);
    process.exit(1);
  }
}

bootstrap();
