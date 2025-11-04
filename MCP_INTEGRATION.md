# MCP Integration Guide

This document explains how to integrate MCP (Model Context Protocol) servers with your Nono Labs virtual agents, allowing OpenAI models to use MCP tools.

## Overview

MCP Integration allows your virtual agents to:

- **Access External Tools**: Use tools provided by MCP servers (e.g., chrome-devtools-mcp for browser automation)
- **Extend Capabilities**: Combine OpenAI's reasoning with specialized tools
- **Agentic Loops**: Let models decide when and how to use tools to solve problems
- **Single Configuration**: Define MCP servers once, use them across all agents
- **Persistent Connections**: Servers stay alive for the duration of the app

## Architecture

```
.env Configuration (MCP_SERVERS)
    ↓
MCPManagerService (App Startup)
    ├─ Parse MCP server configs
    ├─ Connect all servers
    └─ Keep connections alive
    ↓
Virtual Agent (configParams.mcpServerNames)
    ↓
OpenAIService.generateChatCompletion()
    ├─ Gets MCP tools from MCPManagerService
    ├─ Prepares tools (agent tools + MCP tools)
    ├─ Calls OpenAI API
    └─ Handles tool calls → MCPAdapterService → MCPClientService
```

## Installation

MCP SDK is already installed:

```bash
npm list @modelcontextprotocol/sdk
# Output: @modelcontextprotocol/sdk@^1.20.2
```

## Configuration

### 1. Configure Global MCP Servers in `.env`

Define all MCP servers in your `.env` file once, and they'll be available to all agents:

```bash
# .env
MCP_SERVERS=[
  {
    "name": "chrome-devtools",
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "chrome-devtools-mcp@latest"]
  },
  {
    "name": "filesystem",
    "type": "stdio",
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "/tmp"]
  }
]
```

**Or as a single-line JSON** (easier for environment variables):

```bash
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]}]
```

### 2. MCP Server Configuration Format

#### stdio (Local Process)

```typescript
{
  "name": "server-name",
  "type": "stdio",
  "command": "node",              // executable
  "args": ["./path/to/server.js"], // optional arguments
  "env": {                         // optional environment variables
    "API_KEY": "your-key"
  }
}
```

#### http (Remote Server)

```typescript
{
  "name": "server-name",
  "type": "http",
  "url": "https://api.example.com/mcp"
}
```

### 3. Reference MCP Servers in Virtual Agent

When creating a virtual agent, reference which MCP servers it should use by name:

```json
{
  "name": "Web Inspector Agent",
  "model": "gpt-4",
  "provider": "openai",
  "configParams": {
    "systemPrompt": "You are a web testing expert.",
    "temperature": 0.7,
    "maxTokens": 2000,
    "mcpServerNames": ["chrome-devtools", "filesystem"]
  }
}
```

That's it! The agent will use the servers configured globally.

## Examples

### Example 1: Configure MCP Servers in .env

```bash
# .env
MCP_SERVERS=[{"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},{"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]}]
```

These servers will automatically start when the app launches.

### Example 2: Create Agent Using Global MCP Servers

**POST /virtual-agents**

```json
{
  "name": "Web Inspector Agent",
  "model": "gpt-4-turbo",
  "configParams": {
    "systemPrompt": "You are a professional web testing expert.",
    "temperature": 0.7,
    "maxTokens": 3000,
    "mcpServerNames": ["chrome-devtools", "filesystem"]
  }
}
```

**Usage**:
```
User: "Inspect the performance of https://example.com"
↓
Agent automatically gets access to chrome-devtools and filesystem tools
↓
Agent uses tools to analyze the website
↓
Agent responds with findings
```

### Example 3: Multiple Agents Sharing Same MCP Servers

**MCP servers configured once in .env**:
```bash
MCP_SERVERS=[
  {"name":"chrome-devtools","type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]},
  {"name":"filesystem","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-filesystem","/tmp"]},
  {"name":"github","type":"stdio","command":"npx","args":["@modelcontextprotocol/server-github"]}
]
```

**Agent 1 - Web Testing**:
```json
{
  "name": "Web Tester",
  "configParams": {
    "mcpServerNames": ["chrome-devtools", "filesystem"]
  }
}
```

**Agent 2 - Code Review**:
```json
{
  "name": "Code Reviewer",
  "configParams": {
    "mcpServerNames": ["github", "filesystem"]
  }
}
```

**Agent 3 - Full Stack**:
```json
{
  "name": "Full Stack Assistant",
  "configParams": {
    "mcpServerNames": ["chrome-devtools", "filesystem", "github"]
  }
}
```

### Example 4: With Custom Server and Environment Variables

**Configure in .env**:
```bash
MCP_SERVERS=[{"name":"custom-service","type":"stdio","command":"node","args":["./custom-mcp-server.js"],"env":{"API_KEY":"sk-custom","DATABASE_URL":"mongodb://localhost"}}]
```

**Use in agent**:
```json
{
  "name": "Custom Service Agent",
  "configParams": {
    "mcpServerNames": ["custom-service"]
  }
}
```

## How It Works

### 1. App Startup

When the application starts:

```
AppModule initializes
    ↓
OpenAIModule initializes
    ↓
MCPManagerService.onModuleInit()
    ├─ Read MCP_SERVERS from .env
    ├─ Parse JSON configuration
    ├─ Validate server configs
    ├─ For each server:
    │   ├─ MCPClientService.registerServer()
    │   ├─ MCPClientService.connectToServer()
    │   └─ Fetch available tools
    └─ Servers stay connected for app lifetime
```

### 2. Agent Configuration

When a virtual agent is created:

```json
{
  "name": "My Agent",
  "configParams": {
    "mcpServerNames": ["chrome-devtools", "filesystem"]
  }
}
```

The agent just references which global MCP servers it wants to use. No server initialization needed.

### 3. Chat Completion Flow

```
User sends message
    ↓
OpenAIService.generateChatCompletion()
    ↓
Prepare tools
    ├─ Agent's own tools (configParams.tools)
    └─ MCP tools from MCPManagerService
    │   (servers already running, just fetch tools)
    ↓
Call OpenAI API with:
    ├─ Messages (conversation history)
    ├─ Tools (agent tools + MCP tools)
    ├─ Model config (temperature, max_tokens, etc.)
    ↓
OpenAI decides if it needs tools
    ├─ If no tools needed: return response
    ├─ If tools needed:
    │   ├─ Extract tool_calls
    │   ├─ For each tool_call:
    │   │   ├─ Identify if MCP or custom tool
    │   │   ├─ Execute MCPAdapterService.executeMCPInvocation()
    │   │   ├─ Get tool result
    │   │   └─ Add to messages as tool result
    │   └─ Call OpenAI again with updated context
    ↓
Return final response
```

### Key Differences from Per-Agent Configuration

| Aspect | Per-Agent Config | Global Config |
|--------|-----------------|---------------|
| **Definition** | Each agent defines its own MCP servers | All servers defined in .env once |
| **Lifecycle** | Init/destroy per agent message | Init once at app startup |
| **Resource Usage** | Multiple connections per server | Single connection per server |
| **Configuration** | `configParams.mcpServers` (full config) | `configParams.mcpServerNames` (just names) |
| **Best For** | Ad-hoc, single-use setups | Production systems, shared tools |

## Tool Naming Convention

MCP tools are automatically prefixed in OpenAI function calling:

```
Original tool name:   take_screenshot
MCP server name:      chrome-devtools
OpenAI tool name:     mcp_chrome-devtools_take_screenshot
```

## API Reference

### MCPClientService

```typescript
// Register a server configuration
registerServer(config: MCPServerConfig): void

// Connect to a server and fetch tools
connectToServer(serverName: string): Promise<void>

// Get tools from a specific server
getTools(serverName: string): MCPTool[]

// Get tools from all connected servers
getAllTools(): Map<string, MCPTool[]>

// Call a tool
callTool(serverName: string, toolName: string, toolInput: Record<string, any>): Promise<any>

// Check connection status
isConnected(serverName: string): boolean

// Disconnect from a server
disconnect(serverName: string): Promise<void>

// Disconnect from all servers
disconnectAll(): Promise<void>
```

### MCPAdapterService

```typescript
// Convert MCP tools to OpenAI format
convertMCPToolsToOpenAIFormat(mcpTools: MCPTool[]): OpenAITool[]

// Extract MCP invocation from OpenAI tool call
extractMCPInvocation(toolCallName: string, toolCallArguments: string): MCPToolInvocation | null

// Execute an MCP tool invocation
executeMCPInvocation(invocation: MCPToolInvocation): Promise<any>

// Get all tools in OpenAI format
getAllToolsAsOpenAIFormat(mcpServerNames?: string[]): OpenAITool[]

// Check if tool call is MCP
isMCPToolCall(toolCallName: string): boolean

// Get available MCP servers
getAvailableMCPServers(): string[]

// Get tools from specific server in OpenAI format
getServerTools(serverName: string): OpenAITool[]
```

## Error Handling

### MCP Server Connection Failures

If an MCP server fails to connect, the agent will:
1. Log a warning
2. Continue without that MCP server's tools
3. Still respond, but without access to those tools

```typescript
// Example error handling in OpenAIService
try {
  await this.mcpClientService.connectToServer(serverConfig.name);
} catch (error) {
  this.logger.warn(
    `Failed to initialize MCP server ${serverConfig.name}: ${error.message}`,
  );
  // Continue - don't throw
}
```

### Tool Execution Failures

If a tool call fails:
1. The error is caught and logged
2. The error message is returned to OpenAI as tool result
3. The agent can handle the error or retry

## Troubleshooting

### "MCP Server Configuration Not Found"

**Problem**: Error when trying to connect to an MCP server

**Solution**: Ensure the server name in `mcpServers` array matches the registered configuration

### "Failed to Connect to MCP Server"

**Problem**: Connection timeout or failure

**Solution**:
- For stdio: Verify the command and args are correct
- For http: Verify the URL is accessible
- Check environment variables if used
- Review server logs for errors

### Tools Not Available

**Problem**: MCP tools not showing up in agent's available tools

**Solution**:
1. Verify MCP server is connected: `MCPClientService.isConnected(name)`
2. Check if tools were fetched: `MCPClientService.getTools(name)`
3. Ensure agent's `configParams.mcpServers` is populated

### Tool Invocation Fails

**Problem**: Tool is called but fails

**Solution**:
1. Check tool arguments format - must match schema
2. Verify API keys and credentials if needed
3. Review server logs for detailed error messages

## Publishing to Git

When pushing to GitHub, be sure to:

1. **Never commit environment variables or secrets** in `configParams.mcpServers`
   ```json
   // DO NOT commit actual values:
   "env": {
     "API_KEY": "sk-abc123..."  // ❌ Never!
   }
   ```

2. **Document MCP server requirements** in README
   ```markdown
   ## MCP Servers Support

   Agents can be configured with MCP servers for extended capabilities:
   - chrome-devtools-mcp: Browser automation and testing
   - github-mcp: GitHub integration
   - custom servers: User-defined MCP servers
   ```

3. **Provide examples** in documentation
   ```json
   {
     "configParams": {
       "mcpServers": [
         {
           "name": "chrome-devtools",
           "type": "stdio",
           "command": "npx",
           "args": ["-y", "chrome-devtools-mcp@latest"]
         }
       ]
     }
   }
   ```

## Implementation Checklist

- [x] MCP SDK installed (@modelcontextprotocol/sdk)
- [x] MCPClientService implemented
- [x] MCPAdapterService implemented
- [x] OpenAIService integrated with MCP
- [x] Tool call handling (agentic loop)
- [x] Error handling and logging
- [ ] Update VirtualAgent schema to document mcpServers field
- [ ] Add MCP configuration examples to seed data
- [ ] Create API documentation for MCP endpoints

## Future Enhancements

1. **MCP Server Management API**
   - Endpoint to register/unregister MCP servers
   - Endpoint to list available servers and their tools
   - Endpoint to test MCP server connections

2. **Tool Persistence**
   - Cache MCP tool definitions in database
   - Reduce connection overhead

3. **Advanced Agentic Loops**
   - Parallel tool execution
   - Tool call filtering/validation
   - Custom tool preprocessing

4. **Monitoring & Analytics**
   - Track MCP tool usage
   - Monitor tool execution times
   - Log tool call success/failure rates

5. **Security**
   - Tool access control per tenant
   - Rate limiting on MCP calls
   - Input validation for tool arguments

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Awesome MCP Servers](https://mcpservers.org/)

## Questions or Issues?

Refer to:
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [README.md](./README.md) - General project documentation
- Error logs - Check ErrorLogs module for detailed errors
