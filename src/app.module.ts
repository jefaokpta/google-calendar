import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleModule } from './google/google.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleModule,
  ],
})
export class AppModule {}
