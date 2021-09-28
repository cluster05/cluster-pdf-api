import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import fetch from 'node-fetch';
import { ValidationPipe } from '@nestjs/common';

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  await app.listen(8080);
}
bootstrap();
