export const config = {
  app: {
    port: '3001',
    environment: process.env.NODE_ENV || 'development',
  },
  api: {
    baseUrl: '/api/pg',
  },
  database: {
    path: process.env.DATABASE_PATH || 'plex-guard.db',
    logging: process.env.NODE_ENV === 'development',
  },
  mediaServer: {
    type: process.env.MEDIA_SERVER_TYPE || 'plex',
    plex: {
      serverIp: process.env.PLEX_SERVER_IP,
      serverPort: process.env.PLEX_SERVER_PORT || '32400',
      token: process.env.PLEX_TOKEN,
      customUrl: process.env.CUSTOM_PLEX_URL,
    },
    jellyfin: {
      serverIp: process.env.JELLYFIN_SERVER_IP,
      serverPort: process.env.JELLYFIN_SERVER_PORT || '8096',
      apiKey: process.env.JELLYFIN_API_KEY,
      customUrl: process.env.CUSTOM_JELLYFIN_URL,
    },
    common: {
      useSSL: process.env.USE_SSL === 'true',
      ignoreCertErrors: process.env.IGNORE_CERT_ERRORS === 'true',
    },
  },
};

export const isDevelopment = () => config.app.environment === 'development';
