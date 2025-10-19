/**
 * Task Types and Interfaces
 * 
 * Defines the structure for tasks, job queue management, and task execution
 * based on doc_features.md specifications.
 */

/**
 * Task status enumeration
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Task types for different operations
 */
export type TaskType = 
  | 'agent_execution'
  | 'code_review'
  | 'document_processing'
  | 'memory_indexing'
  | 'api_integration'
  | 'file_operation'
  | 'notification_send'
  | 'health_check'
  | 'cleanup';

/**
 * Base task parameters interface
 */
export interface TaskParameters {
  [key: string]: any;
}

/**
 * Task execution context
 */
export interface TaskContext {
  /** Agent ID executing the task */
  agentId?: string;
  /** User who initiated the task */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Execution environment */
  environment: 'production' | 'staging' | 'development';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Current retry count */
  retryCount: number;
}

/**
 * Task execution result
 */
export interface TaskResult {
  /** Execution success flag */
  success: boolean;
  /** Task output data */
  output?: any;
  /** Error message if failed */
  error?: string;
  /** Execution duration in milliseconds */
  executionTime: number;
  /** Memory usage during execution */
  memoryUsage?: number;
  /** CPU usage during execution */
  cpuUsage?: number;
  /** Metadata from execution */
  metadata?: Record<string, any>;
}

/**
 * Task progress information
 */
export interface TaskProgress {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current step description */
  currentStep: string;
  /** Total number of steps */
  totalSteps?: number;
  /** Current step number */
  currentStepNumber?: number;
  /** Estimated completion time */
  estimatedCompletion?: Date;
  /** Additional progress data */
  data?: Record<string, any>;
}

/**
 * Task creation payload
 */
export interface CreateTaskRequest {
  /** Task type */
  type: TaskType;
  /** Task name/description */
  name: string;
  /** Task parameters */
  parameters: TaskParameters;
  /** Task priority */
  priority: TaskPriority;
  /** Task execution context */
  context: TaskContext;
  /** Scheduled execution time */
  scheduledAt?: Date;
  /** Task dependencies */
  dependencies?: string[];
}

/**
 * Stored task entity
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Task type */
  type: TaskType;
  /** Task name/description */
  name: string;
  /** Task parameters */
  parameters: TaskParameters;
  /** Current status */
  status: TaskStatus;
  /** Task priority */
  priority: TaskPriority;
  /** Task execution context */
  context: TaskContext;
  /** Task result when completed */
  result?: TaskResult;
  /** Current progress */
  progress?: TaskProgress;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Scheduled execution time */
  scheduledAt?: Date;
  /** Actual start time */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Task dependencies */
  dependencies: string[];
  /** Worker ID processing this task */
  workerId?: string;
  /** Error history */
  errors: TaskError[];
}

/**
 * Task error information
 */
export interface TaskError {
  /** Error timestamp */
  timestamp: Date;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Stack trace */
  stack?: string;
  /** Retry attempt number */
  retryAttempt: number;
  /** Whether this error is recoverable */
  recoverable: boolean;
}

/**
 * Task status update payload
 */
export interface TaskStatusUpdate {
  /** New status */
  status: TaskStatus;
  /** Task result if completing */
  result?: TaskResult;
  /** Progress update */
  progress?: TaskProgress;
  /** Error information if failing */
  error?: TaskError;
  /** Update timestamp */
  timestamp: Date;
}

/**
 * Task queue statistics
 */
export interface TaskQueueStats {
  /** Total tasks in queue */
  totalTasks: number;
  /** Tasks by status */
  tasksByStatus: Record<TaskStatus, number>;
  /** Tasks by priority */
  tasksByPriority: Record<TaskPriority, number>;
  /** Average execution time */
  averageExecutionTime: number;
  /** Queue throughput (tasks/minute) */
  throughput: number;
  /** Active workers count */
  activeWorkers: number;
  /** Failed task rate */
  failureRate: number;
  /** Oldest pending task age */
  oldestPendingTaskAge?: number;
}

/**
 * Task list filters
 */
export interface TaskListFilters {
  /** Filter by task type */
  type?: TaskType;
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Created after date */
  createdAfter?: Date;
  /** Created before date */
  createdBefore?: Date;
  /** Filter by worker ID */
  workerId?: string;
}

/**
 * Paginated task list response
 */
export interface TaskListResponse {
  /** List of tasks */
  tasks: Task[];
  /** Total count matching filters */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  totalPages: number;
  /** Has more pages */
  hasMore: boolean;
  /** Queue statistics */
  stats: TaskQueueStats;
}

/**
 * Task retry configuration
 */
export interface TaskRetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Maximum retry delay */
  maxRetryDelay: number;
  /** Retry only on specific error types */
  retryableErrors?: string[];
}

/**
 * Task scheduling options
 */
export interface TaskScheduleOptions {
  /** Cron expression for recurring tasks */
  cronExpression?: string;
  /** Delay before execution (milliseconds) */
  delay?: number;
  /** Execute after specific date */
  executeAfter?: Date;
  /** Execute only once */
  runOnce?: boolean;
  /** Time zone for cron schedule */
  timezone?: string;
}

/**
 * Worker health status
 */
export interface WorkerHealth {
  /** Worker ID */
  workerId: string;
  /** Worker status */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** Last heartbeat timestamp */
  lastHeartbeat: Date;
  /** Current task count */
  currentTaskCount: number;
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;
  /** Memory usage percentage */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Worker uptime in milliseconds */
  uptime: number;
}

/**
 * Task execution hook for monitoring
 */
export interface TaskExecutionHook {
  /** Before task starts */
  beforeStart?: (task: Task) => Promise<void>;
  /** After task completes */
  afterComplete?: (task: Task, result: TaskResult) => Promise<void>;
  /** When task fails */
  onError?: (task: Task, error: TaskError) => Promise<void>;
  /** Progress updates */
  onProgress?: (task: Task, progress: TaskProgress) => Promise<void>;
}
