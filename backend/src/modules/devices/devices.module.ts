import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DeviceTrackingService } from './services/device-tracking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDevice } from '../../entities/user-device.entity';
import { UsersModule } from '../users/users.module';
import { NotificationService } from '../../services/notification.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserDevice]), UsersModule, ConfigModule],
  controllers: [DevicesController],
  providers: [DeviceTrackingService, NotificationService],
  exports: [DeviceTrackingService],
})
export class DevicesModule {}
