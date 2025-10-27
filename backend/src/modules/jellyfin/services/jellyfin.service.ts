import { Injectable, Logger } from '@nestjs/common';
import { JellyfinClient } from './jellyfin-client';
import { SessionTerminationService } from '../../plex/services/session-termination.service';
import { SessionsResponse } from '../../../interfaces/media-server.interface';
import { DeviceTrackingService } from '../../devices/services/device-tracking.service';
import { ActiveSessionService } from '../../sessions/services/active-session.service';
import { ConfigService } from '../../config/services/config.service';
import { config } from '../../../config/app.config';
import { IMediaServerService } from '../../../interfaces/media-server.interface';

@Injectable()
export class JellyfinService implements IMediaServerService {
  private readonly logger = new Logger(JellyfinService.name);
  private serverIdentifierCache: string | null = null;
  private serverIdentifierPromise: Promise<string | null> | null = null;

  constructor(
    private readonly jellyfinClient: JellyfinClient,
    private readonly sessionTerminationService: SessionTerminationService,
    private readonly deviceTrackingService: DeviceTrackingService,
    private readonly activeSessionService: ActiveSessionService,
    private readonly configService: ConfigService,
  ) {}

  async getServerIdentifier(): Promise<string | null> {
    // Return cached value if available
    if (this.serverIdentifierCache) {
      return this.serverIdentifierCache;
    }

    // If there's already a request in progress, wait for it
    if (this.serverIdentifierPromise) {
      return this.serverIdentifierPromise;
    }

    // Create new request and cache the promise
    this.serverIdentifierPromise = this.jellyfinClient
      .getServerIdentity()
      .then((identifier) => {
        this.serverIdentifierCache = identifier;
        this.serverIdentifierPromise = null; // Clear the promise once resolved
        return identifier;
      })
      .catch((error) => {
        this.logger.error('Failed to get server identifier:', error);
        this.serverIdentifierPromise = null; // Clear the promise on error
        return null;
      });

    return this.serverIdentifierPromise;
  }

  async getActiveSessions(): Promise<SessionsResponse> {
    try {
      const [sessions, serverIdentifier] = await Promise.all([
        this.jellyfinClient.getSessions(),
        this.getServerIdentifier(),
      ]);

      // Check if media thumbnails and artwork are enabled
      const [enableThumbnails, enableArtwork] = await Promise.all([
        this.configService.getSetting('ENABLE_MEDIA_THUMBNAILS'),
        this.configService.getSetting('ENABLE_MEDIA_ARTWORK'),
      ]);

      // Add media URLs, server identifier, and device session count to session data
      if (sessions?.MediaContainer?.Metadata) {
        sessions.MediaContainer.Metadata = await Promise.all(
          sessions.MediaContainer.Metadata.map(async (session) => {
            let sessionCount = 0;

            // Get device session count if available
            if (session.Player?.machineIdentifier) {
              try {
                const device =
                  await this.deviceTrackingService.findDeviceByIdentifier(
                    session.Player.machineIdentifier,
                  );
                sessionCount = device?.sessionCount || 0;
              } catch (error) {
                this.logger.warn(
                  `Failed to get session count for device ${session.Player.machineIdentifier}:`,
                  error,
                );
              }
            }

            return {
              ...session,
              serverMachineIdentifier: serverIdentifier,
              thumbnailUrl:
                enableThumbnails && session.thumb
                  ? this.buildMediaUrl('thumb', session.thumb)
                  : undefined,
              artUrl:
                enableArtwork && session.art
                  ? this.buildMediaUrl('art', session.art)
                  : undefined,
              Session: {
                ...session.Session,
                sessionCount,
              },
            };
          }),
        );
      }

      return sessions;
    } catch (error: any) {
      this.logger.error('Error fetching sessions', error);
      throw error;
    }
  }

  private buildMediaUrl(type: 'thumb' | 'art', mediaPath: string): string {
    if (!mediaPath) return '';

    // For Jellyfin, the media path might be like /Items/{id}/Images/Primary or /Items/{id}/Images/Backdrop/0
    const pathMatch = mediaPath.match(/\/Items\/([^\/]+)\/Images\/(Primary|Backdrop)(?:\/(\d+))?/);

    if (!pathMatch) {
      this.logger.warn(`Invalid Jellyfin media path format: ${mediaPath}`);
      return '';
    }

    const [, itemId, imageType, imageIndex] = pathMatch;

    // Map Jellyfin image types to our types
    const mappedType = imageType === 'Primary' ? 'thumb' : 'art';
    
    // Build the proxy URL that points to our media controller
    let proxyUrl = `${config.api.baseUrl}/jellyfin/media/${mappedType}/${itemId}`;
    
    if (imageIndex) {
      proxyUrl += `?index=${imageIndex}`;
    }

    return proxyUrl;
  }

  async getServerWebUrl(): Promise<string> {
    try {
      // Check for custom URL first
      const customUrl = await this.configService.getSetting('CUSTOM_JELLYFIN_URL');
      if (customUrl && customUrl.trim()) {
        return customUrl.trim();
      }

      // Build URL from server configuration
      const [ip, port, useSSL] = await Promise.all([
        this.configService.getSetting('JELLYFIN_SERVER_IP'),
        this.configService.getSetting('JELLYFIN_SERVER_PORT'),
        this.configService.getSetting('USE_SSL'),
      ]);

      if (!ip || !port) {
        throw new Error('Jellyfin server IP and port not configured');
      }

      const protocol = useSSL === 'true' || useSSL === true ? 'https' : 'http';
      return `${protocol}://${ip}:${port}`;
    } catch (error) {
      this.logger.error('Error getting Jellyfin web URL:', error);
      throw error;
    }
  }

  async updateActiveSessions(): Promise<SessionsResponse> {
    try {
      const sessions = await this.getActiveSessions();

      // Update active sessions in database
      try {
        await this.activeSessionService.updateActiveSessions(sessions);
      } catch (sessionUpdateError) {
        this.logger.error(
          'Failed to update active sessions in database',
          sessionUpdateError,
        );
      }

      // Track devices from the sessions data
      try {
        await this.deviceTrackingService.processSessionsForDeviceTracking(
          sessions,
        );
      } catch (trackingError) {
        this.logger.error(
          'Failed to track devices from sessions',
          trackingError,
        );
      }

      // Stop unapproved sessions
      try {
        await this.sessionTerminationService.stopUnapprovedSessions(sessions);
      } catch (stopError) {
        this.logger.error('Failed to stop unapproved sessions', stopError);
      }

      return sessions;
    } catch (error: any) {
      this.logger.error('Error in updateActiveSessions', error);
      throw error;
    }
  }

  async getActiveSessionsWithMediaUrls(): Promise<any> {
    try {
      const sessions =
        await this.activeSessionService.getActiveSessionsFormatted();

      // Check if media thumbnails and artwork are enabled
      const [enableThumbnails, enableArtwork] = await Promise.all([
        this.configService.getSetting('ENABLE_MEDIA_THUMBNAILS'),
        this.configService.getSetting('ENABLE_MEDIA_ARTWORK'),
      ]);

      // Add media URLs to session data
      if (sessions?.MediaContainer?.Metadata) {
        sessions.MediaContainer.Metadata = sessions.MediaContainer.Metadata.map(
          (session) => {
            return {
              ...session,
              thumbnailUrl:
                enableThumbnails && session.thumb
                  ? this.buildMediaUrl('thumb', session.thumb)
                  : undefined,
              artUrl:
                enableArtwork && session.art
                  ? this.buildMediaUrl('art', session.art)
                  : undefined,
            };
          },
        );
      }

      return sessions;
    } catch (error: any) {
      this.logger.error('Error getting active sessions with media URLs', error);
      throw error;
    }
  }
}