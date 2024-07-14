import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // setup swagger
  const config = new DocumentBuilder()
    .setTitle('Restaurant service  API')
    .setDescription('API documentation for Restaurant service app')
    .setVersion('1.0')
    .addTag('Restaurant service')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // handle all user input validation globally
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  const port = Number(process.env.PORT);
  console.log('Application started at port' + port);

  await app.listen(port);
}
bootstrap();
