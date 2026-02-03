import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //chống input thừa
      forbidNonWhitelisted: true,
      transform: true, // chuyen payload thanh instance cua DTO
      transformOptions: {
        enableImplicitConversion: true, // ← Thêm option này
      }, //auto cast type (id: number)
      exceptionFactory: (errors) => {
        const formattedErrors = {};
        errors.forEach((err) => {
          formattedErrors[err.property] = Object.values(err.constraints || {});
        });

        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
