import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlexService } from './services/plex.service';
import { PlexClient } from './services/plex-client';
import { UserDevice } from '../../entities/user-device.entity';
import { SessionHistory } from '../../entities/session-history.entity';
import { UserPreference } from '../../entities/user-preference.entity';
import { DevicesModule } from '../devices/devices.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '../config/config.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlexController } from './controllers/plex.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDevice, SessionHistory, UserPreference]),
    forwardRef(() => DevicesModule),
    forwardRef(() => SessionsModule),
    forwardRef(() => UsersModule),
    ConfigModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PlexController],
  providers: [PlexService, PlexClient],
  exports: [PlexService, PlexClient],
})
export class PlexModule {}
