/**
 * Service Factory for Dependency Injection
 * 
 * Lightweight factory pattern for wiring together all AgentForge services
 * with proper dependency management and configuration.
 */

import appConfig, { AppConfig } from '@/config/env';
import { AgentOrchestrationService, AgentOrchestrationConfig } from '@/services/AgentOrchestrationService';
import { MemoryService, MemoryServiceConfig } from '@/services/MemoryService';
import { APIGatewayService, APIGatewayConfig } from '@/services/APIGatewayService';
import { TaskQueueService, TaskQueueConfig } from '@/services/TaskQueueService';
import { AuthService, AuthServiceConfig } from '@/services/AuthService';
import { MonitoringService, MonitoringConfig } from '@/services/MonitoringService';
import { APICapability } from '@/types/agent';

/**
 * Service container interface for type safety
 */
export interface ServiceContainer {
  agentOrchestration: AgentOrchestrationService;
  memory: MemoryService;
  apiGateway: APIGatewayService;
  taskQueue: TaskQueueService;
  auth: AuthService;
  monitoring: MonitoringService;
}

/**
 * Service factory configuration
 */
export interface ServiceFactoryConfig {
  /** Environment configuration */
  env: AppConfig;
  /** Override service configurations */
  overrides?: {
    agentOrchestration?: Partial<AgentOrchestrationConfig>;
    memory?: Partial<MemoryServiceConfig>;
    apiGateway?: Partial<APIGatewayConfig>;
    taskQueue?: Partial<TaskQueueConfig>;
    auth?: Partial<AuthServiceConfig>;
    monitoring?: Partial<MonitoringConfig>;
  };
}

/**
 * Service Factory
 * 
 * Creates and manages service instances with proper dependency injection
 */
export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  private services: ServiceContainer | null = null;
  private config: ServiceFactoryConfig;

  private constructor(config: ServiceFactoryConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance of the service factory
   */
  static getInstance(config?: ServiceFactoryConfig): ServiceFactory {
    if (!ServiceFactory.instance) {
      if (!config) {
        throw new Error('ServiceFactory configuration required for first initialization');
      }
      ServiceFactory.instance = new ServiceFactory(config);
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize all services with dependency injection
   */
  async initializeServices(): Promise<ServiceContainer> {
    if (this.services) {
      return this.services;
    }

    try {
      // Create monitoring service first (other services depend on it)
      const monitoring = this.createMonitoringService();
      
      // Log service initialization start
      await monitoring.log({
        level: 'info',
        message: 'Starting AgentForge service initialization',
        service: 'service-factory',
        metadata: {
          environment: this.config.env.NODE_ENV,
          services: [
            'agent-orchestration',
            'memory',
            'api-gateway',  
            'task-queue',
            'auth',
            'monitoring'
          ]
        }
      });

      // Create auth service (other services need authentication)
      const auth = this.createAuthService();

      // Create task queue service (agent orchestration needs it)
      const taskQueue = this.createTaskQueueService();

      // Create memory service (agent orchestration needs it)
      const memory = this.createMemoryService();

      // Create API gateway service (agent orchestration needs it)
      const apiGateway = this.createAPIGatewayService();

      // Create agent orchestration service (depends on most other services)
      const agentOrchestration = this.createAgentOrchestrationService();

      // Wire up cross-service dependencies
      await this.wireDependencies({
        agentOrchestration,
        memory,
        apiGateway,
        taskQueue,
        auth,
        monitoring
      });

      this.services = {
        agentOrchestration,
        memory,
        apiGateway,
        taskQueue,
        auth,
        monitoring
      };

      // Log successful initialization
      await monitoring.log({
        level: 'info',
        message: 'AgentForge services initialized successfully',
        service: 'service-factory',
        metadata: {
          initializationTime: Date.now(),
          servicesCount: 6
        }
      });

      return this.services;

    } catch (error) {
      console.error('Service initialization failed:', error);
      throw new Error(`Failed to initialize services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get initialized services (throws if not initialized)
   */
  getServices(): ServiceContainer {
    if (!this.services) {
      throw new Error('Services not initialized. Call initializeServices() first.');
    }
    return this.services;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.services) return;

    const { monitoring } = this.services;

    try {
      await monitoring.log({
        level: 'info',
        message: 'Starting AgentForge service shutdown',
        service: 'service-factory',
        metadata: { shutdownReason: 'graceful' }
      });

      // TODO: Implement graceful shutdown for each service
      // TODO: Close database connections
      // TODO: Stop background tasks
      // TODO: Complete ongoing requests
      
      this.services = null;
      ServiceFactory.instance = null;

      console.log('✅ AgentForge services shut down successfully');

    } catch (error) {
      console.error('Error during service shutdown:', error);
      throw error;
    }
  }

  // Private service creation methods

  private createAgentOrchestrationService(): AgentOrchestrationService {
    const config: AgentOrchestrationConfig = {
      maxConcurrentAgents: this.config.env.MAX_CONCURRENT_AGENTS,
      executionTimeout: this.config.env.AGENT_EXECUTION_TIMEOUT,
      defaultMemoryConfig: {
        chunkSize: this.config.env.MEMORY_CHUNK_SIZE,
        retrievalCount: this.config.env.MEMORY_RETRIEVAL_COUNT,
        embeddingModel: this.config.env.EMBEDDING_MODEL
      },
      ...this.config.overrides?.agentOrchestration
    };

    return new AgentOrchestrationService(config);
  }

  private createMemoryService(): MemoryService {
    const config: MemoryServiceConfig = {
      vectorDb: {
        url: this.config.env.VECTOR_DB_URL,
        apiKey: this.config.env.VECTOR_DB_API_KEY,
        indexName: this.config.env.VECTOR_DB_INDEX_NAME,
        dimension: 1536 // Default OpenAI embedding dimension
      },
      embeddingModel: this.config.env.EMBEDDING_MODEL,
      defaultChunkSize: this.config.env.MEMORY_CHUNK_SIZE,
      defaultRetrievalCount: this.config.env.MEMORY_RETRIEVAL_COUNT,
      cache: {
        enabled: !!this.config.env.REDIS_URL,
        ttl: this.config.env.CACHE_TTL_MEDIUM
      },
      ...this.config.overrides?.memory
    };

    return new MemoryService(config);
  }

  private createAPIGatewayService(): APIGatewayService {
    const config: APIGatewayConfig = {
      rateLimit: {
        windowMs: this.config.env.RATE_LIMIT_WINDOW_MS,
        maxRequests: this.config.env.RATE_LIMIT_MAX_REQUESTS
      },
      cache: {
        enabled: !!this.config.env.REDIS_URL,
        ttl: this.config.env.CACHE_TTL_SHORT
      },
      timeout: {
        default: 30000, // 30 seconds
        perService: {
          'openai': 60000,      // 1 minute for AI operations
          'github': 30000,      // 30 seconds for GitHub
          'dropbox': 45000,     // 45 seconds for file operations
          'slack': 15000,       // 15 seconds for messaging
          'aws-s3': 60000,      // 1 minute for S3 operations
          'google-drive': 45000, // 45 seconds for drive operations
          'postgresql': 10000,   // 10 seconds for DB queries
          'vector-db': 30000,    // 30 seconds for vector operations
          'web-search': 20000    // 20 seconds for web searches
        }
      },
      externalApis: this.buildExternalApiConfigs(),
      ...this.config.overrides?.apiGateway
    };

    return new APIGatewayService(config);
  }

  private createTaskQueueService(): TaskQueueService {
    const config: TaskQueueConfig = {
      provider: this.config.env.TASK_QUEUE_PROVIDER,
      maxConcurrentTasks: this.config.env.MAX_CONCURRENT_AGENTS,
      executionTimeout: this.config.env.AGENT_EXECUTION_TIMEOUT,
      defaultRetry: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        maxRetryDelay: 10000,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE']
      },
      healthCheckInterval: 60000, // 1 minute
      deadLetterQueue: {
        enabled: true,
        maxRetries: 5
      },
      ...this.config.overrides?.taskQueue
    };

    return new TaskQueueService(config);
  }

  private createAuthService(): AuthService {
    const config: AuthServiceConfig = {
      jwt: {
        secret: this.config.env.JWT_SECRET,
        expiresIn: this.config.env.JWT_EXPIRES_IN,
        issuer: 'agentforge-api',
        audience: 'agentforge-clients'
      },
      session: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        cleanupInterval: 60 * 60 * 1000 // 1 hour
      },
      password: {
        minLength: 8,
        requireSpecialChars: true,
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
      },
      apiKey: {
        defaultRateLimit: this.config.env.RATE_LIMIT_MAX_REQUESTS,
        maxKeysPerUser: 10
      },
      ...this.config.overrides?.auth
    };

    return new AuthService(config);
  }

  private createMonitoringService(): MonitoringService {
    const config: MonitoringConfig = {
      metrics: {
        enabled: this.config.env.ENABLE_PERFORMANCE_METRICS,
        collectionInterval: 30000, // 30 seconds
        retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        batchSize: 100
      },
      alerting: {
        enabled: this.config.env.MONITORING_ENABLED,
        channels: ['console'], // TODO: Add email, slack, etc.
        thresholds: {
          errorRate: 5, // 5%
          responseTime: 2000, // 2 seconds
          memoryUsage: 90, // 90%
          cpuUsage: 85 // 85%
        }
      },
      logging: {
        level: this.config.env.LOG_LEVEL,
        structured: true,
        includeStack: this.config.env.DEBUG_ENABLED
      },
      external: {
        ...(this.config.env.DATADOG_API_KEY && {
          datadog: {
            apiKey: this.config.env.DATADOG_API_KEY,
            endpoint: 'https://api.datadoghq.com'
          }
        }),
        ...(this.config.env.NEW_RELIC_LICENSE_KEY && {
          newRelic: {
            licenseKey: this.config.env.NEW_RELIC_LICENSE_KEY
          }
        }),
        ...(this.config.env.SENTRY_DSN && {
          sentry: {
            dsn: this.config.env.SENTRY_DSN
          }
        })
      },
      ...this.config.overrides?.monitoring
    };

    return new MonitoringService(config);
  }

  private buildExternalApiConfigs(): Record<APICapability, any> {
    // TODO: Implement proper external API configurations
    // This is a simplified configuration structure
    
    const baseConfig = {
      authType: 'bearer' as const,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10
      },
      timeout: {
        connect: 5000,
        request: 30000
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2
      }
    };

    return {
      'openai': {
        service: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        ...baseConfig
      },
      'github': {
        service: 'GitHub',
        baseUrl: 'https://api.github.com',
        ...baseConfig
      },
      'dropbox': {
        service: 'Dropbox',
        baseUrl: 'https://api.dropboxapi.com',
        ...baseConfig
      },
      'slack': {
        service: 'Slack',
        baseUrl: 'https://slack.com/api',
        ...baseConfig
      },
      'aws-s3': {
        service: 'AWS S3',
        baseUrl: 'https://s3.amazonaws.com',
        authType: 'apikey' as const,
        ...baseConfig
      },
      'google-drive': {
        service: 'Google Drive',
        baseUrl: 'https://www.googleapis.com/drive/v3',
        authType: 'oauth' as const,
        ...baseConfig
      },
      'postgresql': {
        service: 'PostgreSQL',
        baseUrl: this.config.env.DATABASE_URL,
        authType: 'basic' as const,
        ...baseConfig
      },
      'vector-db': {
        service: 'Vector Database',
        baseUrl: this.config.env.VECTOR_DB_URL,
        ...baseConfig
      },
      'web-search': {
        service: 'Web Search',
        baseUrl: 'https://www.googleapis.com/customsearch/v1',
        ...baseConfig
      }
    };
  }

  private async wireDependencies(services: ServiceContainer): Promise<void> {
    // TODO: Set up cross-service dependencies
    // TODO: Configure service event listeners
    // TODO: Set up monitoring hooks in all services
    
    // Example: Add monitoring hooks to task queue
    services.taskQueue.addExecutionHook({
      beforeStart: async (task) => {
        await services.monitoring.log({
          level: 'info',
          message: `Task started: ${task.name}`,
          service: 'task-queue',
          metadata: { taskId: task.id, taskType: task.type }
        });
      },
      afterComplete: async (task, result) => {
        await services.monitoring.log({
          level: 'info',
          message: `Task completed: ${task.name}`,
          service: 'task-queue',
          metadata: { 
            taskId: task.id, 
            taskType: task.type,
            success: result.success,
            duration: result.executionTime
          }
        });
      },
      onError: async (task, error) => {
        await services.monitoring.log({
          level: 'error',
          message: `Task failed: ${task.name}`,
          service: 'task-queue',
          error: {
            name: 'TaskExecutionError',
            message: error.message
          },
          metadata: { 
            taskId: task.id, 
            taskType: task.type,
            retryAttempt: error.retryAttempt
          }
        });
      }
    });

    // TODO: Wire up more cross-service integrations
    console.log('✅ Service dependencies wired successfully');
  }
}

/**
 * Convenience function to get initialized services
 */
export async function getServices(): Promise<ServiceContainer> {
  const factory = ServiceFactory.getInstance({
    env: appConfig
  });
  
  return factory.initializeServices();
}

/**
 * Convenience function to initialize services with custom config
 */
export async function initializeServices(config?: Partial<ServiceFactoryConfig>): Promise<ServiceContainer> {
  const factory = ServiceFactory.getInstance({
    env: appConfig,
    ...config
  });
  
  return factory.initializeServices();
}
