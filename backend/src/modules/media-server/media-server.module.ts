import { Module, forwardRef } from '@nestjs/common';
import { MediaServerController } from '../../controllers/media-server.controller';
import { MediaServerFactory } from '../../factories/media-server.factory';
import { PlexModule } from '../plex/plex.module';
import { JellyfinModule } from '../jellyfin/jellyfin.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    forwardRef(() => PlexModule),
    forwardRef(() => JellyfinModule),
    forwardRef(() => ConfigModule),
  ],
  controllers: [MediaServerController],
  providers: [MediaServerFactory],
  exports: [MediaServerFactory],
})
export class MediaServerModule {}