export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      retryWrites: true,
      w: 'majority',
    },
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY,
  },
  openai: {
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
  },
  telegram: {
    webhookDomain: process.env.TELEGRAM_WEBHOOK_DOMAIN,
  },
  security: {
    apiKeyHeader: 'x-api-key',
    tenantIdHeader: 'x-tenant-id',
  },
  rateLimit: {
    ttl: 60000, // 1 minute
    limit: 100, // requests per ttl
  },
});
