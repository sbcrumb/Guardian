import { Controller, Get, Post, Param, Res, Query, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { MediaServerFactory } from '../factories/media-server.factory';

@Controller('media-server')
export class MediaServerController {
  private readonly logger = new Logger(MediaServerController.name);

  constructor(private readonly mediaServerFactory: MediaServerFactory) {}

  @Get('sessions')
  async getSessions() {
    try {
      const service = await this.mediaServerFactory.createService();
      return await service.getActiveSessions();
    } catch (error) {
      this.logger.error('Failed to get sessions:', error);
      throw error;
    }
  }

  @Get('sessions/update')
  async updateSessions() {
    try {
      const service = await this.mediaServerFactory.createService();
      return await service.updateActiveSessions();
    } catch (error) {
      this.logger.error('Failed to update sessions:', error);
      throw error;
    }
  }

  @Get('sessions/formatted')
  async getFormattedSessions() {
    try {
      const service = await this.mediaServerFactory.createService();
      return await service.getActiveSessionsWithMediaUrls();
    } catch (error) {
      this.logger.error('Failed to get formatted sessions:', error);
      throw error;
    }
  }

  @Get('web-url')
  async getWebUrl() {
    try {
      const service = await this.mediaServerFactory.createService();
      const webUrl = await service.getServerWebUrl();
      return { webUrl };
    } catch (error) {
      this.logger.error('Failed to get web URL:', error);
      return { webUrl: null, error: 'Failed to get web URL' };
    }
  }

  @Get('media/:type/:itemId')
  async getMedia(
    @Param('type') type: string,
    @Param('itemId') itemId: string,
    @Query('t') timestamp: string,
    @Query('index') index: string,
    @Res() res: Response,
  ) {
    try {
      if (!['thumb', 'art'].includes(type)) {
        return res
          .status(400)
          .json({ error: 'Invalid media type. Must be thumb or art.' });
      }

      const client = await this.mediaServerFactory.createClient();
      const serverType = await this.mediaServerFactory.getServerType();
      
      let endpoint: string;
      
      if (serverType === 'plex') {
        // Plex format: library/metadata/{ratingKey}/{type}[/{timestamp}]
        endpoint = `library/metadata/${itemId}/${type}`;
        if (timestamp) {
          endpoint += `/${timestamp}`;
        }
      } else if (serverType === 'jellyfin') {
        // Jellyfin format: Items/{itemId}/Images/{imageType}[/{index}]
        if (type === 'thumb') {
          endpoint = `Items/${itemId}/Images/Primary`;
        } else {
          endpoint = `Items/${itemId}/Images/Backdrop`;
          if (index) {
            endpoint += `/${index}`;
          } else {
            endpoint += '/0';
          }
        }
      } else {
        return res.status(400).json({ error: 'Unsupported media server type' });
      }

      const mediaBuffer = await client.requestMedia(endpoint);

      if (!mediaBuffer) {
        return res.status(404).json({ error: 'Media not found' });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Length', mediaBuffer.length);

      return res.send(mediaBuffer);
    } catch (error) {
      this.logger.error(
        `Failed to fetch ${type} for itemId ${itemId}:`,
        error,
      );
      return res.status(500).json({ error: 'Failed to fetch media' });
    }
  }

  @Post('sessions/:sessionId/terminate')
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Query('reason') reason?: string,
  ) {
    try {
      const client = await this.mediaServerFactory.createClient();
      await client.terminateSession(sessionId, reason);
      return { success: true, message: 'Session terminated' };
    } catch (error) {
      this.logger.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  @Get('test-connection')
  async testConnection() {
    try {
      const client = await this.mediaServerFactory.createClient();
      return await client.testConnection();
    } catch (error) {
      this.logger.error('Failed to test connection:', error);
      throw error;
    }
  }

  @Get('info')
  async getServerInfo() {
    try {
      const [serverType, config, client] = await Promise.all([
        this.mediaServerFactory.getServerType(),
        this.mediaServerFactory.getMediaServerConfig(),
        this.mediaServerFactory.createClient(),
      ]);

      const serverId = await client.getServerIdentity();

      return {
        serverType,
        serverId,
        config: {
          serverIp: config.serverIp,
          serverPort: config.serverPort,
          useSSL: config.useSSL,
          customUrl: config.customUrl,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get server info:', error);
      throw error;
    }
  }
}