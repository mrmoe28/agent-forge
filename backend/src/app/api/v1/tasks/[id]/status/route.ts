/**
 * Task Status API Routes
 * 
 * PUT /api/v1/tasks/[id]/status - Update task status
 * Updates task status via TaskQueueService and logs result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/ServiceFactory';
import { TaskStatus, TaskStatusUpdate, TaskResult, TaskError } from '@/types/task';
import { ApiResponse } from '@/types/api';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PUT /api/v1/tasks/[id]/status
 * Update task status and execution result
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const startTime = Date.now();
  const taskId = params.id;
  
  try {
    // Get services
    const services = await getServices();
    const { taskQueue, monitoring } = services;

    // Parse request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid JSON in task status update request',
        service: 'api-tasks',
        metadata: { 
          endpoint: 'PUT /api/v1/tasks/[id]/status',
          taskId,
          error: error instanceof Error ? error.message : 'JSON parse failed'
        }
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

    // Validate task ID
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      await monitoring.log({
        level: 'warn',
        message: 'Invalid task ID in status update request',
        service: 'api-tasks',
        metadata: { 
          endpoint: 'PUT /api/v1/tasks/[id]/status',
          providedId: taskId
        }
      });

      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a non-empty string',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate request payload
    const validationResult = validateTaskStatusUpdate(requestBody);
    if (!validationResult.valid) {
      await monitoring.log({
        level: 'warn',
        message: 'Task status update validation failed',
        service: 'api-tasks',
        metadata: { 
          endpoint: 'PUT /api/v1/tasks/[id]/status',
          taskId,
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

    // Build status update object
    const statusUpdate: TaskStatusUpdate = {
      status: requestBody.status,
      timestamp: new Date(),
      result: requestBody.result,
      progress: requestBody.progress,
      error: requestBody.error ? {
        timestamp: new Date(),
        message: requestBody.error.message,
        code: requestBody.error.code,
        stack: requestBody.error.stack,
        retryAttempt: requestBody.error.retryAttempt || 0,
        recoverable: requestBody.error.recoverable !== false
      } : undefined
    };

    // Log task status update attempt
    await monitoring.log({
      level: 'info',
      message: `Updating task status: ${taskId} -> ${requestBody.status}`,
      service: 'api-tasks',
      metadata: {
        endpoint: 'PUT /api/v1/tasks/[id]/status',
        taskId,
        newStatus: requestBody.status,
        hasResult: !!requestBody.result,
        hasError: !!requestBody.error
      }
    });

    // Update task status via task queue service
    const updateResult = await taskQueue.updateTaskStatus(taskId, statusUpdate);
    
    if (updateResult.error) {
      const statusCode = updateResult.error.code === 'TASK_NOT_FOUND' ? 404 : 500;
      
      await monitoring.log({
        level: updateResult.error.code === 'TASK_NOT_FOUND' ? 'info' : 'error',
        message: `Task status update failed: ${updateResult.error.message}`,
        service: 'api-tasks',
        error: updateResult.error.code !== 'TASK_NOT_FOUND' ? {
          name: 'TaskUpdateError',
          message: updateResult.error.message
        } : undefined,
        metadata: {
          endpoint: 'PUT /api/v1/tasks/[id]/status',
          taskId,
          errorCode: updateResult.error.code,
          newStatus: requestBody.status
        }
      });

      await monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'PUT_/api/v1/tasks/[id]/status',
          errorType: updateResult.error.code.toLowerCase(),
          statusCode: statusCode.toString()
        },
        timestamp: new Date()
      });

      return NextResponse.json(updateResult, { status: statusCode });
    }

    // Get updated task for response
    const updatedTask = updateResult.data!;

    // Record success metrics based on new status
    await monitoring.recordMetric({
      name: 'api.tasks.status_updated',
      value: 1,
      type: 'counter',
      tags: {
        taskId,
        newStatus: requestBody.status,
        taskType: updatedTask.type,
        priority: updatedTask.priority
      },
      timestamp: new Date()
    });

    // Record task completion metrics if task is finished
    if (['completed', 'failed', 'cancelled'].includes(requestBody.status)) {
      await monitoring.recordMetric({
        name: 'api.tasks.finished',
        value: 1,
        type: 'counter',
        tags: {
          taskId,
          finalStatus: requestBody.status,
          taskType: updatedTask.type,
          success: (requestBody.status === 'completed').toString()
        },
        timestamp: new Date()
      });

      // Record execution time if available
      if (requestBody.result?.executionTime) {
        await monitoring.recordMetric({
          name: 'api.tasks.execution_time',
          value: requestBody.result.executionTime,
          type: 'timer',
          tags: {
            taskType: updatedTask.type,
            taskStatus: requestBody.status
          },
          timestamp: new Date()
        });
      }
    }

    await monitoring.recordMetric({
      name: 'api.response_time',
      value: Date.now() - startTime,
      type: 'timer',
      tags: {
        endpoint: 'PUT_/api/v1/tasks/[id]/status',
        status: 'success'
      },
      timestamp: new Date()
    });

    await monitoring.log({
      level: 'info',
      message: `Task status updated successfully: ${taskId}`,
      service: 'api-tasks',
      metadata: {
        endpoint: 'PUT /api/v1/tasks/[id]/status',
        taskId,
        newStatus: requestBody.status,
        taskType: updatedTask.type,
        processingTime: Date.now() - startTime
      }
    });

    // Enhance response with additional context
    const enhancedResponse = {
      task: updatedTask,
      statusChange: {
        previousStatus: 'unknown', // TODO: Track previous status
        newStatus: requestBody.status,
        changedAt: statusUpdate.timestamp,
        changeReason: requestBody.reason || 'Status update via API'
      },
      ...(updatedTask.status === 'completed' && {
        completion: {
          executionTime: requestBody.result?.executionTime,
          success: requestBody.result?.success,
          outputSize: requestBody.result?.output ? 
            JSON.stringify(requestBody.result.output).length : 0
        }
      }),
      ...(updatedTask.status === 'failed' && {
        failure: {
          errorMessage: requestBody.error?.message,
          errorCode: requestBody.error?.code,
          recoverable: requestBody.error?.recoverable,
          retryAttempt: requestBody.error?.retryAttempt
        }
      })
    };

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
        message: 'Unexpected error in task status update endpoint',
        service: 'api-tasks',
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: { 
          endpoint: 'PUT /api/v1/tasks/[id]/status',
          taskId
        }
      });

      await services.monitoring.recordMetric({
        name: 'api.errors',
        value: 1,
        type: 'counter',
        tags: {
          endpoint: 'PUT_/api/v1/tasks/[id]/status',
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
 * Validate TaskStatusUpdate payload
 */
function validateTaskStatusUpdate(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required: status field
  if (!body.status || !isValidTaskStatus(body.status)) {
    errors.push('status: Required field, must be one of: pending, running, completed, failed, cancelled, timeout');
  }

  // Optional: result validation (required for completed status)
  if (body.result !== undefined) {
    if (typeof body.result !== 'object' || body.result === null) {
      errors.push('result: Must be an object if provided');
    } else {
      // Validate result object structure
      if (body.result.success !== undefined && typeof body.result.success !== 'boolean') {
        errors.push('result.success: Must be a boolean if provided');
      }
      
      if (body.result.executionTime !== undefined) {
        if (!Number.isInteger(body.result.executionTime) || body.result.executionTime < 0) {
          errors.push('result.executionTime: Must be a non-negative integer (milliseconds)');
        }
      }
      
      if (body.result.memoryUsage !== undefined) {
        if (!Number.isInteger(body.result.memoryUsage) || body.result.memoryUsage < 0) {
          errors.push('result.memoryUsage: Must be a non-negative integer (bytes)');
        }
      }
      
      if (body.result.cpuUsage !== undefined) {
        if (typeof body.result.cpuUsage !== 'number' || body.result.cpuUsage < 0 || body.result.cpuUsage > 100) {
          errors.push('result.cpuUsage: Must be a number between 0 and 100');
        }
      }
    }
  }

  // Optional: progress validation (for running status)
  if (body.progress !== undefined) {
    if (typeof body.progress !== 'object' || body.progress === null) {
      errors.push('progress: Must be an object if provided');
    } else {
      if (body.progress.percentage !== undefined) {
        if (typeof body.progress.percentage !== 'number' || 
            body.progress.percentage < 0 || body.progress.percentage > 100) {
          errors.push('progress.percentage: Must be a number between 0 and 100');
        }
      }
      
      if (body.progress.currentStep !== undefined && typeof body.progress.currentStep !== 'string') {
        errors.push('progress.currentStep: Must be a string if provided');
      }
      
      if (body.progress.totalSteps !== undefined) {
        if (!Number.isInteger(body.progress.totalSteps) || body.progress.totalSteps < 1) {
          errors.push('progress.totalSteps: Must be a positive integer if provided');
        }
      }
      
      if (body.progress.currentStepNumber !== undefined) {
        if (!Number.isInteger(body.progress.currentStepNumber) || body.progress.currentStepNumber < 1) {
          errors.push('progress.currentStepNumber: Must be a positive integer if provided');
        }
      }
    }
  }

  // Optional: error validation (required for failed status)
  if (body.error !== undefined) {
    if (typeof body.error !== 'object' || body.error === null) {
      errors.push('error: Must be an object if provided');
    } else {
      if (!body.error.message || typeof body.error.message !== 'string') {
        errors.push('error.message: Required field, must be a string');
      }
      
      if (body.error.code !== undefined && typeof body.error.code !== 'string') {
        errors.push('error.code: Must be a string if provided');
      }
      
      if (body.error.retryAttempt !== undefined) {
        if (!Number.isInteger(body.error.retryAttempt) || body.error.retryAttempt < 0) {
          errors.push('error.retryAttempt: Must be a non-negative integer if provided');
        }
      }
      
      if (body.error.recoverable !== undefined && typeof body.error.recoverable !== 'boolean') {
        errors.push('error.recoverable: Must be a boolean if provided');
      }
    }
  }

  // Validation rules based on status
  if (body.status === 'completed' && !body.result) {
    errors.push('result: Required when status is "completed"');
  }
  
  if (body.status === 'failed' && !body.error) {
    errors.push('error: Required when status is "failed"');
  }

  // Optional: reason validation
  if (body.reason !== undefined && typeof body.reason !== 'string') {
    errors.push('reason: Must be a string if provided');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard for TaskStatus
 */
function isValidTaskStatus(status: any): status is TaskStatus {
  const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'];
  return validStatuses.includes(status);
}
