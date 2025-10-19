/**
 * Agent Types and Interfaces
 * 
 * Defines the structure for agents, their configurations, and related data types
 * based on doc_features.md specifications.
 */

/**
 * Agent Types supported by AgentForge
 */
export type AgentType = 'code-assistant' | 'document-manager' | 'qa-bot';

/**
 * Agent Status enumeration
 */
export type AgentStatus = 'active' | 'inactive' | 'pending' | 'error' | 'deploying';

/**
 * Environment where agent is deployed
 */
export type DeploymentEnvironment = 'production' | 'staging';

/**
 * Supported external API capabilities
 */
export type APICapability = 
  | 'openai' 
  | 'github' 
  | 'dropbox' 
  | 'slack' 
  | 'aws-s3' 
  | 'google-drive' 
  | 'postgresql' 
  | 'vector-db' 
  | 'web-search';

/**
 * Agent permissions for operations
 */
export interface AgentPermissions {
  /** Can read files and documents */
  readFiles: boolean;
  /** Can modify or delete existing files */
  modifyFiles: boolean;
  /** Can create new files */
  createFiles: boolean;
  /** Can execute code snippets */
  executeCode: boolean;
  /** Can send messages and notifications */
  sendMessages: boolean;
}

/**
 * Agent trigger configuration for when agent should execute
 */
export interface AgentTriggers {
  /** Trigger on pull request events */
  pullRequest?: boolean;
  /** Cron schedule for periodic execution */
  schedule?: string;
  /** Manual trigger only */
  manual?: boolean;
  /** File system events */
  fileEvents?: boolean;
  /** Custom webhook triggers */
  webhooks?: string[];
}

/**
 * Memory configuration for agent
 */
export interface AgentMemoryConfig {
  /** Chunk size for memory storage */
  chunkSize: number;
  /** Number of memory chunks to retrieve */
  retrievalCount: number;
  /** Embedding model for vector storage */
  embeddingModel: string;
}

/**
 * Reasoning configuration for agent decision making
 */
export interface AgentReasoningConfig {
  /** Decision confidence threshold (0-1) */
  decisionThreshold: number;
  /** Maximum reasoning iterations */
  maxIterations: number;
  /** Fallback action when reasoning fails */
  fallbackAction: 'request_human_help' | 'use_default' | 'abort';
}

/**
 * Web search configuration for agents
 */
export interface WebSearchConfig {
  /** Maximum search results to return */
  maxResults: number;
  /** Minimum relevance score (0-1) */
  minRelevance: number;
  /** Search timeout in milliseconds */
  timeout: number;
}

/**
 * Agent configuration object
 */
export interface AgentConfig {
  /** Memory storage configuration */
  memory: AgentMemoryConfig;
  /** Reasoning capabilities */
  reasoning: AgentReasoningConfig;
  /** Web search settings */
  webSearch?: WebSearchConfig;
  /** Execution timeout in milliseconds */
  executionTimeout: number;
  /** Maximum concurrent operations */
  maxConcurrentOps: number;
}

/**
 * Agent creation payload from frontend
 */
export interface CreateAgentRequest {
  /** Agent display name */
  name: string;
  /** Type of agent */
  type: AgentType;
  /** Natural language description of agent purpose */
  purpose: string;
  /** API capabilities this agent needs */
  capabilities: APICapability[];
  /** Agent permissions */
  permissions: AgentPermissions;
  /** Trigger configuration */
  triggers: AgentTriggers;
  /** Agent configuration */
  config: AgentConfig;
  /** Deployment environment */
  environment: DeploymentEnvironment;
  /** Enable monitoring and logging */
  monitoringEnabled: boolean;
}

/**
 * Stored agent entity in database
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Agent display name */
  name: string;
  /** Type of agent */
  type: AgentType;
  /** Natural language description */
  purpose: string;
  /** API capabilities */
  capabilities: APICapability[];
  /** Agent permissions */
  permissions: AgentPermissions;
  /** Trigger configuration */
  triggers: AgentTriggers;
  /** Agent configuration */
  config: AgentConfig;
  /** Current status */
  status: AgentStatus;
  /** Deployment environment */
  environment: DeploymentEnvironment;
  /** Monitoring enabled flag */
  monitoringEnabled: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** User who created the agent */
  createdBy: string;
  /** Last run timestamp */
  lastRunAt?: Date;
  /** Error message if status is error */
  errorMessage?: string;
}

/**
 * Agent metrics and performance data
 */
export interface AgentMetrics {
  /** Agent ID */
  agentId: string;
  /** Total number of executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Last execution duration */
  lastExecutionTime?: number;
  /** Total API calls made */
  totalApiCalls: number;
  /** Memory usage statistics */
  memoryUsage: {
    totalChunks: number;
    averageChunkSize: number;
    lastUpdated: Date;
  };
  /** Performance metrics over time */
  performanceHistory: {
    date: Date;
    executionTime: number;
    success: boolean;
    apiCalls: number;
  }[];
}

/**
 * Agent status update payload
 */
export interface AgentStatusUpdate {
  /** New status */
  status: AgentStatus;
  /** Optional error message */
  errorMessage?: string;
  /** Timestamp of status change */
  timestamp: Date;
}

/**
 * Agent deployment result
 */
export interface AgentDeploymentResult {
  /** Deployment success flag */
  success: boolean;
  /** Deployed agent data */
  agent?: Agent;
  /** Error message if deployment failed */
  error?: string;
  /** Deployment warnings */
  warnings?: string[];
  /** Deployment metadata */
  deployment: {
    /** Deployment ID */
    deploymentId: string;
    /** Environment deployed to */
    environment: DeploymentEnvironment;
    /** Deployment timestamp */
    deployedAt: Date;
    /** Estimated ready time */
    estimatedReadyAt?: Date;
  };
}

/**
 * Agent list filters for querying
 */
export interface AgentListFilters {
  /** Filter by agent type */
  type?: AgentType;
  /** Filter by status */
  status?: AgentStatus;
  /** Filter by environment */
  environment?: DeploymentEnvironment;
  /** Filter by capabilities */
  capabilities?: APICapability[];
  /** Filter by creator */
  createdBy?: string;
  /** Created after date */
  createdAfter?: Date;
  /** Created before date */
  createdBefore?: Date;
}

/**
 * Paginated agent list response
 */
export interface AgentListResponse {
  /** List of agents */
  agents: Agent[];
  /** Total count of agents matching filters */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasMore: boolean;
}
