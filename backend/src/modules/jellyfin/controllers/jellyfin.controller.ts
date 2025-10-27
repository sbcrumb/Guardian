import { Controller, Get, Param, Res, Query, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { JellyfinClient } from '../services/jellyfin-client';
import { JellyfinService } from '../services/jellyfin.service';

@Controller('jellyfin')
export class JellyfinController {
  private readonly logger = new Logger(JellyfinController.name);

  constructor(
    private readonly jellyfinClient: JellyfinClient,
    private readonly jellyfinService: JellyfinService,
  ) {}

  @Get('media/:type/:itemId')
  async getMedia(
    @Param('type') type: string, // 'thumb' or 'art'
    @Param('itemId') itemId: string,
    @Query('index') index: string,
    @Res() res: Response,
  ) {
    try {
      if (!['thumb', 'art'].includes(type)) {
        return res
          .status(400)
          .json({ error: 'Invalid media type. Must be thumb or art.' });
      }

      // Build the media endpoint for Jellyfin
      let endpoint: string;
      if (type === 'thumb') {
        endpoint = `Items/${itemId}/Images/Primary`;
      } else {
        // For artwork, use Backdrop
        endpoint = `Items/${itemId}/Images/Backdrop`;
        if (index) {
          endpoint += `/${index}`;
        } else {
          endpoint += '/0'; // Default to first backdrop
        }
      }

      const mediaBuffer = await this.jellyfinClient.requestMedia(endpoint);

      if (!mediaBuffer) {
        return res.status(404).json({ error: 'Media not found' });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
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

  @Get('web-url')
  async getJellyfinWebUrl() {
    try {
      const webUrl = await this.jellyfinService.getServerWebUrl();
      return { webUrl };
    } catch (error) {
      this.logger.error('Failed to get Jellyfin web URL:', error);
      return { webUrl: null, error: 'Failed to get Jellyfin web URL' };
    }
  }
}