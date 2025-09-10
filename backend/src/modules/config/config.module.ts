import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './services/config.service';
import { AppSettings } from '../../entities/app-settings.entity';
import { NotificationService } from '../../services/notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppSettings])],
  controllers: [ConfigController],
  providers: [ConfigService, NotificationService],
  exports: [ConfigService],
})
export class ConfigModule {}
