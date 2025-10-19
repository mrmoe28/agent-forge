/**
 * Agent Management API Routes
 * 
 * POST /api/v1/agents - Create new agent instance
 * Validates payload, calls AgentOrchestrationService.create, returns agent metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/ServiceFactory';
import { CreateAgentRequest, AgentType, APICapability, DeploymentEnvironment } from '@/types/agent';
import { ApiResponse } from '@/types/api';

/**
 * POST /api/v1/agents
 * Create a new agent instance
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Get services
    const services = await getServices();
    const { agentOrchestration, auth, monitoring } = services;

    // Parse request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid JSON in agent creation request',
        service: 'api-agents',
        error: {
          name: 'InvalidJSON',
          message: error instanceof Error ? error.message : 'JSON parse failed'
        },
        metadata: { endpoint: 'POST /api/v1/agents' }
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

    // Validate required fields
    const validationResult = validateCreateAgentRequest(requestBody);
    if (!validationResult.valid) {
      await monitoring.log({
        level: 'warn',
        message: 'Agent creation request validation failed',
        service: 'api-agents',
        metadata: { 
          endpoint: 'POST /api/v1/agents',
          validationErrors: validationResult.errors
        }
      });

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Request validation failed',
            details: { errors: validationResult.errors },
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Log agent creation attempt
    await monitoring.log({
      level: 'info',
      message: `Creating new agent: ${requestBody.name}`,
      service: 'api-agents',
      metadata: {
        endpoint: 'POST /api/v1/agents',
        agentName: requestBody.name,
        agentType: requestBody.type,
        capabilities: requestBody.capabilities
      }
    });

    // Create agent via orchestration service
    const createResult = await agentOrchestration.createAgent(requestBody as CreateAgentRequest);
    
    if (createResult.error) {
      await monitoring.log({
        level: 'error',
        message: `Agent creation failed: ${createResult.error.message}`,
        service: 'api-agents',
        error: {
          name: 'AgentCreationError',
          message: createResult.error.message
        },
        metadata: {
          endpoint: 'POST /api/v1/agents',
          agentName: requestBody.name,
          errorCode: createResult.error.code
        }
      });

      return NextResponse.json(
        createResult,
        { status: createResult.error.code === 'VALIDATION_FAILED' ? 400 : 500 }
      );
    }

    // Record success metrics
    await monitoring.recordMetric({
      name: 'api.agents.created',
      value: 1,
      type: 'counter',
      tags: {
        agentType: requestBody.type,
        environment: requestBody.environment || 'staging'
      },
      timestamp: new Date()
    });

    await monitoring.recordMetric({
      name: 'api.response_time',
      value: Date.now() - startTime,
      type: 'timer',
      tags: {
        endpoint: 'POST_/api/v1/agents',
        status: 'success'
      },
      timestamp: new Date()
    });

    await monitoring.log({
      level: 'info',
      message: `Agent created successfully: ${createResult.data?.agent?.id}`,
      service: 'api-agents',
      metadata: {
        endpoint: 'POST /api/v1/agents',
        agentId: createResult.data?.agent?.id,
        agentName: requestBody.name,
        deploymentId: createResult.data?.deployment?.deploymentId,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json(createResult, { status: 201 });

  } catch (error) {
    // Handle unexpected errors
    const services = await getServices().catch(() => null);
    if (services?.monitoring) {
      await services.monitoring.log({
        level: 'error',
        message: 'Unexpected error in agent creation endpoint',
        service: 'api-agents',
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { endpoint: 'POST /api/v1/agents' }
      });

      await services.monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'POST_/api/v1/agents',
          errorType: 'unexpected_error'
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
 * Validate CreateAgentRequest payload
 */
function validateCreateAgentRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name: Required field, must be a non-empty string');
  }

  if (!body.type || !isValidAgentType(body.type)) {
    errors.push('type: Required field, must be one of: code-assistant, document-manager, qa-bot');
  }

  if (!body.purpose || typeof body.purpose !== 'string' || body.purpose.trim().length === 0) {
    errors.push('purpose: Required field, must be a non-empty string');
  }

  // Capabilities validation
  if (!Array.isArray(body.capabilities)) {
    errors.push('capabilities: Required field, must be an array');
  } else {
    const invalidCapabilities = body.capabilities.filter((cap: any) => !isValidAPICapability(cap));
    if (invalidCapabilities.length > 0) {
      errors.push(`capabilities: Invalid capabilities: ${invalidCapabilities.join(', ')}`);
    }
  }

  // Permissions validation
  if (!body.permissions || typeof body.permissions !== 'object') {
    errors.push('permissions: Required field, must be an object');
  } else {
    const requiredPermFields = ['readFiles', 'modifyFiles', 'createFiles', 'executeCode', 'sendMessages'];
    for (const field of requiredPermFields) {
      if (typeof body.permissions[field] !== 'boolean') {
        errors.push(`permissions.${field}: Required field, must be a boolean`);
      }
    }
  }

  // Triggers validation
  if (!body.triggers || typeof body.triggers !== 'object') {
    errors.push('triggers: Required field, must be an object');
  }

  // Config validation
  if (!body.config || typeof body.config !== 'object') {
    errors.push('config: Required field, must be an object');
  } else {
    if (!body.config.memory || typeof body.config.memory !== 'object') {
      errors.push('config.memory: Required field, must be an object');
    }
    if (!body.config.reasoning || typeof body.config.reasoning !== 'object') {
      errors.push('config.reasoning: Required field, must be an object');
    }
  }

  // Environment validation (optional, defaults to staging)
  if (body.environment && !isValidDeploymentEnvironment(body.environment)) {
    errors.push('environment: Must be either "production" or "staging"');
  }

  // Monitoring flag (optional, defaults to true)
  if (body.monitoringEnabled !== undefined && typeof body.monitoringEnabled !== 'boolean') {
    errors.push('monitoringEnabled: Must be a boolean if provided');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard for AgentType
 */
function isValidAgentType(type: any): type is AgentType {
  return ['code-assistant', 'document-manager', 'qa-bot'].includes(type);
}

/**
 * Type guard for APICapability
 */
function isValidAPICapability(capability: any): capability is APICapability {
  const validCapabilities = [
    'openai', 'github', 'dropbox', 'slack', 'aws-s3', 
    'google-drive', 'postgresql', 'vector-db', 'web-search'
  ];
  return validCapabilities.includes(capability);
}

/**
 * Type guard for DeploymentEnvironment
 */
function isValidDeploymentEnvironment(env: any): env is DeploymentEnvironment {
  return ['production', 'staging'].includes(env);
}