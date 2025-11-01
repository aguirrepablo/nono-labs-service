import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // MongoDB
  MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),

  // Encryption
  ENCRYPTION_KEY: Joi.string()
    .required()
    .min(32)
    .description('32-character encryption key for sensitive data'),

  // OpenAI
  OPENAI_DEFAULT_MODEL: Joi.string().default('gpt-4'),

  // Telegram
  TELEGRAM_WEBHOOK_DOMAIN: Joi.string()
    .uri({ scheme: ['https'] })
    .description('HTTPS domain for Telegram webhooks'),
});
