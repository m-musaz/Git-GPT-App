import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  getPendingInvites,
  respondToInvite,
} from './calendar-service.js';
import { isAuthenticated, getAuthUrl, getUserEmail } from './google-auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default user ID for single-user mode
const DEFAULT_USER_ID = 'default';

// Base URL for widget templates
const getWidgetBaseUrl = () => process.env.WIDGET_BASE_URL || process.env.BASE_URL || 'https://web-production-2e7fa.up.railway.app';

// Widget directory path
const getWidgetDir = () => path.join(__dirname, '..', '..', 'widget', 'dist');

/**
 * MCP Resource for widgets
 */
interface WidgetResource {
  uri: string;
  name: string;
  mimeType: string;
  _meta?: Record<string, unknown>;
}

/**
 * Get widget resources (HTML templates served as MCP resources)
 */
function getWidgetResources(): WidgetResource[] {
  const baseUrl = getWidgetBaseUrl();
  
  return [
    // Unified calendar widget with React Router for all views
    {
      uri: 'ui://widget/calendar-widget.html',
      name: 'Calendar Widget',
      mimeType: 'text/html+skybridge',
      _meta: {
        'openai/widgetPrefersBorder': true,
        'openai/widgetDomain': 'https://chatgpt.com',
        'openai/widgetCSP': {
          connect_domains: ['https://chatgpt.com', baseUrl, 'https://accounts.google.com'],
          resource_domains: [baseUrl, 'https://*.oaistatic.com'],
          redirect_domains: ['https://accounts.google.com'],
        },
      },
    },
  ];
}

/**
 * Read widget HTML content
 */
function readWidgetContent(widgetName: string): string {
  const widgetDir = getWidgetDir();
  const widgetPath = path.join(widgetDir, `${widgetName}.html`);
  
  if (fs.existsSync(widgetPath)) {
    return fs.readFileSync(widgetPath, 'utf-8');
  }
  
  return `<html><body><h1>Widget not found: ${widgetName}</h1></body></html>`;
}

/**
 * OpenAI Apps SDK Tool Definition
 * Uses _meta.openai/outputTemplate with ui:// protocol
 */
interface AppsTool {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties?: boolean;
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  securitySchemes?: Array<{ type: string; scopes?: string[] }>;
  _meta: {
    'openai/outputTemplate'?: string;
    'openai/visibility'?: 'public' | 'private';
    'openai/widgetAccessible'?: boolean;
  };
}

/**
 * Define tools with OpenAI Apps SDK _meta format
 * Uses ui:// protocol to reference widget resources
 */
function getTools(): AppsTool[] {
  return [
    {
      name: 'get_pending_reservations',
      title: 'Get Pending Reservations',
      description: 'Fetch pending calendar invitations that the user has not responded to. Returns a list of events where the user is an attendee but has not accepted, declined, or marked as tentative. This tool is safe to call at any time - it will check if the user is authenticated first and prompt for Google Calendar authentication if needed before accessing any calendar data.',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Start date for the search range in ISO 8601 format (e.g., "2024-01-15T00:00:00Z"). Defaults to now.',
          },
          end_date: {
            type: 'string',
            description: 'End date for the search range in ISO 8601 format (e.g., "2024-01-30T23:59:59Z"). Defaults to 14 days from now.',
          },
        },
        required: [],
        additionalProperties: false,
      },
      annotations: {
        title: 'Get Pending Reservations',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      securitySchemes: [
        { type: 'oauth2', scopes: ['calendar:read'] },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
        'openai/visibility': 'public',
        'openai/widgetAccessible': true,
      },
    },
    {
      name: 'respond_to_invite',
      title: 'Respond to Invite',
      description: 'Respond to a pending calendar invitation. You can accept, decline, or mark the invitation as tentative. When asking the user for confirmation, use the event_title parameter to refer to the meeting (e.g., "Should I accept Team Standup Meeting?").',
      inputSchema: {
        type: 'object',
        properties: {
          event_id: {
            type: 'string',
            description: 'The unique event ID from the invites list. This is used to identify which event to respond to.',
          },
          event_title: {
            type: 'string',
            description: 'The title/summary of the event from the invites list. Use this when asking the user for confirmation (e.g., "Team Standup Meeting"). This helps make the confirmation message more readable. If not provided, defaults to "this meeting".',
          },
          response: {
            type: 'string',
            enum: ['accepted', 'declined', 'tentative'],
            description: 'The response to send: "accepted" to accept the invite, "declined" to decline, or "tentative" to indicate you might attend.',
          },
        },
        required: ['event_id', 'response'],
        additionalProperties: false,
      },
      annotations: {
        title: 'Respond to Invite',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      securitySchemes: [
        { type: 'oauth2', scopes: ['calendar:write'] },
      ],
      _meta: {
        'openai/visibility': 'public',
        'openai/widgetAccessible': false,
      },
    },
    {
      name: 'batch_respond_to_invites',
      title: 'Batch Respond to Invites',
      description: 'Respond to multiple calendar invitations at once (maximum 10 invites per batch). Useful for accepting/declining multiple invites in bulk. When asking the user for confirmation, list all the meeting titles to make it clear which events will be affected. If more than 10 invites need to be processed, split into multiple batches.',
      inputSchema: {
        type: 'object',
        properties: {
          invites: {
            type: 'array',
            description: 'Array of invites to respond to (maximum 10). Each item should include the event_id, event_title (for display), and response.',
            items: {
              type: 'object',
              properties: {
                event_id: {
                  type: 'string',
                  description: 'The unique event ID from the invites list.',
                },
                event_title: {
                  type: 'string',
                  description: 'The title/summary of the event. Use this when confirming with the user. If not provided, defaults to "Untitled event".',
                },
                response: {
                  type: 'string',
                  enum: ['accepted', 'declined', 'tentative'],
                  description: 'The response to send for this specific invite.',
                },
              },
              required: ['event_id', 'response'],
              additionalProperties: false,
            },
            minItems: 1,
            maxItems: 10,
          },
        },
        required: ['invites'],
        additionalProperties: false,
      },
      annotations: {
        title: 'Batch Respond to Invites',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      securitySchemes: [
        { type: 'oauth2', scopes: ['calendar:write'] },
      ],
      _meta: {
        'openai/visibility': 'public',
        'openai/widgetAccessible': false,
      },
    },
    {
      name: 'check_auth_status',
      title: 'Check Auth Status',
      description: 'Check if the user is authenticated with Google Calendar. Returns authentication status and provides an auth URL if not authenticated.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
      annotations: {
        title: 'Check Auth Status',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      securitySchemes: [
        { type: 'noauth' },
      ],
      _meta: {
        // 'openai/outputTemplate': 'ui://widget/calendar-widget.html',
        'openai/visibility': 'private', // Hidden from ChatGPT - only widget can call this
        'openai/widgetAccessible': true, // Widget can still call this for polling auth status
      },
    },
  ];
}

/**
 * Apps SDK Tool Response with structuredContent
 */
interface AppsToolResponse {
  content: { type: 'text'; text: string }[];
  structuredContent: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Handle get_pending_reservations tool
 */
async function handleGetPendingReservations(
  args: { start_date?: string; end_date?: string },
  userId: string
): Promise<AppsToolResponse> {
  // Check authentication
  if (!isAuthenticated(userId)) {
    const authUrl = getAuthUrl(userId);
    return {
      content: [{ type: 'text', text: 'User needs to authenticate with Google Calendar.' }],
      structuredContent: {
        authRequired: true,
        authUrl,
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
      },
      isError: false,
    };
  }

  try {
    const result = await getPendingInvites(userId, args.start_date, args.end_date);
    
    return {
      content: [{ 
        type: 'text', 
        text: result.invites.length > 0 
          ? `Found ${result.invites.length} pending invitation(s).`
          : 'No pending invitations found.'
      }],
      structuredContent: {
        invites: result.invites,
        dateRange: result.dateRange,
        totalCount: result.totalCount,
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
      },
      isError: false,
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      structuredContent: { error: error.message },
      isError: true,
    };
  }
}

/**
 * Handle respond_to_invite tool
 */
async function handleRespondToInvite(
  args: { event_id: string; event_title?: string; response: 'accepted' | 'declined' | 'tentative' },
  userId: string
): Promise<AppsToolResponse> {
  if (!args.event_id) {
    return {
      content: [{ type: 'text', text: 'Error: event_id is required' }],
      structuredContent: { error: 'event_id is required', success: false },
      isError: true,
    };
  }
  
  if (!['accepted', 'declined', 'tentative'].includes(args.response)) {
    return {
      content: [{ type: 'text', text: 'Error: response must be accepted, declined, or tentative' }],
      structuredContent: { error: 'Invalid response value', success: false },
      isError: true,
    };
  }

  if (!isAuthenticated(userId)) {
    const authUrl = getAuthUrl(userId);
    return {
      content: [{ type: 'text', text: 'User needs to authenticate first.' }],
      structuredContent: { authRequired: true, authUrl, success: false },
      isError: true,
    };
  }

  try {
    const result = await respondToInvite(userId, args.event_id, args.response);
    
    const action = args.response === 'accepted' ? 'accepted' : args.response === 'declined' ? 'declined' : 'marked as tentative';
    const eventTitle = args.event_title || result.eventSummary || 'this meeting';
    
    return {
      content: [{ type: 'text', text: `Successfully ${action} "${eventTitle}"` }],
      structuredContent: {
        success: true,
        response: args.response,
        eventId: args.event_id,
        message: result.message,
        eventSummary: result.eventSummary,
      },
      isError: false,
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      structuredContent: { error: error.message, success: false },
      isError: true,
    };
  }
}

/**
 * Handle batch_respond_to_invites tool
 */
async function handleBatchRespondToInvites(
  args: {
    invites: Array<{
      event_id: string;
      event_title?: string;
      response: 'accepted' | 'declined' | 'tentative';
    }>;
  },
  userId: string
): Promise<AppsToolResponse> {
  if (!isAuthenticated(userId)) {
    const authUrl = getAuthUrl(userId);
    return {
      content: [{ type: 'text', text: 'User needs to authenticate with Google Calendar first.' }],
      structuredContent: {
        authenticated: false,
        authUrl,
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
      },
      isError: true,
    };
  }

  // Enforce batch size limit
  const MAX_BATCH_SIZE = 10;
  if (args.invites.length > MAX_BATCH_SIZE) {
    return {
      content: [{ type: 'text', text: `Error: Cannot process more than ${MAX_BATCH_SIZE} invites at once. You requested ${args.invites.length} invites. Please split into smaller batches.` }],
      structuredContent: {
        error: 'Batch size limit exceeded',
        maxBatchSize: MAX_BATCH_SIZE,
        requestedSize: args.invites.length,
      },
      isError: true,
    };
  }

  const results = [];
  const successes = [];
  const failures = [];

  // Process each invite
  for (const invite of args.invites) {
    const eventTitle = invite.event_title || 'Untitled event';
    const action = invite.response === 'accepted' ? 'accepted' : invite.response === 'declined' ? 'declined' : 'marked tentative';

    try {
      const result = await respondToInvite(userId, invite.event_id, invite.response);
      results.push({
        eventId: invite.event_id,
        eventTitle: result.eventSummary || eventTitle,
        response: invite.response,
        success: true,
        message: result.message,
      });
      successes.push(`${action} "${result.eventSummary || eventTitle}"`);
    } catch (error: any) {
      results.push({
        eventId: invite.event_id,
        eventTitle,
        response: invite.response,
        success: false,
        error: error.message,
      });
      failures.push(`Failed to ${invite.response.replace('ed', '').replace('tentative', 'mark tentative')} "${eventTitle}": ${error.message}`);
    }
  }

  // Build summary message
  const total = args.invites.length;
  const successCount = successes.length;
  const failureCount = failures.length;

  let summary = '';
  if (successCount > 0) {
    summary += `Successfully processed ${successCount}/${total} invite${successCount !== 1 ? 's' : ''}:\n`;
    summary += successes.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
  if (failureCount > 0) {
    if (summary) summary += '\n\n';
    summary += `Failed to process ${failureCount}/${total} invite${failureCount !== 1 ? 's' : ''}:\n`;
    summary += failures.map((f, i) => `${i + 1}. ${f}`).join('\n');
  }

  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: {
      total,
      successCount,
      failureCount,
      results,
    },
    isError: failureCount === total, // Only error if ALL failed
  };
}

/**
 * Handle check_auth_status tool
 */
function handleCheckAuthStatus(userId: string): AppsToolResponse {
  const authenticated = isAuthenticated(userId);
  
  if (authenticated) {
    return {
      content: [{ type: 'text', text: 'User is connected to Google Calendar.' }],
      structuredContent: {
        authenticated: true,
        email: getUserEmail(userId),
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
      },
      isError: false,
    };
  } else {
    const authUrl = getAuthUrl(userId);
    return {
      content: [{ type: 'text', text: 'User needs to connect Google Calendar.' }],
      structuredContent: {
        authenticated: false,
        authUrl,
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/calendar-widget.html',
      },
      isError: false,
    };
  }
}

/**
 * MCP Server Information
 */
const SERVER_INFO = {
  name: 'reservations-manager',
  version: '1.0.0',
};

/**
 * MCP Server Capabilities (2025 Apps SDK)
 */
const SERVER_CAPABILITIES = {
  tools: {
    listChanged: false,
  },
  resources: {
    subscribe: false,
    listChanged: false,
  },
  experimental: {
    'openai/visibility': {
      enabled: true,
    },
  },
};

/**
 * Create and configure the MCP server
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'reservations-manager',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getTools() as unknown as Tool[] };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const userId = DEFAULT_USER_ID;

    switch (name) {
      case 'get_pending_reservations':
        return await handleGetPendingReservations(
          args as { start_date?: string; end_date?: string },
          userId
        ) as unknown as CallToolResult;

      case 'respond_to_invite':
        return await handleRespondToInvite(
          args as { event_id: string; event_title?: string; response: 'accepted' | 'declined' | 'tentative' },
          userId
        ) as unknown as CallToolResult;

      case 'batch_respond_to_invites':
        return await handleBatchRespondToInvites(
          args as { invites: Array<{ event_id: string; event_title?: string; response: 'accepted' | 'declined' | 'tentative' }> },
          userId
        ) as unknown as CallToolResult;

      case 'check_auth_status':
        return handleCheckAuthStatus(userId) as unknown as CallToolResult;

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: getWidgetResources() };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    console.error('Reading resource:', uri);
    
    // Parse the widget name from ui://widget/name.html
    const match = uri.match(/^ui:\/\/widget\/(.+\.html)$/);
    if (match) {
      const widgetName = match[1].replace('.html', '');
      const content = readWidgetContent(widgetName);
      
      // Get metadata from resources
      const resources = getWidgetResources();
      const resource = resources.find(r => r.uri === uri);
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/html+skybridge',
            text: content,
            _meta: resource?._meta || {},
          },
        ],
      };
    }
    
    throw new Error(`Resource not found: ${uri}`);
  });

  return server;
}

/**
 * Start the MCP server with stdio transport (for CLI usage)
 */
export async function startMCPServerStdio(): Promise<void> {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}


function extractUserId(params: Record<string, unknown>): string {
  const meta = params._meta as Record<string, unknown> | undefined;
  const subject = meta?.['openai/subject'] as string | undefined;
  
  if (subject && typeof subject === 'string') {
    console.log(`Extracted user ID from request: ${subject}`);
    return subject;
  }
  
  // Fallback to default for backward compatibility
  console.warn('No user ID found in request, using default');
  return DEFAULT_USER_ID;
}

/**
 * Handle MCP request via HTTP (for web integration)
 * Implements the 2025 Apps SDK MCP protocol with resources
 */
export async function handleMCPRequest(
  method: string,
  params: Record<string, unknown>,
  fallbackUserId: string = DEFAULT_USER_ID
): Promise<unknown> {
  console.log(`MCP method called: ${method}`, JSON.stringify(params));
  
  const userId = extractUserId(params);
  
  switch (method) {
    // ============================================
    // Lifecycle Methods
    // ============================================
    
    case 'initialize': {
      const clientInfo = params.clientInfo as { name?: string; version?: string } | undefined;
      const clientProtocolVersion = params.protocolVersion as string | undefined;
      
      console.log('MCP initialize request:', JSON.stringify(params));
      console.log('MCP initialize from client:', clientInfo, 'protocol:', clientProtocolVersion);
      
      const protocolVersion = clientProtocolVersion || '2024-11-05';
      
      const response = {
        protocolVersion,
        serverInfo: SERVER_INFO,
        capabilities: SERVER_CAPABILITIES,
        instructions: 'This server manages Google Calendar reservations. Use get_pending_reservations to list pending calendar invites (will prompt for authentication if needed), and respond_to_invite to accept/decline invitations.',
      };
      
      console.log('MCP initialize response:', JSON.stringify(response));
      return response;
    }
    
    case 'initialized': {
      console.log('MCP client initialized');
      return {};
    }
    
    case 'notifications/initialized': {
      console.log('MCP client notifications/initialized');
      return {};
    }
    
    case 'ping': {
      return { status: 'ok' };
    }
    
    case 'shutdown': {
      console.log('MCP client shutdown');
      return {};
    }

    // ============================================
    // Tool Methods
    // ============================================
    
    case 'tools/list':
      return { tools: getTools() };

    case 'tools/call': {
      const { name, arguments: args, _meta } = params as {
        name: string;
        arguments: Record<string, unknown>;
        _meta?: Record<string, unknown>;
      };
      
      // Extract userId from tool call metadata
      const toolUserId = _meta?.['openai/subject'] as string | undefined || userId;
      console.log(`Tool call: ${name} for user: ${toolUserId}`);

      switch (name) {
        case 'get_pending_reservations':
          return await handleGetPendingReservations(
            args as { start_date?: string; end_date?: string },
            toolUserId
          );

        case 'respond_to_invite':
          return await handleRespondToInvite(
            args as { event_id: string; event_title?: string; response: 'accepted' | 'declined' | 'tentative' },
            toolUserId
          );

        case 'batch_respond_to_invites':
          return await handleBatchRespondToInvites(
            args as { invites: Array<{ event_id: string; event_title?: string; response: 'accepted' | 'declined' | 'tentative' }> },
            toolUserId
          );

        case 'check_auth_status':
          return handleCheckAuthStatus(toolUserId);

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            structuredContent: { error: `Unknown tool: ${name}` },
            isError: true,
          };
      }
    }

    // ============================================
    // Resource Methods (Widget Templates)
    // ============================================
    
    case 'resources/list':
      return { resources: getWidgetResources() };
    
    case 'resources/read': {
      const uri = params.uri as string;
      console.log('Reading resource:', uri);
      
      // Parse the widget name from ui://widget/name.html
      const match = uri.match(/^ui:\/\/widget\/(.+\.html)$/);
      if (match) {
        const widgetName = match[1].replace('.html', '');
        const content = readWidgetContent(widgetName);
        
        // Get metadata from resources
        const resources = getWidgetResources();
        const resource = resources.find(r => r.uri === uri);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'text/html+skybridge',
              text: content,
              _meta: resource?._meta || {},
            },
          ],
        };
      }
      
      return { contents: [] };
    }
    
    case 'resources/templates/list':
      return { resourceTemplates: [] };

    // ============================================
    // Prompt Methods (not implemented)
    // ============================================
    
    case 'prompts/list':
      return { prompts: [] };
    
    case 'prompts/get':
      throw new Error('Prompt not found');

    // ============================================
    // Other Methods
    // ============================================
    
    case 'completion/complete':
      return { completion: { values: [] } };

    case 'logging/setLevel':
      return {};

    default:
      console.warn(`Unknown MCP method: ${method}`);
      throw new Error(`Unknown MCP method: ${method}`);
  }
}
