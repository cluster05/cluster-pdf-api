import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import fetch from 'node-fetch';

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
