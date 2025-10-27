export interface SessionsResponse {
  MediaContainer?: {
    size?: number;
    Metadata?: MediaSession[];
  };
}

export interface MediaSession {
  sessionKey?: string;
  User?: {
    id?: string;
    uuid?: string;
    title?: string;
    thumb?: string;
  };
  Player?: {
    machineIdentifier?: string;
    platform?: string;
    platformVersion?: string;
    product?: string;
    title?: string;
    version?: string;
    device?: string;
    userAgent?: string;
    address?: string;
    state?: 'playing' | 'paused' | 'buffering';
  };
  Session?: {
    id?: string;
    bandwidth?: number;
    location?: 'lan' | 'wan';
    sessionCount?: number;
  };
  Media?: Array<{
    videoResolution?: string;
    bitrate?: number;
    container?: string;
    videoCodec?: string;
    audioCodec?: string;
  }>;
  title?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  duration?: number;
  viewOffset?: number;
  type?: string;
  thumb?: string;
  art?: string;
  serverMachineIdentifier?: string;
  thumbnailUrl?: string;
  artUrl?: string;
}

export interface ConnectionResponse {
  success: boolean;
  message: string;
  code?: string;
  suggestion?: string;
}

export interface IMediaServerClient {
  /**
   * Get active sessions from the media server
   */
  getSessions(): Promise<any>;

  /**
   * Get the server's unique identifier
   */
  getServerIdentity(): Promise<string | null>;

  /**
   * Terminate a session on the media server
   */
  terminateSession(sessionId: string, reason?: string): Promise<void>;

  /**
   * Test connection to the media server
   */
  testConnection(): Promise<ConnectionResponse>;

  /**
   * Request media content (thumbnails, artwork)
   */
  requestMedia(endpoint: string): Promise<Buffer | null>;

  /**
   * Get users from the media server
   */
  getUsers(): Promise<any>;
}

export interface IMediaServerService {
  /**
   * Get active sessions with enriched data
   */
  getActiveSessions(): Promise<SessionsResponse>;

  /**
   * Update active sessions and perform all related operations
   */
  updateActiveSessions(): Promise<SessionsResponse>;

  /**
   * Get the web URL for accessing the media server
   */
  getServerWebUrl(): Promise<string>;

  /**
   * Get active sessions formatted with media URLs
   */
  getActiveSessionsWithMediaUrls(): Promise<any>;

  /**
   * Get the server's unique identifier
   */
  getServerIdentifier(): Promise<string | null>;
}

export type MediaServerType = 'plex' | 'jellyfin' | 'emby';

export interface MediaServerConfig {
  serverType: MediaServerType;
  serverIp: string;
  serverPort: string;
  token: string;
  useSSL: boolean;
  ignoreCertErrors: boolean;
  customUrl?: string;
}