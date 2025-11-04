import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCPClientService, MCPServerConfig } from './mcp-client.service';

/**
 * MCP Manager Service
 * Manages global MCP server lifecycle
 * Initializes all configured MCP servers on app startup
 * Keeps connections alive and reusable across all virtual agents
 */
@Injectable()
export class MCPManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPManagerService.name);
  private mcpServersConfig: MCPServerConfig[] = [];
  private isInitialized = false;

  constructor(
    private configService: ConfigService,
    private mcpClientService: MCPClientService,
  ) {}

  async onModuleInit() {
    this.logger.log('MCPManagerService initializing...');

    // Parse MCP servers from env
    this.mcpServersConfig = this.loadMCPServersFromConfig();

    if (this.mcpServersConfig.length === 0) {
      this.logger.log('No MCP servers configured (MCP_SERVERS is empty)');
      this.isInitialized = true;
      return;
    }

    this.logger.log(
      `Found ${this.mcpServersConfig.length} MCP servers in configuration`,
    );

    // Initialize all configured servers
    await this.initializeAllServers();

    this.isInitialized = true;
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting all MCP servers...');
    await this.mcpClientService.disconnectAll();
  }

  /**
   * Load MCP servers configuration from environment
   */
  private loadMCPServersFromConfig(): MCPServerConfig[] {
    try {
      const mcpServersJson = this.configService.get<string>('MCP_SERVERS', '[]');

      if (!mcpServersJson || mcpServersJson.trim() === '[]') {
        return [];
      }

      const servers = JSON.parse(mcpServersJson) as MCPServerConfig[];

      // Validate server configs
      for (const server of servers) {
        if (!server.name) {
          throw new Error('MCP server config must have a "name" field');
        }
        if (!server.type || !['stdio', 'http'].includes(server.type)) {
          throw new Error(
            `MCP server "${server.name}" has invalid type. Must be "stdio" or "http"`,
          );
        }
        if (server.type === 'stdio' && !server.command) {
          throw new Error(
            `MCP server "${server.name}" type is "stdio" but "command" field is missing`,
          );
        }
        if (server.type === 'http' && !server.url) {
          throw new Error(
            `MCP server "${server.name}" type is "http" but "url" field is missing`,
          );
        }
      }

      return servers;
    } catch (error) {
      this.logger.error(
        'Error parsing MCP_SERVERS configuration:',
        error,
      );
      throw new Error(
        `Invalid MCP_SERVERS configuration: ${error.message}. ` +
        `Expected valid JSON array of MCP server configs.`,
      );
    }
  }

  /**
   * Initialize all configured MCP servers
   */
  private async initializeAllServers(): Promise<void> {
    const successfulServers: string[] = [];
    const failedServers: string[] = [];

    for (const serverConfig of this.mcpServersConfig) {
      try {
        this.logger.log(`Initializing MCP server: ${serverConfig.name}...`);

        // Register server with MCPClientService
        this.mcpClientService.registerServer(serverConfig);

        // Connect to server
        await this.mcpClientService.connectToServer(serverConfig.name);

        successfulServers.push(serverConfig.name);
        this.logger.log(
          `✓ Successfully initialized MCP server: ${serverConfig.name}`,
        );
      } catch (error) {
        failedServers.push(serverConfig.name);
        this.logger.error(
          `✗ Failed to initialize MCP server "${serverConfig.name}": ${error.message}`,
        );
      }
    }

    // Summary
    this.logger.log(
      `MCP Server Initialization Complete: ${successfulServers.length} successful, ${failedServers.length} failed`,
    );

    if (successfulServers.length > 0) {
      this.logger.log(`Active MCP servers: ${successfulServers.join(', ')}`);
    }

    if (failedServers.length > 0) {
      this.logger.warn(`Failed MCP servers: ${failedServers.join(', ')}`);
    }
  }

  /**
   * Get all initialized MCP servers
   */
  getAvailableServers(): string[] {
    return this.mcpClientService.getAvailableMCPServers();
  }

  /**
   * Check if a specific server is available
   */
  isServerAvailable(serverName: string): boolean {
    return this.mcpClientService.isConnected(serverName);
  }

  /**
   * Get all available servers and their status
   */
  getServersStatus(): {
    name: string;
    connected: boolean;
    toolCount: number;
  }[] {
    return this.mcpServersConfig.map((config) => ({
      name: config.name,
      connected: this.mcpClientService.isConnected(config.name),
      toolCount: this.mcpClientService.getTools(config.name).length,
    }));
  }

  /**
   * Dynamically add a new MCP server (at runtime)
   */
  async addServer(serverConfig: MCPServerConfig): Promise<void> {
    try {
      if (this.mcpClientService.isConnected(serverConfig.name)) {
        throw new Error(
          `MCP server "${serverConfig.name}" is already connected`,
        );
      }

      this.logger.log(`Adding MCP server at runtime: ${serverConfig.name}`);

      this.mcpClientService.registerServer(serverConfig);
      await this.mcpClientService.connectToServer(serverConfig.name);

      this.mcpServersConfig.push(serverConfig);

      this.logger.log(
        `✓ Successfully added MCP server: ${serverConfig.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Error adding MCP server "${serverConfig.name}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Dynamically remove an MCP server
   */
  async removeServer(serverName: string): Promise<void> {
    try {
      this.logger.log(`Removing MCP server: ${serverName}`);

      await this.mcpClientService.disconnect(serverName);

      this.mcpServersConfig = this.mcpServersConfig.filter(
        (s) => s.name !== serverName,
      );

      this.logger.log(`✓ Successfully removed MCP server: ${serverName}`);
    } catch (error) {
      this.logger.error(`Error removing MCP server "${serverName}":`, error);
      throw error;
    }
  }

  /**
   * Reconnect a specific server
   */
  async reconnectServer(serverName: string): Promise<void> {
    try {
      const config = this.mcpServersConfig.find((s) => s.name === serverName);
      if (!config) {
        throw new Error(`MCP server configuration not found: ${serverName}`);
      }

      this.logger.log(`Reconnecting MCP server: ${serverName}`);

      await this.mcpClientService.disconnect(serverName);
      this.mcpClientService.registerServer(config);
      await this.mcpClientService.connectToServer(serverName);

      this.logger.log(`✓ Successfully reconnected MCP server: ${serverName}`);
    } catch (error) {
      this.logger.error(
        `Error reconnecting MCP server "${serverName}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if MCPManagerService is fully initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
