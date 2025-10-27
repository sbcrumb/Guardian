import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { ConfigService } from '../../config/services/config.service';
import { IMediaServerClient, ConnectionResponse } from '../../../interfaces/media-server.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionHistory } from '../../../entities/session-history.entity';
import { UserDevice } from '../../../entities/user-device.entity';

@Injectable()
export class JellyfinClient implements IMediaServerClient {
  private readonly logger = new Logger(JellyfinClient.name);

  constructor(
    @Inject(forwardRef(() => ConfigService))
    private configService: ConfigService,
    @InjectRepository(SessionHistory)
    private sessionHistoryRepository: Repository<SessionHistory>,
    @InjectRepository(UserDevice)
    private userDeviceRepository: Repository<UserDevice>,
  ) {}

  private async getConfig() {
    const [ip, port, token, useSSL, ignoreCertErrors] = await Promise.all([
      this.configService.getSetting('JELLYFIN_SERVER_IP'),
      this.configService.getSetting('JELLYFIN_SERVER_PORT'),
      this.configService.getSetting('JELLYFIN_API_KEY'),
      this.configService.getSetting('USE_SSL'),
      this.configService.getSetting('IGNORE_CERT_ERRORS'),
    ]);


    return {
      ip: ip as string,
      port: port as string,
      token: token as string,
      useSSL: useSSL as boolean,
      ignoreCertErrors: ignoreCertErrors as boolean,
    };
  }

  private async validateConfiguration() {
    const { ip, port, token } = await this.getConfig();

    if (!ip || !port || !token) {
      throw new Error(
        'Missing required Jellyfin configuration. Please configure JELLYFIN_SERVER_IP, JELLYFIN_SERVER_PORT, and JELLYFIN_API_KEY in settings.',
      );
    }
  }

  async request(
    endpoint: string,
    options: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    } = {},
  ): Promise<any> {
    await this.validateConfiguration();
    const { ip, port, token, useSSL, ignoreCertErrors } = await this.getConfig();
    const baseUrl = `${useSSL ? 'https' : 'http'}://${ip}:${port}`;
    

    return new Promise((resolve, reject) => {
      const cleanEndpoint = endpoint.startsWith('/')
        ? endpoint.slice(1)
        : endpoint;
      
      const fullUrl = `${baseUrl}/${cleanEndpoint}`;
      const urlObj = new URL(fullUrl);

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          'X-Emby-Client': 'Guardian',
          'X-Emby-Client-Version': '1.0.0',
          'X-Emby-Device-Id': 'guardian-device',
          'X-Emby-Device-Name': 'Guardian',
          'Authorization': `MediaBrowser Token=${token}`,
          ...options.headers,
        },
        rejectUnauthorized: !ignoreCertErrors,
      };

      const httpModule = useSSL ? https : http;

      const req = httpModule.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = data ? JSON.parse(data) : {};
              resolve({
                ok: true,
                status: res.statusCode,
                json: () => jsonData,
                text: () => data,
              });
            } catch (parseError) {
              resolve({
                ok: true,
                status: res.statusCode,
                json: () => ({}),
                text: () => data,
              });
            }
          } else {
            const error = new Error(
              `HTTP ${res.statusCode}: ${res.statusMessage} - ${data}`,
            );
            this.logger.error(`Request failed for ${fullUrl}:`, error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`Request failed for ${fullUrl}:`, error);
        reject(error);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  async requestMedia(endpoint: string): Promise<Buffer | null> {
    await this.validateConfiguration();
    const { ip, port, token, useSSL, ignoreCertErrors } = await this.getConfig();
    const baseUrl = `${useSSL ? 'https' : 'http'}://${ip}:${port}`;

    return new Promise((resolve, reject) => {
      const cleanEndpoint = endpoint.startsWith('/')
        ? endpoint.slice(1)
        : endpoint;
      
      const fullUrl = `${baseUrl}/${cleanEndpoint}`;
      const urlObj = new URL(fullUrl);

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'X-Emby-Client': 'Guardian',
          'Authorization': `MediaBrowser Token=${token}`,
        },
        rejectUnauthorized: !ignoreCertErrors,
      };

      const httpModule = useSSL ? https : http;

      const req = httpModule.request(requestOptions, (res) => {
        if (res.statusCode !== 200) {
          this.logger.warn(
            `Media request failed with status ${res.statusCode} for ${endpoint}`,
          );
          return resolve(null);
        }

        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });

      req.on('error', (error) => {
        this.logger.error(`Error requesting media ${endpoint}:`, error);
        resolve(null);
      });

      req.setTimeout(10000, () => {
        this.logger.warn(`Timeout requesting media ${endpoint}`);
        req.destroy();
        resolve(null);
      });

      req.end();
    });
  }

  async getServerIdentity(): Promise<string | null> {
    try {
      const response = await this.request('System/Info');
      const data = await response.json();
      return data?.Id || null;
    } catch (error) {
      this.logger.error('Error getting server identity:', error);
      return null;
    }
  }

  async getSessions(): Promise<any> {
    const response = await this.request('Sessions');
    const sessions = await response.json();
    
    // Transform Jellyfin sessions to match Plex structure
    const transformedSessions = {
      MediaContainer: {
        size: sessions.length || 0,
        Metadata: sessions.map((session: any) => ({
          sessionKey: session.Id,
          User: {
            id: session.UserId,
            uuid: session.UserId,
            title: session.UserName,
            thumb: session.UserPrimaryImageTag ? `/Users/${session.UserId}/Images/Primary` : undefined,
          },
          Player: {
            machineIdentifier: session.DeviceId,
            platform: session.Client,
            platformVersion: session.ApplicationVersion,
            product: session.Client,
            title: session.DeviceName,
            version: session.ApplicationVersion,
            device: session.DeviceName,
            userAgent: session.Client,
            address: session.RemoteEndPoint?.split(':')[0],
            state: session.PlayState?.IsPaused ? 'paused' : 'playing',
          },
          Session: {
            id: session.Id,
            bandwidth: session.TranscodingInfo?.Bitrate,
            location: session.IsLocal ? 'lan' : 'wan',
          },
          Media: session.TranscodingInfo ? [{
            videoResolution: session.TranscodingInfo.VideoCodec,
            bitrate: session.TranscodingInfo.Bitrate,
            container: session.TranscodingInfo.Container,
            videoCodec: session.TranscodingInfo.VideoCodec,
            audioCodec: session.TranscodingInfo.AudioCodec,
          }] : [],
          title: session.NowPlayingItem?.Name,
          grandparentTitle: session.NowPlayingItem?.SeriesName,
          parentTitle: session.NowPlayingItem?.SeasonName,
          year: session.NowPlayingItem?.ProductionYear,
          duration: session.NowPlayingItem?.RunTimeTicks ? Math.floor(session.NowPlayingItem.RunTimeTicks / 10000) : undefined,
          viewOffset: session.PlayState?.PositionTicks ? Math.floor(session.PlayState.PositionTicks / 10000) : undefined,
          type: session.NowPlayingItem?.Type,
          thumb: session.NowPlayingItem?.ImageTags?.Primary ? `/Items/${session.NowPlayingItem.Id}/Images/Primary` : undefined,
          art: session.NowPlayingItem?.BackdropImageTags?.[0] ? `/Items/${session.NowPlayingItem.Id}/Images/Backdrop/0` : undefined,
        })),
      },
    };

    return transformedSessions;
  }

  async getUsers(): Promise<any> {
    try {
      const response = await this.request('Users');
      return await response.text();
    } catch (error) {
      this.logger.error('Error in getUsers:', error);
      throw error;
    }
  }

  async terminateSession(
    sessionId: string,
    reason: string = 'Session terminated',
  ): Promise<void> {
    if (!sessionId) {
      this.logger.warn('No session ID provided for termination');
      return;
    }

    try {
      await this.request(`Sessions/${sessionId}/Playing/Stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Reason: reason }),
      });

      this.logger.log(
        `Terminate session requested to Jellyfin for ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  async testConnection(): Promise<ConnectionResponse> {
    try {
      await this.validateConfiguration();
      const response = await this.request('System/Info');

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
        };
      } else {
        return {
          success: false,
          message: `Jellyfin server returned error: ${response.status}`,
          code: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      this.logger.error('Connection test failed:', error);

      // Handle timeout errors
      if (error.message && error.message.includes('Request timeout')) {
        return {
          success: false,
          message: 'Connection timeout: Jellyfin server is not responding',
          code: 'CONNECTION_TIMEOUT',
          suggestion: 'Check if Jellyfin is running and accessible at the configured address',
        };
      }

      // Handle connection reset/refused errors  
      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Connection refused: Unable to connect to Jellyfin server',
          code: 'CONNECTION_REFUSED',
          suggestion: 'Verify the IP address, port, and that Jellyfin is running',
        };
      }

      // Handle specific SSL/TLS errors
      if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
        return {
          success: false,
          message: 'SSL certificate error: Hostname/IP does not match certificate',
          code: 'CERT_ERROR',
          suggestion: 'Enable "Ignore SSL certificate errors" or use HTTP instead',
        };
      }

      if (error.code && error.code.startsWith('ERR_TLS_')) {
        return {
          success: false,
          message: 'SSL/TLS connection error',
          code: 'SSL_ERROR',
          suggestion: 'Consider enabling "Ignore SSL certificate errors" or using HTTP',
        };
      }

      // Handle connection refused/unreachable
      if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
        return {
          success: false,
          message: 'Jellyfin server is unreachable',
          code: 'CONNECTION_REFUSED',
          suggestion: 'Check if Jellyfin server is running and accessible',
        };
      }

      // Handle timeout errors
      if (
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message.includes('timeout') ||
        error.message === 'Request timeout'
      ) {
        return {
          success: false,
          message: 'Connection timeout',
          code: 'CONNECTION_TIMEOUT',
          suggestion: 'Check server address, port and network settings',
        };
      }

      // Handle authentication errors
      if (
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      ) {
        return {
          success: false,
          message: 'Authentication failed',
          code: 'AUTH_FAILED',
          suggestion: 'Check your Jellyfin API key',
        };
      }

      return {
        success: false,
        message: 'Connection failed',
        code: 'NETWORK_ERROR',
        suggestion: error.message,
      };
    }
  }
}