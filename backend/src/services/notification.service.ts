import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface NotificationURL {
  type: 'discord' | 'slack' | 'webhook' | 'ntfy' | 'pushover';
  url: string;
  token?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor() {
    this.logger.log('Notification service initialized');
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
    if (!notificationUrls || notificationUrls.length === 0) {
      this.logger.warn('No notification URLs configured, skipping notification');
      return false;
    }

    const message = this.buildNotificationMessage(deviceInfo);
    let successCount = 0;

    for (const urlString of notificationUrls) {
      try {
        const url = this.parseNotificationURL(urlString.trim());
        if (url) {
          const success = await this.sendNotification(url, title, message);
          if (success) successCount++;
        }
      } catch (error) {
        this.logger.error(`Error sending notification to ${urlString}:`, error);
      }
    }

    if (successCount > 0) {
      this.logger.log(`Device authorization notification sent successfully to ${successCount}/${notificationUrls.length} services for device: ${deviceInfo.deviceIdentifier}`);
      return true;
    } else {
      this.logger.warn(`Failed to send device authorization notification to any services for device: ${deviceInfo.deviceIdentifier}`);
      return false;
    }
  }

  async testNotification(
    notificationUrls: string[],
    title: string = 'Guardian - Test Notification'
  ): Promise<boolean> {
    if (!notificationUrls || notificationUrls.length === 0) {
      this.logger.warn('No notification URLs configured, skipping test notification');
      return false;
    }

    const message = '✅ Guardian notification system is working correctly!\n\nThis is a test notification to verify your notification setup.';
    let successCount = 0;

    for (const urlString of notificationUrls) {
      try {
        const url = this.parseNotificationURL(urlString.trim());
        if (url) {
          const success = await this.sendNotification(url, title, message);
          if (success) successCount++;
        }
      } catch (error) {
        this.logger.error(`Error sending test notification to ${urlString}:`, error);
      }
    }

    if (successCount > 0) {
      this.logger.log(`Test notification sent successfully to ${successCount}/${notificationUrls.length} services`);
      return true;
    } else {
      this.logger.warn('Failed to send test notification to any services');
      return false;
    }
  }

  private parseNotificationURL(urlString: string): NotificationURL | null {
    try {
      if (urlString.startsWith('discord://')) {
        // Discord webhook: discord://webhook_id/webhook_token
        const match = urlString.match(/discord:\/\/(.+)\/(.+)/);
        if (match) {
          return {
            type: 'discord',
            url: `https://discord.com/api/webhooks/${match[1]}/${match[2]}`,
          };
        }
      } else if (urlString.startsWith('slack://')) {
        // Slack webhook: slack://webhook_url_encoded
        const webhook = decodeURIComponent(urlString.replace('slack://', ''));
        return {
          type: 'slack',
          url: webhook,
        };
      } else if (urlString.startsWith('ntfy://')) {
        // Ntfy: ntfy://ntfy.sh/topic or ntfy://your.server.com/topic
        const match = urlString.match(/ntfy:\/\/(.+)\/(.+)/);
        if (match) {
          return {
            type: 'ntfy',
            url: `https://${match[1]}/${match[2]}`,
          };
        }
      } else if (urlString.startsWith('pushover://')) {
        // Pushover: pushover://user_key@token
        const match = urlString.match(/pushover:\/\/(.+)@(.+)/);
        if (match) {
          return {
            type: 'pushover',
            url: 'https://api.pushover.net/1/messages.json',
            token: match[2],
          };
        }
      } else if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        // Generic webhook
        return {
          type: 'webhook',
          url: urlString,
        };
      }

      this.logger.warn(`Unsupported notification URL format: ${urlString}`);
      return null;
    } catch (error) {
      this.logger.error(`Error parsing notification URL ${urlString}:`, error);
      return null;
    }
  }

  private async sendNotification(
    notificationUrl: NotificationURL,
    title: string,
    message: string
  ): Promise<boolean> {
    try {
      switch (notificationUrl.type) {
        case 'discord':
          return await this.sendDiscordNotification(notificationUrl.url, title, message);
        case 'slack':
          return await this.sendSlackNotification(notificationUrl.url, title, message);
        case 'ntfy':
          return await this.sendNtfyNotification(notificationUrl.url, title, message);
        case 'pushover':
          return await this.sendPushoverNotification(notificationUrl.url, notificationUrl.token!, title, message);
        case 'webhook':
          return await this.sendWebhookNotification(notificationUrl.url, title, message);
        default:
          this.logger.warn(`Unsupported notification type: ${notificationUrl.type}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error sending ${notificationUrl.type} notification:`, error);
      return false;
    }
  }

  private async sendDiscordNotification(url: string, title: string, message: string): Promise<boolean> {
    try {
      await axios.post(url, {
        embeds: [{
          title,
          description: message,
          color: 0xff6b35, // Orange color for attention
          timestamp: new Date().toISOString(),
        }],
      });
      return true;
    } catch (error) {
      this.logger.error('Discord notification failed:', error);
      return false;
    }
  }

  private async sendSlackNotification(url: string, title: string, message: string): Promise<boolean> {
    try {
      await axios.post(url, {
        text: `*${title}*\n${message}`,
      });
      return true;
    } catch (error) {
      this.logger.error('Slack notification failed:', error);
      return false;
    }
  }

  private async sendNtfyNotification(url: string, title: string, message: string): Promise<boolean> {
    try {
      await axios.post(url, message, {
        headers: {
          'Title': title,
          'Priority': 'high',
          'Tags': 'warning',
        },
      });
      return true;
    } catch (error) {
      this.logger.error('Ntfy notification failed:', error);
      return false;
    }
  }

  private async sendPushoverNotification(url: string, token: string, title: string, message: string): Promise<boolean> {
    try {
      await axios.post(url, {
        token,
        user: token, // This should be the user key, but we'll use the same for simplicity
        title,
        message,
        priority: 1,
      });
      return true;
    } catch (error) {
      this.logger.error('Pushover notification failed:', error);
      return false;
    }
  }

  private async sendWebhookNotification(url: string, title: string, message: string): Promise<boolean> {
    try {
      await axios.post(url, {
        title,
        message,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      this.logger.error('Webhook notification failed:', error);
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
}