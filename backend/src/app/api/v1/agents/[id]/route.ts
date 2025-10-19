/**
 * Individual Agent API Routes
 *
 * GET    /api/v1/agents/{id}       - Get agent details
 * DELETE /api/v1/agents/{id}       - Delete agent
 * PATCH  /api/v1/agents/{id}/status - Update agent status
 */

import { NextRequest } from 'next/server';
import { agentService } from '@/services/agent-service';
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
  errorResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/v1/agents/{id}
 * Get agent details and metrics
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = await agentService.getAgentById(id);

    if (!agent) {
      return notFoundResponse('Agent');
    }

    // Get metrics if available
    const metrics = await agentService.getAgentMetrics(id);

    return successResponse({
      ...agent,
      metrics,
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    return serverErrorResponse('Failed to retrieve agent');
  }
}

/**
 * DELETE /api/v1/agents/{id}
 * Delete an agent
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = await agentService.getAgentById(id);

    if (!agent) {
      return notFoundResponse('Agent');
    }

    // TODO: Check if user has permission to delete this agent
    // if (agent.createdBy !== currentUserId) {
    //   return forbiddenResponse();
    // }

    await agentService.deleteAgent(id);

    return successResponse({
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return serverErrorResponse('Failed to delete agent');
  }
}

/**
 * PATCH /api/v1/agents/{id}/status
 * Update agent status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const agent = await agentService.getAgentById(id);

    if (!agent) {
      return notFoundResponse('Agent');
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'pending', 'error'];
    if (!validStatuses.includes(body.status)) {
      return errorResponse('Invalid status value', 400);
    }

    await agentService.updateAgentStatus(id, {
      status: body.status,
      errorMessage: body.errorMessage,
      timestamp: new Date(),
    });

    return successResponse({
      message: 'Agent status updated successfully',
    });
  } catch (error) {
    console.error('Error updating agent status:', error);

    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    return serverErrorResponse('Failed to update agent status');
  }
}
