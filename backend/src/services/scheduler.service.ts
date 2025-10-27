import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MediaServerFactory } from '../factories/media-server.factory';
import { ConfigService } from '../modules/config/services/config.service';
import { DeviceTrackingService } from '../modules/devices/services/device-tracking.service';
import { UsersService } from '../modules/users/services/users.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly mediaServerFactory: MediaServerFactory,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
    private readonly deviceTrackingService: DeviceTrackingService,
    private readonly usersService: UsersService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('Scheduler service initialized with cron jobs');
    await this.setupDynamicSessionUpdatesCron();

    // Set up config change listener to update cron expression when interval changes
    this.configService.addConfigChangeListener(
      'PLEXGUARD_REFRESH_INTERVAL',
      async () => {
        this.logger.log(
          'Refresh interval changed, updating cron expression...',
        );
        await this.setupDynamicSessionUpdatesCron();
      },
    );

    // Perform tasks on startup
    await this.handleSessionUpdates();
    await this.performDeviceCleanup();
    await this.syncMediaServerUsers();
  }

  private async setupDynamicSessionUpdatesCron() {
    try {
      // Get the current refresh interval from config
      const refreshInterval = await this.configService.getSetting(
        'PLEXGUARD_REFRESH_INTERVAL',
      );
      const intervalSeconds = parseInt(refreshInterval as string, 10) || 10;

      // Convert seconds to cron expression
      const cronExpression = this.secondsToCronExpression(intervalSeconds);

      // Remove existing job if it exists (e.g when interval changes)
      try {
        this.schedulerRegistry.deleteCronJob('sessionUpdates');
      } catch (error) {
        // Job doesn't exist yet, which is fine
      }

      // Create new cron job with dynamic expression
      const job = new CronJob(cronExpression, async () => {
        await this.handleSessionUpdates();
      });

      // Add job to scheduler registry
      this.schedulerRegistry.addCronJob('sessionUpdates', job);
      job.start();

      this.logger.log(
        `Session updates scheduled with ${intervalSeconds}s interval (${cronExpression})`,
      );
    } catch (error) {
      this.logger.error(
        'Error setting up dynamic session updates cron:',
        error,
      );
    }
  }

  private secondsToCronExpression(seconds: number): string {
    if (seconds < 60) {
      // For intervals less than 60 seconds, use second-based cron
      return `*/${seconds} * * * * *`;
    } else if (seconds % 60 === 0) {
      // For minute intervals
      const minutes = seconds / 60;
      if (minutes < 60) {
        return `0 */${minutes} * * * *`;
      } else if (minutes % 60 === 0) {
        // For hour intervals
        const hours = minutes / 60;
        return `0 0 */${hours} * * *`;
      }
    }

    // Default to every 10 seconds if invalid input
    this.logger.warn(
      `Invalid refresh interval (${seconds}s), defaulting to 10s`,
    );
    return '*/10 * * * * *';
  }

  private async handleSessionUpdates() {
    try {
      // Check if media server is properly configured before attempting to update sessions
      const serverType = await this.mediaServerFactory.getServerType();
      const config = await this.mediaServerFactory.getMediaServerConfig();

      if (!config.serverIp || !config.serverPort || !config.token) {
        this.logger.debug(`Skipping session update - ${serverType} not configured`);
        return;
      }

      const service = await this.mediaServerFactory.createService();
      await service.updateActiveSessions();
    } catch (error) {
      // Only log errors that are not configuration-related
      if (!error.message.includes('Missing required') && !error.message.includes('configuration')) {
        this.logger.error('Error during scheduled session update:', error);
      }
    }
  }

  private async performDeviceCleanup() {
    try {
      const [cleanupEnabled, cleanupIntervalDays] = await Promise.all([
        this.configService.getSetting('DEVICE_CLEANUP_ENABLED'),
        this.configService.getSetting('DEVICE_CLEANUP_INTERVAL_DAYS'),
      ]);

      // getSetting returns actual boolean for boolean type settings, not string
      const isEnabled = cleanupEnabled === true;
      let intervalDays = parseInt(cleanupIntervalDays as string, 10);

      if (!isEnabled) {
        this.logger.debug(`Skipping device cleanup - feature is disabled`);
        return;
      }

      this.logger.log(
        `Running device cleanup for devices inactive for ${intervalDays} days...`,
      );
      await this.deviceTrackingService.cleanupInactiveDevices(intervalDays);
    } catch (error) {
      this.logger.error('Error during device cleanup:', error);
    }
  }

  // Clean up inactive devices daily at 2 AM
  @Cron('0 0 2 * * *', {
    name: 'deviceCleanup',
  })
  async handleDeviceCleanup() {
    try {
      const cleanupEnabled = await this.configService.getSetting(
        'DEVICE_CLEANUP_ENABLED',
      );
      const isEnabled = cleanupEnabled === true;

      if (!isEnabled) {
        this.logger.debug(
          'Device cleanup is disabled - skipping scheduled cleanup',
        );
        return;
      }

      this.logger.log('Running scheduled device cleanup...');
      await this.performDeviceCleanup();
    } catch (error) {
      this.logger.error('Error during scheduled device cleanup:', error);
    }
  }

  // Sync media server users every hour
  @Cron('0 0 * * * *', {
    name: 'syncMediaServerUsers',
  })
  async handleMediaServerUserSync() {
    await this.syncMediaServerUsers();
  }

  private async syncMediaServerUsers() {
    try {
      const serverType = await this.mediaServerFactory.getServerType();
      const config = await this.mediaServerFactory.getMediaServerConfig();

      if (!config.token) {
        this.logger.debug(
          `Skipping ${serverType} users sync - authentication not configured`,
        );
        return;
      }

      // Currently only Plex supports user sync from external API
      if (serverType === 'plex') {
        this.logger.log('Syncing Plex Home users from Plex.tv...');
        const result = await this.usersService.syncUsersFromPlexTV();
        this.logger.log(
          `Plex users sync completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`,
        );
      } else {
        this.logger.debug(
          `User sync not implemented for ${serverType} - skipping`,
        );
      }
    } catch (error) {
      this.logger.error('Error during media server users sync:', error);
    }
  }
}
