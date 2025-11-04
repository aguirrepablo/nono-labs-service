# MCP Servers Setup Examples

This file shows how to configure MCP servers in your `.env` file and use them with virtual agents.

## Quick Start

### 1. Configure MCP Servers in .env

Add the `MCP_SERVERS` variable to your `.env` file. MCP servers are defined as a JSON array.

#### Chrome DevTools Only

```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]}]
```

#### Chrome DevTools + Filesystem

```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]}]
```

#### All Common Servers

```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]},{"name":"github","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-github"]}]
```

### 2. Create a Virtual Agent Using MCP Servers

Once servers are configured in `.env`, they're automatically started when your app launches.

Create an agent that uses these servers:

#### Using cURL

```bash
curl -X POST http://localhost:3000/virtual-agents \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "name": "Web Inspector Agent",
    "description": "Can inspect web applications and access files",
    "provider": "openai",
    "model": "gpt-4-turbo",
    "configParams": {
      "systemPrompt": "You are a professional web application tester. You can inspect websites, analyze performance, check for issues, and access the filesystem when needed.",
      "temperature": 0.7,
      "maxTokens": 4000,
      "mcpServerNames": ["chrome-devtools", "filesystem"]
    }
  }'
```

#### Using JavaScript/TypeScript

```typescript
const agent = await virtualAgentsService.create({
  tenantId,
  name: "Web Inspector Agent",
  model: "gpt-4-turbo",
  configParams: {
    systemPrompt: "You are a professional web application tester.",
    temperature: 0.7,
    maxTokens: 4000,
    mcpServerNames: ["chrome-devtools", "filesystem"]
  }
});
```

### 3. Send a Message

Now users can interact with the agent and it will have access to MCP tools:

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "content": "Inspect https://example.com and tell me about its performance"
  }'
```

The agent will:
1. Recognize it needs to use browser tools
2. Call chrome-devtools-mcp to open the website
3. Analyze performance metrics
4. Return findings to the user

---

## Configuration Patterns

### Pattern 1: Simple Web Testing

**Use case**: Browser automation and testing

**.env**:
```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]}]
```

**Agent**:
```json
{
  "name": "Web Tester",
  "configParams": {
    "mcpServerNames": ["chrome-devtools"]
  }
}
```

### Pattern 2: Full Stack Development

**Use case**: Web testing + file system access + GitHub integration

**.env**:
```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/home/user/projects"]},{"name":"github","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-github"]}]
```

**Agent 1 - Frontend Developer**:
```json
{
  "name": "Frontend Dev Helper",
  "configParams": {
    "systemPrompt": "Help with frontend development, code review, and testing.",
    "mcpServerNames": ["chrome-devtools", "filesystem", "github"]
  }
}
```

**Agent 2 - QA Tester**:
```json
{
  "name": "QA Tester",
  "configParams": {
    "systemPrompt": "Test the application thoroughly and report issues.",
    "mcpServerNames": ["chrome-devtools"]
  }
}
```

### Pattern 3: Custom MCP Server

**Use case**: Private internal tools

**First, create your MCP server** (e.g., in your repo):

```typescript
// src/mcp/internal-api-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "internal-api-mcp",
  version: "1.0.0",
});

server.setRequestHandler(/* ... */);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**.env**:
```bash
MCP_SERVERS=[{"name":"internal-api","type":"stdio","command":"node","args":["./dist/mcp/internal-api-server.js"],"env":{"API_KEY":"sk-internal-secret","DATABASE_URL":"mongodb://localhost"}}]
```

**Agent**:
```json
{
  "name": "Internal API Agent",
  "configParams": {
    "mcpServerNames": ["internal-api"]
  }
}
```

### Pattern 4: Environment-Specific Configuration

**Development** (.env.development):
```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","."]}]
```

**Production** (.env.production):
```bash
# Only chrome-devtools, no file access for security
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]}]
```

---

## Popular MCP Servers

### Chrome DevTools
```bash
{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]}
```
**Capabilities**: Browser automation, screenshots, performance analysis

### Filesystem
```bash
{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/path/to/directory"]}
```
**Capabilities**: Read/write files in specified directory

### GitHub
```bash
{"name":"github","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-github"]}
```
**Capabilities**: Repository management, issue tracking, code browsing

### PostgreSQL
```bash
{"name":"postgres","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-postgres"],"env":{"DATABASE_URL":"postgresql://..."}}
```
**Capabilities**: Database queries and management

### SQLite
```bash
{"name":"sqlite","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-sqlite","/path/to/database.db"]}
```
**Capabilities**: Lightweight database access

---

## Troubleshooting

### MCP Servers Not Starting

Check the logs:
```bash
npm run start:dev 2>&1 | grep -i mcp
```

Common issues:
- **"command not found"**: Ensure npm package is installed globally or use npx
- **"ECONNREFUSED"**: The MCP server process exited. Check env variables
- **"Permission denied"**: File path doesn't exist or no read permissions

### Tools Not Available

Verify servers are connected:
```bash
# Check in your app logs for:
# ✓ Successfully initialized MCP server: chrome-devtools
# ✓ Fetched X tools from MCP server: chrome-devtools
```

Make sure agent references the server:
```json
{
  "configParams": {
    "mcpServerNames": ["chrome-devtools"]  // Must match server name
  }
}
```

### Tool Execution Fails

- Check tool arguments match the schema
- Verify required environment variables are set
- Review MCP server logs for errors

---

## API Endpoints (Future)

Once implemented, these endpoints will help manage MCP servers:

```bash
# Get all available MCP servers
GET /mcp/servers

# Get tools from a specific server
GET /mcp/servers/:name/tools

# Get server status
GET /mcp/servers/:name/status

# Manually connect a server
POST /mcp/servers/:name/connect

# Disconnect a server
POST /mcp/servers/:name/disconnect

# Restart a server
POST /mcp/servers/:name/restart
```

---

## Security Considerations

1. **Environment Variables**: Never commit actual API keys
   ```bash
   # ❌ Don't do this:
   "env": {"API_KEY": "sk-actual-key"}

   # ✅ Do this:
   "env": {"API_KEY": "${API_KEY_ENV_VAR}"}
   ```

2. **File Paths**: Restrict filesystem MCP to safe directories
   ```bash
   # ✅ Good - restricted to /tmp
   {"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]}

   # ❌ Risky - full system access
   {"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/"]}
   ```

3. **Server Validation**: Only connect to trusted MCP servers

4. **Rate Limiting**: Implement rate limiting on MCP tool calls (future enhancement)

---

## Advanced Configuration

### Conditional Server Loading

You can parse MCP_SERVERS conditionally based on environment:

```typescript
// In MCPManagerService
const mcpServersJson = process.env.NODE_ENV === 'production'
  ? process.env.MCP_SERVERS_PROD
  : process.env.MCP_SERVERS_DEV;
```

### Dynamic Server Registration

Add/remove servers at runtime (if using API):

```typescript
// Add server
await mcpManagerService.addServer({
  name: "new-server",
  type: "stdio",
  command: "npx",
  args: ["server-package"]
});

// Remove server
await mcpManagerService.removeServer("new-server");

// Get status
const status = mcpManagerService.getServersStatus();
```

---

## Best Practices

1. ✅ **Define servers once in .env**: All agents share the same servers
2. ✅ **Use meaningful names**: `chrome-devtools` not `server1`
3. ✅ **Document required env vars**: Include in README
4. ✅ **Test server startup**: Verify servers start without errors
5. ✅ **Monitor server health**: Check logs regularly
6. ✅ **Limit agent access**: Only give agents the servers they need

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Servers Directory](https://mcpservers.org/)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Nono Labs MCP Integration Docs](./MCP_INTEGRATION.md)
