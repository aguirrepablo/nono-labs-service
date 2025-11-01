# Nono Labs Services

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

A production-ready microservices platform built with **NestJS** and **TypeScript** for managing AI-powered virtual agents, multi-channel communication, and intelligent conversation handling.

## Overview

Nono Labs Services is a comprehensive backend solution designed to:

- **Manage Virtual Agents**: Create and configure AI-powered agents powered by OpenAI, OpenRouter, or compatible APIs
- **Multi-Channel Support**: Seamlessly integrate with Telegram, email, and other communication channels
- **Intelligent Conversations**: Handle complex conversation flows with context awareness and message persistence
- **Tenant Management**: Support multi-tenant architecture for SaaS applications
- **AI Integration**: Connect to multiple AI providers (OpenAI, OpenRouter, Gemini, Claude, etc.)
- **Security**: End-to-end encryption for sensitive data

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com) 11.x with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **AI**: OpenAI API, OpenRouter API (compatible)
- **Communication**: Telegram Bot API
- **Authentication**: JWT with bcrypt
- **Validation**: class-validator, Joi
- **Testing**: Jest with TypeScript support

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **MongoDB** 6.0 or higher (local or remote connection)
- **Git** (for version control)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nono-labs-services
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Configure the required environment variables:

```env
# Application
NODE_ENV=development
PORT=3000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/nono-labs-dev

# Encryption Key (REQUIRED - Generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# AI Provider Configuration
# Option 1: OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_DEFAULT_MODEL=gpt-4

# Option 2: OpenRouter (supports multiple models)
OPENROUTER_API_KEY=your-openrouter-api-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhooks/telegram

# CORS Configuration
CORS_ORIGIN=*
```

### 4. Generate Encryption Key

Generate a secure encryption key (required for production):

```bash
openssl rand -hex 32
```

Copy the output to your `.env` file as `ENCRYPTION_KEY`.

### 5. Verify MongoDB Connection

Ensure MongoDB is running and accessible at the URI specified in `.env`:

```bash
# Test connection (optional)
# mongosh <your-mongodb-uri>
```

## Running the Application

### Development Mode (with hot reload)

```bash
npm run start:dev
```

The application will start on `http://localhost:3000` and automatically reload on file changes.

### Production Mode

First, build the application:

```bash
npm run build
```

Then start the production server:

```bash
npm run start:prod
```

### Debug Mode

For debugging with Node inspector:

```bash
npm run start:debug
```

The debugger will be available on `chrome://inspect`.

## Project Structure

```
src/
├── app.module.ts                 # Root application module
├── main.ts                       # Application entry point
├── common/                       # Shared utilities and middleware
│   └── encryption/               # Encryption service and module
├── modules/                      # Feature modules
│   ├── tenants/                  # Multi-tenant management
│   ├── virtual-agents/           # AI agent configuration
│   ├── channels/                 # Communication channel management
│   ├── messages/                 # Message persistence and retrieval
│   ├── conversations/            # Conversation flow management
│   ├── telegram/                 # Telegram integration
│   ├── openai/                   # OpenAI/AI provider integration
│   └── error-logs/               # Error tracking and logging
└── database/
    └── seeds/                    # Database seeding scripts
```

## Core Modules

### Tenants Module
Manages multi-tenant isolation and configuration.

### Virtual Agents Module
Create and manage AI agents with custom configurations:
- Model selection (OpenAI, OpenRouter, or custom)
- System prompts and personality
- Token limits and response settings

### Channels Module
Integrate communication channels:
- Telegram bot integration
- Channel-specific settings and credentials
- Message routing and filtering

### Messages Module
Handle message persistence and retrieval:
- Store incoming/outgoing messages
- Message threading and grouping
- Message metadata and analytics

### Conversations Module
Manage conversation context and flow:
- Multi-turn conversation support
- Context preservation
- Conversation state management

### Telegram Module
Telegram bot integration:
- Webhook handling
- Message parsing
- Command processing

### OpenAI Module
AI provider abstraction:
- Multiple AI model support
- Token counting
- Response streaming

## Testing

### Run All Unit Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage Report

```bash
npm run test:cov
```

### Run E2E Tests

```bash
npm run test:e2e
```

## Code Quality

### Lint Code (with auto-fix)

```bash
npm run lint
```

### Format Code with Prettier

```bash
npm run format
```

## Database Operations

### Seed the Database

Initialize the database with demo data:

```bash
npm run seed
```

This creates:
- Default tenant configuration
- Demo virtual agents
- Sample Telegram channel
- Example conversation templates

## Configuration

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development`, `staging`, or `production` |
| `PORT` | Yes | Server port (default: 3000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `ENCRYPTION_KEY` | Yes | 32+ char encryption key for sensitive data |
| `OPENAI_API_KEY` | No | OpenAI API key (if using OpenAI) |
| `OPENAI_DEFAULT_MODEL` | No | Default OpenAI model (e.g., `gpt-4`) |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (for multiple models) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from @BotFather |
| `TELEGRAM_WEBHOOK_URL` | No | Webhook URL for Telegram callbacks |
| `CORS_ORIGIN` | No | CORS origin(s) (default: `*`) |

## API Usage

### Create a Virtual Agent

```bash
curl -X POST http://localhost:3000/virtual-agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "model": "gpt-4",
    "systemPrompt": "You are a helpful support assistant"
  }'
```

### Send a Message

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "xxx",
    "content": "Hello, how can I help?",
    "agentId": "xxx"
  }'
```

For full API documentation, refer to controller files in `src/modules/*/controllers/`.

## Development Guidelines

This project follows specific development guidelines. Please refer to:

- **[CLAUDE.md](./CLAUDE.md)** - AI assistant context and architecture guidelines
- **Code Style**: ESLint + Prettier (run `npm run format && npm run lint`)
- **Module Pattern**: Controllers → Services → Database
- **Error Handling**: Centralized error logging with error-logs module
- **Security**: Input validation with class-validator, encryption for sensitive data

## Building for Production

### 1. Build the Application

```bash
npm run build
```

### 2. Run Production Build

```bash
npm run start:prod
```

### 3. Environment Setup

- Set `NODE_ENV=production`
- Use a strong, randomly generated `ENCRYPTION_KEY`
- Configure production MongoDB URI
- Set valid API keys for all integrations
- Configure CORS with specific origins (not `*`)

## Troubleshooting

### MongoDB Connection Failed

```
Error: connect ECONNREFUSED
```

**Solution**: Ensure MongoDB is running and the `MONGODB_URI` is correct.

```bash
# Check MongoDB status
# macOS:
brew services list | grep mongodb

# Windows:
Get-Service MongoDB
```

### Telegram Webhook Not Working

**Solution**: Ensure `TELEGRAM_WEBHOOK_URL` is publicly accessible and uses HTTPS.

### AI API Errors

**Solution**: Verify API keys are valid and have sufficient quota in the respective service (OpenAI, OpenRouter).

### Encryption Key Error

**Solution**: Regenerate and update the `ENCRYPTION_KEY`:

```bash
openssl rand -hex 32
```

## Performance Optimization

- Use MongoDB indexes for frequently queried fields
- Implement caching for AI responses when appropriate
- Use message batching for high-volume scenarios
- Monitor database query performance with MongoDB Profiler

## Security Best Practices

- Never commit `.env` file to version control
- Rotate encryption keys regularly
- Use HTTPS for all external integrations
- Validate and sanitize all user inputs
- Implement rate limiting for API endpoints
- Use environment-specific credentials

## Contributing

1. Create a feature branch from `master`
2. Make your changes following the code style guidelines
3. Run tests: `npm run test`
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Create a pull request with a clear description

## License

UNLICENSED - All rights reserved

## Support

For issues, questions, or feature requests, please open an issue in the repository.

---

**Built with ❤️ using NestJS and TypeScript**
