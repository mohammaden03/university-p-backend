export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    secret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  aiService: {
    url: string;
    timeoutMs: number;
  };
  storage: {
    root: string;
    maxUploadSizeBytes: number;
    allowedMimeTypes: string[];
  };
  cors: {
    origins: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  adminSeed: {
    email?: string;
    password?: string;
    name?: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://htr_user:htr_secret_password@localhost:5432/manuscript_htr_db?schema=public',
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'super-secret-jwt-signing-key-for-persian-arabic-htr-platform-min-32-chars',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://ai-service:8000',
    timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '30000', 10),
  },
  storage: {
    root: process.env.STORAGE_ROOT || './storage/manuscripts',
    maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE || '20971520', 10),
    allowedMimeTypes: (
      process.env.ALLOWED_MIME_TYPES ||
      'image/jpeg,image/png,image/tiff,image/webp'
    ).split(','),
  },
  cors: {
    origins: process.env.CORS_ORIGINS || '*',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  adminSeed: {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@manuscript-htr.edu',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminSecurePassword123!',
    name: process.env.DEFAULT_ADMIN_NAME || 'Chief Manuscript Archivist',
  },
});
