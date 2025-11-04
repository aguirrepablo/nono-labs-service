import { Injectable, Logger } from '@nestjs/common';
import { MCPClientService, MCPTool } from './mcp-client.service';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface MCPToolInvocation {
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
}

/**
 * MCP Adapter Service
 * Converts MCP tools to OpenAI function calling format
 * Handles bidirectional communication between OpenAI and MCP servers
 */
@Injectable()
export class MCPAdapterService {
  private readonly logger = new Logger(MCPAdapterService.name);

  constructor(private mcpClientService: MCPClientService) {}

  /**
   * Convert MCP tools to OpenAI tools format
   */
  convertMCPToolsToOpenAIFormat(
    mcpTools: MCPTool[],
  ): OpenAITool[] {
    return mcpTools.map((mcpTool) => ({
      type: 'function',
      function: {
        name: `mcp_${mcpTool.serverName}_${mcpTool.name}`,
        description:
          mcpTool.description ||
          `Tool from MCP server: ${mcpTool.serverName}`,
        parameters: {
          type: 'object',
          properties: this.convertSchemaProperties(
            mcpTool.inputSchema.properties || {},
          ),
          required: mcpTool.inputSchema.required || [],
        },
      },
    }));
  }

  /**
   * Convert JSON Schema properties to OpenAI format
   * Handles nested objects and arrays
   */
  private convertSchemaProperties(
    properties: Record<string, any>,
  ): Record<string, any> {
    const converted: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      converted[key] = this.convertSchemaProperty(value);
    }

    return converted;
  }

  /**
   * Convert a single property from JSON Schema to OpenAI format
   */
  private convertSchemaProperty(property: any): any {
    const converted: any = {};

    if (property.type) {
      converted.type = property.type;
    }

    if (property.description) {
      converted.description = property.description;
    }

    if (property.enum) {
      converted.enum = property.enum;
    }

    if (property.default !== undefined) {
      converted.default = property.default;
    }

    if (property.items) {
      converted.items = this.convertSchemaProperty(property.items);
    }

    if (property.properties) {
      converted.properties = this.convertSchemaProperties(
        property.properties,
      );
    }

    if (property.minimum !== undefined) {
      converted.minimum = property.minimum;
    }

    if (property.maximum !== undefined) {
      converted.maximum = property.maximum;
    }

    if (property.minLength !== undefined) {
      converted.minLength = property.minLength;
    }

    if (property.maxLength !== undefined) {
      converted.maxLength = property.maxLength;
    }

    return converted;
  }

  /**
   * Extract MCP tool invocation from OpenAI tool call
   */
  extractMCPInvocation(
    toolCallName: string,
    toolCallArguments: string,
  ): MCPToolInvocation | null {
    // Tool names follow format: mcp_<serverName>_<toolName>
    const match = toolCallName.match(/^mcp_([^_]+)_(.+)$/);

    if (!match) {
      return null; // Not an MCP tool call
    }

    const [, serverName, toolName] = match;

    try {
      const arguments_ = JSON.parse(toolCallArguments);
      return { serverName, toolName, arguments: arguments_ };
    } catch (error) {
      this.logger.error(
        `Failed to parse tool arguments for ${toolCallName}:`,
        error,
      );
      throw new Error(`Invalid JSON in tool call arguments: ${error.message}`);
    }
  }

  /**
   * Execute an MCP tool invocation
   */
  async executeMCPInvocation(invocation: MCPToolInvocation): Promise<any> {
    try {
      this.logger.debug(
        `Executing MCP invocation: ${invocation.serverName}/${invocation.toolName}`,
      );

      const result = await this.mcpClientService.callTool(
        invocation.serverName,
        invocation.toolName,
        invocation.arguments,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error executing MCP invocation:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all tools from configured MCP servers
   * Filters by server names if provided
   */
  getAllToolsAsOpenAIFormat(
    mcpServerNames?: string[],
  ): OpenAITool[] {
    const allTools = this.mcpClientService.getAllTools();
    let toolsToConvert: MCPTool[] = [];

    if (mcpServerNames && mcpServerNames.length > 0) {
      // Get tools only from specified servers
      for (const serverName of mcpServerNames) {
        const serverTools = allTools.get(serverName) || [];
        toolsToConvert.push(...serverTools);
      }
    } else {
      // Get tools from all servers
      for (const serverTools of allTools.values()) {
        toolsToConvert.push(...serverTools);
      }
    }

    return this.convertMCPToolsToOpenAIFormat(toolsToConvert);
  }

  /**
   * Check if a tool call is an MCP tool call
   */
  isMCPToolCall(toolCallName: string): boolean {
    return toolCallName.startsWith('mcp_');
  }

  /**
   * Get available MCP servers
   */
  getAvailableMCPServers(): string[] {
    return Array.from(
      this.mcpClientService.getAllTools().keys(),
    );
  }

  /**
   * Get available tools from a specific MCP server
   */
  getServerTools(serverName: string): OpenAITool[] {
    const tools = this.mcpClientService.getTools(serverName);
    return this.convertMCPToolsToOpenAIFormat(tools);
  }
}
