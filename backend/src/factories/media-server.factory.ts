import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../modules/config/services/config.service';
import { IMediaServerClient, IMediaServerService, MediaServerType } from '../interfaces/media-server.interface';
import { PlexClient } from '../modules/plex/services/plex-client';
import { PlexService } from '../modules/plex/services/plex.service';
import { JellyfinClient } from '../modules/jellyfin/services/jellyfin-client';
import { JellyfinService } from '../modules/jellyfin/services/jellyfin.service';

@Injectable()
export class MediaServerFactory {
  private readonly logger = new Logger(MediaServerFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly plexClient: PlexClient,
    private readonly plexService: PlexService,
    private readonly jellyfinClient: JellyfinClient,
    private readonly jellyfinService: JellyfinService,
  ) {}

  async getServerType(): Promise<MediaServerType> {
    const serverType = process.env.MEDIA_SERVER_TYPE || 
                      await this.configService.getSetting('MEDIA_SERVER_TYPE') || 
                      'plex';
    
    if (!['plex', 'jellyfin', 'emby'].includes(serverType)) {
      this.logger.warn(`Invalid server type: ${serverType}, defaulting to plex`);
      return 'plex';
    }

    return serverType as MediaServerType;
  }

  async createClient(): Promise<IMediaServerClient> {
    const serverType = await this.getServerType();
    
    switch (serverType) {
      case 'jellyfin':
        this.logger.debug('Using Jellyfin client');
        return this.jellyfinClient;
      case 'plex':
        this.logger.debug('Using Plex client');
        return this.plexClient;
      case 'emby':
        // TODO: Implement Emby client
        throw new Error('Emby support not yet implemented');
      default:
        throw new Error(`Unsupported server type: ${serverType}`);
    }
  }

  async createService(): Promise<IMediaServerService> {
    const serverType = await this.getServerType();
    
    switch (serverType) {
      case 'jellyfin':
        this.logger.debug('Using Jellyfin service');
        return this.jellyfinService;
      case 'plex':
        this.logger.debug('Using Plex service');
        return this.plexService;
      case 'emby':
        // TODO: Implement Emby service
        throw new Error('Emby support not yet implemented');
      default:
        throw new Error(`Unsupported server type: ${serverType}`);
    }
  }

  async getMediaServerConfig() {
    const serverType = await this.getServerType();
    
    switch (serverType) {
      case 'plex':
        return {
          serverType: 'plex' as MediaServerType,
          serverIp: await this.configService.getSetting('PLEX_SERVER_IP') as string,
          serverPort: await this.configService.getSetting('PLEX_SERVER_PORT') as string,
          token: await this.configService.getSetting('PLEX_TOKEN') as string,
          useSSL: await this.configService.getSetting('USE_SSL') as boolean,
          ignoreCertErrors: await this.configService.getSetting('IGNORE_CERT_ERRORS') as boolean,
          customUrl: await this.configService.getSetting('CUSTOM_PLEX_URL') as string,
        };
      case 'jellyfin':
        return {
          serverType: 'jellyfin' as MediaServerType,
          serverIp: await this.configService.getSetting('JELLYFIN_SERVER_IP') as string,
          serverPort: await this.configService.getSetting('JELLYFIN_SERVER_PORT') as string,
          token: await this.configService.getSetting('JELLYFIN_API_KEY') as string,
          useSSL: await this.configService.getSetting('USE_SSL') as boolean,
          ignoreCertErrors: await this.configService.getSetting('IGNORE_CERT_ERRORS') as boolean,
          customUrl: await this.configService.getSetting('CUSTOM_JELLYFIN_URL') as string,
        };
      default:
        throw new Error(`Unsupported server type: ${serverType}`);
    }
  }
}