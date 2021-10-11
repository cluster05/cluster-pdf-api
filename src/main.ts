import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import fetch from 'node-fetch';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

const PORT = process.env.PORT || 8000;

const logger = new Logger('Application');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    allowedHeaders: process.env.ALLOW_HEADER,
  });
  app.use(helmet());

  logger.log('Application Running on PORT : ' + PORT);
  await app.listen(PORT);
}

bootstrap();
