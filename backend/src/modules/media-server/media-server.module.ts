import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaServerController } from '../../controllers/media-server.controller';
import { MediaServerFactory } from '../../factories/media-server.factory';
import { SessionTerminationService } from '../plex/services/session-termination.service';
import { PlexModule } from '../plex/plex.module';
import { JellyfinModule } from '../jellyfin/jellyfin.module';
import { ConfigModule } from '../config/config.module';
import { DevicesModule } from '../devices/devices.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserDevice } from '../../entities/user-device.entity';
import { SessionHistory } from '../../entities/session-history.entity';
import { UserPreference } from '../../entities/user-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDevice, SessionHistory, UserPreference]),
    forwardRef(() => PlexModule),
    forwardRef(() => JellyfinModule),
    forwardRef(() => ConfigModule),
    forwardRef(() => DevicesModule),
    forwardRef(() => SessionsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MediaServerController],
  providers: [MediaServerFactory, SessionTerminationService],
  exports: [MediaServerFactory, SessionTerminationService],
})
export class MediaServerModule {}