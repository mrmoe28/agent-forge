/**
 * Memory Query API Routes
 * 
 * POST /api/v1/memory/query - Query agent memory
 * Delegates to MemoryService, supports limit parameter and contextual queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/ServiceFactory';
import { MemoryQueryRequest, MemoryAccessPattern, MemoryChunkType } from '@/types/memory';
import { ApiResponse } from '@/types/api';

/**
 * POST /api/v1/memory/query
 * Query agent memory using vector similarity search
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Get services
    const services = await getServices();
    const { memory, monitoring } = services;

    // Parse request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid JSON in memory query request',
        service: 'api-memory',
        error: {
          name: 'InvalidJSON',
          message: error instanceof Error ? error.message : 'JSON parse failed'
        },
        metadata: { endpoint: 'POST /api/v1/memory/query' }
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
    const validationResult = validateMemoryQueryRequest(requestBody);
    if (!validationResult.valid) {
      await monitoring.log({
        level: 'warn',
        message: 'Memory query request validation failed',
        service: 'api-memory',
        metadata: { 
          endpoint: 'POST /api/v1/memory/query',
          validationErrors: validationResult.errors,
          agentId: requestBody.agentId
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

    // Log memory query attempt
    await monitoring.log({
      level: 'info',
      message: `Querying agent memory: ${requestBody.agentId}`,
      service: 'api-memory',
      agentId: requestBody.agentId,
      metadata: {
        endpoint: 'POST /api/v1/memory/query',
        query: requestBody.query.substring(0, 100) + (requestBody.query.length > 100 ? '...' : ''),
        limit: requestBody.limit,
        accessPattern: requestBody.accessPattern
      }
    });

    // Build memory query request
    const memoryQuery: MemoryQueryRequest = {
      agentId: requestBody.agentId,
      query: requestBody.query,
      limit: requestBody.limit || 5,
      minSimilarity: requestBody.minSimilarity,
      includeTypes: requestBody.includeTypes,
      excludeTypes: requestBody.excludeTypes,
      timeRange: requestBody.timeRange ? {
        from: new Date(requestBody.timeRange.from),
        to: new Date(requestBody.timeRange.to)
      } : undefined,
      tags: requestBody.tags,
      accessPattern: requestBody.accessPattern || 'similar'
    };

    // Execute memory query
    const queryResult = await memory.queryMemory(memoryQuery);
    
    if (queryResult.error) {
      await monitoring.log({
        level: 'error',
        message: `Memory query failed: ${queryResult.error.message}`,
        service: 'api-memory',
        agentId: requestBody.agentId,
        error: {
          name: 'MemoryQueryError',
          message: queryResult.error.message
        },
        metadata: {
          endpoint: 'POST /api/v1/memory/query',
          errorCode: queryResult.error.code,
          query: requestBody.query.substring(0, 100)
        }
      });

      return NextResponse.json(
        queryResult,
        { status: queryResult.error.code === 'VALIDATION_FAILED' ? 400 : 500 }
      );
    }

    // Enhance response with additional metadata
    const enhancedResponse = {
      ...queryResult.data!,
      query: {
        originalQuery: requestBody.query,
        processedQuery: requestBody.query, // TODO: Show any query preprocessing
        parameters: {
          limit: memoryQuery.limit,
          minSimilarity: memoryQuery.minSimilarity,
          accessPattern: memoryQuery.accessPattern,
          filtersApplied: [
            ...(memoryQuery.includeTypes ? ['includeTypes'] : []),
            ...(memoryQuery.excludeTypes ? ['excludeTypes'] : []),
            ...(memoryQuery.timeRange ? ['timeRange'] : []),
            ...(memoryQuery.tags ? ['tags'] : []),
            ...(memoryQuery.minSimilarity ? ['minSimilarity'] : [])
          ]
        }
      },
      performance: {
        processingTime: queryResult.data!.processingTime,
        totalMatches: queryResult.data!.totalMatches,
        returnedResults: queryResult.data!.chunks.length,
        averageRelevance: queryResult.data!.chunks.length > 0 
          ? queryResult.data!.chunks.reduce((sum, chunk) => sum + (chunk.relevanceScore || 0), 0) / queryResult.data!.chunks.length
          : 0
      }
    };

    // Record success metrics
    await monitoring.recordMetric({
      name: 'api.memory.queries',
      value: 1,
      type: 'counter',
      tags: {
        agentId: requestBody.agentId,
        accessPattern: memoryQuery.accessPattern,
        resultsCount: queryResult.data!.chunks.length.toString(),
        hasResults: (queryResult.data!.chunks.length > 0).toString()
      },
      timestamp: new Date()
    });

    await monitoring.recordMetric({
      name: 'api.memory.query_processing_time',
      value: queryResult.data!.processingTime,
      type: 'timer',
      tags: {
        agentId: requestBody.agentId,
        resultsCount: queryResult.data!.chunks.length.toString()
      },
      timestamp: new Date()
    });

    await monitoring.recordMetric({
      name: 'api.response_time',
      value: Date.now() - startTime,
      type: 'timer',
      tags: {
        endpoint: 'POST_/api/v1/memory/query',
        status: 'success'
      },
      timestamp: new Date()
    });

    await monitoring.log({
      level: 'info',
      message: `Memory query completed successfully: ${requestBody.agentId}`,
      service: 'api-memory',
      agentId: requestBody.agentId,
      metadata: {
        endpoint: 'POST /api/v1/memory/query',
        resultsCount: queryResult.data!.chunks.length,
        totalMatches: queryResult.data!.totalMatches,
        processingTime: queryResult.data!.processingTime,
        totalRequestTime: Date.now() - startTime
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
        message: 'Unexpected error in memory query endpoint',
        service: 'api-memory',
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { endpoint: 'POST /api/v1/memory/query' }
      });

      await services.monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'POST_/api/v1/memory/query',
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
 * Validate MemoryQueryRequest payload
 */
function validateMemoryQueryRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!body.agentId || typeof body.agentId !== 'string' || body.agentId.trim().length === 0) {
    errors.push('agentId: Required field, must be a non-empty string');
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    errors.push('query: Required field, must be a non-empty string');
  }

  // Validate limit (optional, defaults to 5)
  if (body.limit !== undefined) {
    if (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100) {
      errors.push('limit: Must be an integer between 1 and 100');
    }
  }

  // Validate minSimilarity (optional)
  if (body.minSimilarity !== undefined) {
    if (typeof body.minSimilarity !== 'number' || body.minSimilarity < 0 || body.minSimilarity > 1) {
      errors.push('minSimilarity: Must be a number between 0 and 1');
    }
  }

  // Validate includeTypes (optional)
  if (body.includeTypes !== undefined) {
    if (!Array.isArray(body.includeTypes)) {
      errors.push('includeTypes: Must be an array');
    } else {
      const invalidTypes = body.includeTypes.filter((type: any) => !isValidMemoryChunkType(type));
      if (invalidTypes.length > 0) {
        errors.push(`includeTypes: Invalid chunk types: ${invalidTypes.join(', ')}`);
      }
    }
  }

  // Validate excludeTypes (optional)
  if (body.excludeTypes !== undefined) {
    if (!Array.isArray(body.excludeTypes)) {
      errors.push('excludeTypes: Must be an array');
    } else {
      const invalidTypes = body.excludeTypes.filter((type: any) => !isValidMemoryChunkType(type));
      if (invalidTypes.length > 0) {
        errors.push(`excludeTypes: Invalid chunk types: ${invalidTypes.join(', ')}`);
      }
    }
  }

  // Validate timeRange (optional)
  if (body.timeRange !== undefined) {
    if (!body.timeRange || typeof body.timeRange !== 'object') {
      errors.push('timeRange: Must be an object with from and to dates');
    } else {
      if (!body.timeRange.from || !isValidDateString(body.timeRange.from)) {
        errors.push('timeRange.from: Must be a valid ISO date string');
      }
      if (!body.timeRange.to || !isValidDateString(body.timeRange.to)) {
        errors.push('timeRange.to: Must be a valid ISO date string');
      }
      
      // Check that from is before to
      if (body.timeRange.from && body.timeRange.to) {
        const fromDate = new Date(body.timeRange.from);
        const toDate = new Date(body.timeRange.to);
        if (fromDate >= toDate) {
          errors.push('timeRange: from date must be before to date');
        }
      }
    }
  }

  // Validate tags (optional)
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push('tags: Must be an array of strings');
    } else {
      const invalidTags = body.tags.filter((tag: any) => typeof tag !== 'string');
      if (invalidTags.length > 0) {
        errors.push('tags: All elements must be strings');
      }
    }
  }

  // Validate accessPattern (optional, defaults to 'similar')
  if (body.accessPattern !== undefined && !isValidMemoryAccessPattern(body.accessPattern)) {
    errors.push('accessPattern: Must be one of: recent, frequent, similar, contextual, temporal');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard for MemoryChunkType
 */
function isValidMemoryChunkType(type: any): type is MemoryChunkType {
  const validTypes = [
    'conversation', 'document', 'code_snippet', 'api_response', 
    'knowledge_base', 'user_context', 'system_message'
  ];
  return validTypes.includes(type);
}

/**
 * Type guard for MemoryAccessPattern
 */
function isValidMemoryAccessPattern(pattern: any): pattern is MemoryAccessPattern {
  const validPatterns = ['recent', 'frequent', 'similar', 'contextual', 'temporal'];
  return validPatterns.includes(pattern);
}

/**
 * Validate ISO date string
 */
function isValidDateString(dateString: any): boolean {
  if (typeof dateString !== 'string') return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
