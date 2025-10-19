/**
 * Agent Management API Routes
 *
 * POST   /api/v1/agents       - Create a new agent
 * GET    /api/v1/agents       - List all agents with filters
 */

import { NextRequest } from 'next/server';
import { agentService } from '@/services/agent-service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { CreateAgentRequest } from '@/types/agent';

/**
 * POST /api/v1/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAgentRequest;

    // Validate request body
    const validation = agentService.validateAgentConfig(body);
    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
    }

    // TODO: Extract user ID from JWT/session
    const userId = 'temp-user-id';

    // Create agent
    const agent = await agentService.createAgent(body, userId);

    return successResponse(
      {
        id: agent.id,
        status: agent.status,
        message: 'Agent created successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error creating agent:', error);

    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    return serverErrorResponse('Failed to create agent');
  }
}

/**
 * GET /api/v1/agents
 * List agents with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const filters = {
      type: searchParams.get('type') as any,
      status: searchParams.get('status') as any,
      environment: searchParams.get('environment') as any,
    };

    // Remove undefined filters
    Object.keys(filters).forEach(
      (key) => filters[key as keyof typeof filters] === null && delete filters[key as keyof typeof filters]
    );

    // Get agents
    const result = await agentService.listAgents(filters, page, limit);

    return successResponse(result);
  } catch (error) {
    console.error('Error listing agents:', error);
    return serverErrorResponse('Failed to retrieve agents');
  }
}
