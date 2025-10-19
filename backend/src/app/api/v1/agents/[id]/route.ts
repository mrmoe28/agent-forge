/**
 * Individual Agent API Routes
 * 
 * GET /api/v1/agents/[id] - Get agent status and metrics
 * Fetches status/metrics via orchestration + monitoring services
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/ServiceFactory';
import { ApiResponse } from '@/types/api';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/agents/[id]
 * Get agent status and metrics by ID
 */
export async function GET(
  request: NextRequest, 
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  const agentId = params.id;
  
  try {
    // Get services
    const services = await getServices();
    const { agentOrchestration, monitoring } = services;

    // Validate agent ID format
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid agent ID in GET request',
        service: 'api-agents',
        metadata: { 
          endpoint: 'GET /api/v1/agents/[id]',
          providedId: agentId
        }
      });

      return NextResponse.json(
        {
          error: {
            code: 'INVALID_AGENT_ID',
            message: 'Agent ID must be a non-empty string',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Log agent fetch attempt
    await monitoring.log({
      level: 'info',
      message: `Fetching agent details: ${agentId}`,
      service: 'api-agents',
      agentId,
      metadata: {
        endpoint: 'GET /api/v1/agents/[id]'
      }
    });

    // Get agent data from orchestration service
    const agentResult = await agentOrchestration.getAgent(agentId);
    
    if (agentResult.error) {
      const statusCode = agentResult.error.code === 'AGENT_NOT_FOUND' ? 404 : 500;
      
      await monitoring.log({
        level: agentResult.error.code === 'AGENT_NOT_FOUND' ? 'info' : 'error',
        message: `Agent fetch failed: ${agentResult.error.message}`,
        service: 'api-agents',
        agentId,
        error: agentResult.error.code !== 'AGENT_NOT_FOUND' ? {
          name: 'AgentFetchError',
          message: agentResult.error.message
        } : undefined,
        metadata: {
          endpoint: 'GET /api/v1/agents/[id]',
          errorCode: agentResult.error.code
        }
      });

      await monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'GET_/api/v1/agents/[id]',
          errorType: agentResult.error.code.toLowerCase(),
          statusCode: statusCode.toString()
        },
        timestamp: new Date()
      });

      return NextResponse.json(agentResult, { status: statusCode });
    }

    // Extract agent and metrics from result
    const { agent, metrics } = agentResult.data!;

    // Get additional monitoring data for the agent
    const agentLogs = await monitoring.getLogs({
      agentId,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }, 50);

    // Prepare enhanced response with monitoring data
    const enhancedResponse = {
      agent,
      metrics,
      monitoring: {
        recentLogs: agentLogs.data || [],
        healthStatus: agent.status === 'active' ? 'healthy' : 
                     agent.status === 'error' ? 'unhealthy' : 'unknown',
        lastActivity: metrics.performanceHistory.length > 0 
          ? metrics.performanceHistory[metrics.performanceHistory.length - 1]?.date
          : agent.lastRunAt
      }
    };

    // Record success metrics
    await monitoring.recordMetric({
      name: 'api.agents.fetched',
      value: 1,
      type: 'counter',
      tags: {
        agentType: agent.type,
        agentStatus: agent.status,
        environment: agent.environment
      },
      timestamp: new Date()
    });

    await monitoring.recordMetric({
      name: 'api.response_time',
      value: Date.now() - startTime,
      type: 'timer',
      tags: {
        endpoint: 'GET_/api/v1/agents/[id]',
        status: 'success'
      },
      timestamp: new Date()
    });

    await monitoring.log({
      level: 'info',
      message: `Agent details fetched successfully: ${agentId}`,
      service: 'api-agents',
      agentId,
      metadata: {
        endpoint: 'GET /api/v1/agents/[id]',
        agentStatus: agent.status,
        totalExecutions: metrics.totalExecutions,
        processingTime: Date.now() - startTime
      }
    });

    const response: ApiResponse<typeof enhancedResponse> = {
      data: enhancedResponse,
      meta: {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        version: '1.0.0'
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // Handle unexpected errors
    const services = await getServices().catch(() => null);
    if (services?.monitoring) {
      await services.monitoring.log({
        level: 'error',
        message: 'Unexpected error in agent fetch endpoint',
        service: 'api-agents',
        agentId,
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { endpoint: 'GET /api/v1/agents/[id]' }
      });

      await services.monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'GET_/api/v1/agents/[id]',
          errorType: 'unexpected_error',
          statusCode: '500'
        },
        timestamp: new Date()
      });
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date()
        }
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/agents/[id]
 * Update agent configuration or status
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  const agentId = params.id;
  
  try {
    // Get services
    const services = await getServices();
    const { agentOrchestration, monitoring } = services;

    // Parse request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid JSON in agent update request',
        service: 'api-agents',
        agentId,
        error: {
          name: 'InvalidJSON',
          message: error instanceof Error ? error.message : 'JSON parse failed'
        },
        metadata: { endpoint: 'PUT /api/v1/agents/[id]' }
      });

      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format in request body',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate agent ID
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_AGENT_ID',
            message: 'Agent ID must be a non-empty string',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Handle status updates
    if (requestBody.status) {
      await monitoring.log({
        level: 'info',
        message: `Updating agent status: ${agentId} -> ${requestBody.status}`,
        service: 'api-agents',
        agentId,
        metadata: {
          endpoint: 'PUT /api/v1/agents/[id]',
          newStatus: requestBody.status,
          oldStatus: 'unknown' // Would get from current agent state
        }
      });

      const updateResult = await agentOrchestration.updateAgentStatus(agentId, {
        status: requestBody.status,
        timestamp: new Date(),
        errorMessage: requestBody.errorMessage
      });

      if (updateResult.error) {
        const statusCode = updateResult.error.code === 'AGENT_NOT_FOUND' ? 404 : 500;
        
        await monitoring.log({
          level: 'error',
          message: `Agent status update failed: ${updateResult.error.message}`,
          service: 'api-agents',
          agentId,
          error: {
            name: 'AgentUpdateError',
            message: updateResult.error.message
          },
          metadata: {
            endpoint: 'PUT /api/v1/agents/[id]',
            errorCode: updateResult.error.code
          }
        });

        return NextResponse.json(updateResult, { status: statusCode });
      }

      // Record success metrics
      await monitoring.recordMetric({
        name: 'api.agents.updated',
        value: 1,
        type: 'counter',
        tags: {
          updateType: 'status',
          newStatus: requestBody.status,
          agentId
        },
        timestamp: new Date()
      });

      await monitoring.log({
        level: 'info',
        message: `Agent status updated successfully: ${agentId}`,
        service: 'api-agents',
        agentId,
        metadata: {
          endpoint: 'PUT /api/v1/agents/[id]',
          newStatus: requestBody.status,
          processingTime: Date.now() - startTime
        }
      });

      return NextResponse.json(updateResult, { status: 200 });
    }

    // Handle other update types (configuration, etc.)
    // TODO: Implement full agent configuration updates
    
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_TYPE_NOT_SUPPORTED',
          message: 'Only status updates are currently supported',
          timestamp: new Date()
        }
      } as ApiResponse,
      { status: 400 }
    );

  } catch (error) {
    // Handle unexpected errors
    const services = await getServices().catch(() => null);
    if (services?.monitoring) {
      await services.monitoring.log({
        level: 'error',
        message: 'Unexpected error in agent update endpoint',
        service: 'api-agents',
        agentId,
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { endpoint: 'PUT /api/v1/agents/[id]' }
      });
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date()
        }
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/agents/[id]
 * Delete an agent and cleanup resources
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  const agentId = params.id;
  
  try {
    // Get services
    const services = await getServices();
    const { agentOrchestration, monitoring } = services;

    // Validate agent ID
    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_AGENT_ID',
            message: 'Agent ID must be a non-empty string',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    await monitoring.log({
      level: 'warn',
      message: `Deleting agent: ${agentId}`,
      service: 'api-agents',
      agentId,
      metadata: { endpoint: 'DELETE /api/v1/agents/[id]' }
    });

    // Delete agent via orchestration service
    const deleteResult = await agentOrchestration.deleteAgent(agentId);
    
    if (deleteResult.error) {
      const statusCode = deleteResult.error.code === 'AGENT_NOT_FOUND' ? 404 : 500;
      
      await monitoring.log({
        level: 'error',
        message: `Agent deletion failed: ${deleteResult.error.message}`,
        service: 'api-agents',
        agentId,
        error: {
          name: 'AgentDeletionError',
          message: deleteResult.error.message
        },
        metadata: {
          endpoint: 'DELETE /api/v1/agents/[id]',
          errorCode: deleteResult.error.code
        }
      });

      return NextResponse.json(deleteResult, { status: statusCode });
    }

    // Record success metrics
    await monitoring.recordMetric({
      name: 'api.agents.deleted',
      value: 1,
      type: 'counter',
      tags: { agentId },
      timestamp: new Date()
    });

    await monitoring.log({
      level: 'warn',
      message: `Agent deleted successfully: ${agentId}`,
      service: 'api-agents',
      agentId,
      metadata: {
        endpoint: 'DELETE /api/v1/agents/[id]',
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json(deleteResult, { status: 200 });

  } catch (error) {
    // Handle unexpected errors
    const services = await getServices().catch(() => null);
    if (services?.monitoring) {
      await services.monitoring.log({
        level: 'error',
        message: 'Unexpected error in agent deletion endpoint',
        service: 'api-agents',
        agentId,
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { endpoint: 'DELETE /api/v1/agents/[id]' }
      });
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date()
        }
      } as ApiResponse,
      { status: 500 }
    );
  }
}