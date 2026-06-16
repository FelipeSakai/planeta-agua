import "reflect-metadata";

import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { env } from "./env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true
  });

  await app.listen(env.API_PORT);
}

void bootstrap();
