import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private apprise: any = null;
  private appriseInitialized = false;

  constructor() {
    this.initializeApprise();
  }

  private async initializeApprise() {
    try {
      // Use eval to avoid TypeScript compilation issues
      const Apprise = eval('require')('apprise');
      this.apprise = new Apprise();
      this.appriseInitialized = true;
      this.logger.log('Apprise notification service initialized');
    } catch (error) {
      this.logger.warn('Apprise module not available - notifications will be disabled');
      this.appriseInitialized = false;
    }
  }

  async sendDeviceAuthorizationNotification(
    deviceInfo: {
      username?: string;
      userId: string;
      deviceName?: string;
      devicePlatform?: string;
      deviceIdentifier: string;
      ipAddress?: string;
    },
    notificationUrls: string[],
    title: string = 'Guardian - Device Authorization Required'
  ): Promise<boolean> {
    if (!this.appriseInitialized || !this.apprise) {
      this.logger.warn('Apprise not initialized, skipping notification');
      return false;
    }

    try {
      // Clear any existing URLs
      this.apprise.clear();

      // Add notification URLs
      for (const url of notificationUrls) {
        if (url.trim()) {
          this.apprise.add(url.trim());
        }
      }

      const message = this.buildNotificationMessage(deviceInfo);

      const result = await this.apprise.notify({
        title,
        body: message,
      });

      if (result) {
        this.logger.log(`Device authorization notification sent successfully for device: ${deviceInfo.deviceIdentifier}`);
        return true;
      } else {
        this.logger.warn(`Failed to send device authorization notification for device: ${deviceInfo.deviceIdentifier}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Error sending device authorization notification:', error);
      return false;
    }
  }

  private buildNotificationMessage(deviceInfo: {
    username?: string;
    userId: string;
    deviceName?: string;
    devicePlatform?: string;
    deviceIdentifier: string;
    ipAddress?: string;
  }): string {
    const lines = [
      '🚨 New device requires authorization:',
      '',
      `👤 User: ${deviceInfo.username || deviceInfo.userId}`,
      `📱 Device: ${deviceInfo.deviceName || deviceInfo.deviceIdentifier}`,
      `🖥️ Platform: ${deviceInfo.devicePlatform || 'Unknown'}`,
    ];

    if (deviceInfo.ipAddress) {
      lines.push(`🌐 IP Address: ${deviceInfo.ipAddress}`);
    }

    lines.push('');
    lines.push('Please review and approve/reject this device in Guardian.');

    return lines.join('\n');
  }

  async testNotification(
    notificationUrls: string[],
    title: string = 'Guardian - Test Notification'
  ): Promise<boolean> {
    if (!this.appriseInitialized || !this.apprise) {
      this.logger.warn('Apprise not initialized, skipping test notification');
      return false;
    }

    try {
      // Clear any existing URLs
      this.apprise.clear();

      // Add notification URLs
      for (const url of notificationUrls) {
        if (url.trim()) {
          this.apprise.add(url.trim());
        }
      }

      const message = '✅ Guardian notification system is working correctly!';

      const result = await this.apprise.notify({
        title,
        body: message,
      });

      if (result) {
        this.logger.log('Test notification sent successfully');
        return true;
      } else {
        this.logger.warn('Failed to send test notification');
        return false;
      }
    } catch (error) {
      this.logger.error('Error sending test notification:', error);
      return false;
    }
  }
}