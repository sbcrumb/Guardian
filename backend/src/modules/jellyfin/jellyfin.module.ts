import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JellyfinController } from './controllers/jellyfin.controller';
import { JellyfinService } from './services/jellyfin.service';
import { JellyfinClient } from './services/jellyfin-client';
import { ConfigModule } from '../config/config.module';
import { DevicesModule } from '../devices/devices.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionHistory } from '../../entities/session-history.entity';
import { UserDevice } from '../../entities/user-device.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionHistory, UserDevice]),
    forwardRef(() => ConfigModule),
    forwardRef(() => DevicesModule),
    forwardRef(() => SessionsModule),
  ],
  controllers: [JellyfinController],
  providers: [JellyfinService, JellyfinClient],
  exports: [JellyfinService, JellyfinClient],
})
export class JellyfinModule {}