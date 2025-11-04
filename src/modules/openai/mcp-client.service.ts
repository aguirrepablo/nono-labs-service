import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'http';
  command?: string; // Para stdio
  url?: string; // Para http
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  serverName: string;
}

/**
 * MCP Client Service
 * Manages connections to MCP servers and exposes their tools
 * Allows virtual agents to use MCP-provided tools via OpenAI function calling
 */
@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPClientService.name);
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();
  private configuredServers: Map<string, MCPServerConfig> = new Map();

  async onModuleInit() {
    this.logger.log('MCPClientService initialized');
  }

  async onModuleDestroy() {
    // Disconnect all clients
    for (const [serverName, client] of this.clients) {
      try {
        await client.close();
        this.logger.log(`Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        this.logger.error(`Error closing MCP client ${serverName}:`, error);
      }
    }
  }

  /**
   * Register an MCP server configuration
   */
  registerServer(config: MCPServerConfig): void {
    this.configuredServers.set(config.name, config);
    this.logger.log(`Registered MCP server: ${config.name} (${config.type})`);
  }

  /**
   * Connect to an MCP server and fetch available tools
   */
  async connectToServer(serverName: string): Promise<void> {
    if (this.clients.has(serverName)) {
      this.logger.log(`Already connected to MCP server: ${serverName}`);
      return;
    }

    const config = this.configuredServers.get(serverName);
    if (!config) {
      throw new Error(`MCP server configuration not found: ${serverName}`);
    }

    try {
      const transport = this.createTransport(config);
      const client = new Client({
        name: `nono-labs-${serverName}`,
        version: '1.0.0',
      });

      await client.connect(transport);
      this.clients.set(serverName, client);
      this.logger.log(`Connected to MCP server: ${serverName}`);

      // Fetch available tools
      await this.fetchTools(serverName, client);
    } catch (error) {
      this.logger.error(`Failed to connect to MCP server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Create appropriate transport based on server config
   */
  private createTransport(config: MCPServerConfig): StdioClientTransport {
    if (config.type === 'stdio') {
      if (!config.command) {
        throw new Error(`stdio server ${config.name} requires 'command' field`);
      }

      // Merge environment variables, filtering out undefined values
      const env: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          env[key] = value;
        }
      }
      if (config.env) {
        Object.assign(env, config.env);
      }

      return new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env,
      });
    }

    if (config.type === 'http') {
      // For HTTP support, would need to use a different transport
      // For now, only stdio is fully supported
      throw new Error(
        `HTTP transport type not yet fully supported. Use 'stdio' type instead. ` +
        `HTTP support requires additional dependencies.`,
      );
    }

    throw new Error(`Unknown MCP server type: ${config.type}`);
  }

  /**
   * Fetch available tools from MCP server
   */
  private async fetchTools(serverName: string, client: Client): Promise<void> {
    try {
      const response = await client.listTools();

      const tools: MCPTool[] = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {},
        serverName,
      }));

      this.tools.set(serverName, tools);
      this.logger.log(
        `Fetched ${tools.length} tools from MCP server: ${serverName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch tools from ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Get all available tools from a server
   */
  getTools(serverName: string): MCPTool[] {
    return this.tools.get(serverName) || [];
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Map<string, MCPTool[]> {
    return this.tools;
  }

  /**
   * Get names of all connected MCP servers
   */
  getAvailableMCPServers(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverName: string,
    toolName: string,
    toolInput: Record<string, any>,
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(
        `Not connected to MCP server: ${serverName}. Call connectToServer() first.`,
      );
    }

    try {
      this.logger.debug(
        `Calling tool ${toolName} on server ${serverName} with input:`,
        toolInput,
      );

      const response = await client.callTool({
        name: toolName,
        arguments: toolInput,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `Error calling tool ${toolName} on server ${serverName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
        this.clients.delete(serverName);
        this.tools.delete(serverName);
        this.logger.log(`Disconnected from MCP server: ${serverName}`);
      } catch (error) {
        this.logger.error(`Error disconnecting from ${serverName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const servers = Array.from(this.clients.keys());
    for (const serverName of servers) {
      await this.disconnect(serverName);
    }
  }
}
