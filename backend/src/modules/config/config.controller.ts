import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Post,
  HttpException,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ConfigService } from './services/config.service';
import { NotificationService } from '../../services/notification.service';

@Controller('config')
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  async getAllSettings() {
    try {
      return await this.configService.getPublicSettings();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    try {
      const value = await this.configService.getSetting(key);
      if (value === null) {
        throw new HttpException('Setting not found', HttpStatus.NOT_FOUND);
      }
      return { key, value };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch setting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':key')
  async updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
    try {
      const updated = await this.configService.updateSetting(key, body.value);
      return { message: 'Setting updated successfully', setting: updated };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update setting',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put()
  async updateMultipleSettings(@Body() settings: any[]) {
    try {
      const updated = await this.configService.updateMultipleSettings(settings);
      return {
        message: 'Settings updated successfully',
        settings: updated,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update settings',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('test-plex-connection')
  async testPlexConnection() {
    try {
      const result = await this.configService.testPlexConnection();
      return result;
    } catch (error) {
      throw new HttpException(
        'Failed to test connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('plex/status')
  async getPlexStatus() {
    try {
      const status = await this.configService.getPlexConfigurationStatus();
      return status;
    } catch (error) {
      throw new HttpException(
        'Failed to get Plex status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('database/export')
  async exportDatabase(@Res() res: Response) {
    try {
      const exportData = await this.configService.exportDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `guardian-backup-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      throw new HttpException(
        'Failed to export database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('database/import')
  @UseInterceptors(FileInterceptor('file'))
  async importDatabase(@UploadedFile() file: any) {
    try {
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      const fileContent = file.buffer.toString('utf8');
      let importData;
      
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new HttpException('Invalid JSON file', HttpStatus.BAD_REQUEST);
      }

      const result = await this.configService.importDatabase(importData);
      return {
        message: 'Database imported successfully',
        imported: result,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to import database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('notifications')
  async updateNotificationSettings(@Body() body: {
    notificationsEnabled?: boolean;
    notificationUrls?: string;
    notificationTitle?: string;
  }): Promise<{ message: string }> {
    await this.configService.updateNotificationSettings(body);
    return { message: 'Notification settings updated successfully' };
  }

  @Get('notifications')
  async getNotificationSettings(): Promise<{
    notificationsEnabled: boolean;
    notificationUrls?: string;
    notificationTitle: string;
  }> {
    const settings = await this.configService.getSettings();
    return {
      notificationsEnabled: settings.notificationsEnabled || false,
      notificationUrls: settings.notificationUrls || '',
      notificationTitle: settings.notificationTitle || 'Guardian - Device Authorization Required',
    };
  }

  @Post('notifications/test')
  async testNotifications(@Body() body: {
    notificationUrls: string;
    notificationTitle?: string;
  }): Promise<{ message: string; success: boolean }> {
    try {
      const notificationUrls = JSON.parse(body.notificationUrls || '[]');
      
      const success = await this.notificationService.testNotification(
        notificationUrls,
        body.notificationTitle || 'Guardian - Test Notification'
      );

      return {
        message: success ? 'Test notification sent successfully' : 'Failed to send test notification',
        success
      };
    } catch (error) {
      return {
        message: `Error sending test notification: ${(error as Error).message}`,
        success: false
      };
    }
  }
}
