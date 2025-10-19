/**
 * Memory Types and Interfaces
 * 
 * Defines the structure for agent memory, vector storage, and knowledge management
 * based on doc_features.md specifications.
 */

/**
 * Memory chunk types for different content
 */
export type MemoryChunkType = 
  | 'conversation'
  | 'document'
  | 'code_snippet'
  | 'api_response'
  | 'knowledge_base'
  | 'user_context'
  | 'system_message';

/**
 * Memory access patterns
 */
export type MemoryAccessPattern = 'recent' | 'frequent' | 'similar' | 'contextual' | 'temporal';

/**
 * Memory chunk metadata
 */
export interface MemoryChunkMetadata {
  /** Source of the memory */
  source: string;
  /** Content type */
  contentType: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Importance score (0-1) */
  importance: number;
  /** Content language */
  language?: string;
  /** Associated tags */
  tags: string[];
  /** Custom metadata */
  custom: Record<string, any>;
}

/**
 * Vector embedding representation
 */
export interface VectorEmbedding {
  /** Embedding vector values */
  vector: number[];
  /** Embedding dimension */
  dimension: number;
  /** Model used for embedding */
  model: string;
  /** Embedding creation timestamp */
  createdAt: Date;
}

/**
 * Memory chunk entity
 */
export interface MemoryChunk {
  /** Unique chunk identifier */
  id: string;
  /** Agent ID owning this memory */
  agentId: string;
  /** Memory chunk type */
  type: MemoryChunkType;
  /** Raw content */
  content: string;
  /** Content summary */
  summary?: string;
  /** Vector embedding */
  embedding: VectorEmbedding;
  /** Chunk metadata */
  metadata: MemoryChunkMetadata;
  /** Relevance score (for search results) */
  relevanceScore?: number;
  /** Related chunk IDs */
  relatedChunks: string[];
  /** Parent chunk ID (for hierarchical content) */
  parentChunkId?: string;
  /** Child chunk IDs */
  childChunks: string[];
}

/**
 * Memory query request
 */
export interface MemoryQueryRequest {
  /** Agent ID to query memory for */
  agentId: string;
  /** Query text */
  query: string;
  /** Maximum results to return */
  limit: number;
  /** Minimum similarity score (0-1) */
  minSimilarity?: number;
  /** Memory chunk types to include */
  includeTypes?: MemoryChunkType[];
  /** Memory chunk types to exclude */
  excludeTypes?: MemoryChunkType[];
  /** Time range filter */
  timeRange?: {
    from: Date;
    to: Date;
  };
  /** Tags to filter by */
  tags?: string[];
  /** Access pattern for retrieval strategy */
  accessPattern: MemoryAccessPattern;
}

/**
 * Memory query response
 */
export interface MemoryQueryResponse {
  /** Matching memory chunks */
  chunks: MemoryChunk[];
  /** Total matches found */
  totalMatches: number;
  /** Query processing time in milliseconds */
  processingTime: number;
  /** Query metadata */
  queryMetadata: {
    /** Query embedding used */
    queryEmbedding: VectorEmbedding;
    /** Search strategy applied */
    searchStrategy: string;
    /** Filters applied */
    filtersApplied: string[];
  };
}

/**
 * Memory storage request
 */
export interface MemoryStorageRequest {
  /** Agent ID to store memory for */
  agentId: string;
  /** Memory chunk type */
  type: MemoryChunkType;
  /** Content to store */
  content: string;
  /** Optional content summary */
  summary?: string;
  /** Source metadata */
  source: string;
  /** Content type */
  contentType: string;
  /** Importance score (0-1) */
  importance?: number;
  /** Tags to associate */
  tags?: string[];
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Parent chunk ID for hierarchical storage */
  parentChunkId?: string;
}

/**
 * Memory storage response
 */
export interface MemoryStorageResponse {
  /** Stored memory chunk */
  chunk: MemoryChunk;
  /** Storage success flag */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Processing metrics */
  metrics: {
    /** Embedding generation time */
    embeddingTime: number;
    /** Storage time */
    storageTime: number;
    /** Total processing time */
    totalTime: number;
  };
}

/**
 * Memory statistics for an agent
 */
export interface MemoryStats {
  /** Agent ID */
  agentId: string;
  /** Total memory chunks */
  totalChunks: number;
  /** Chunks by type */
  chunksByType: Record<MemoryChunkType, number>;
  /** Total memory size in bytes */
  totalSize: number;
  /** Average chunk size */
  averageChunkSize: number;
  /** Most accessed chunks */
  mostAccessedChunks: string[];
  /** Recent activity */
  recentActivity: {
    /** Chunks added in last 24h */
    chunksAddedLast24h: number;
    /** Queries in last 24h */
    queriesLast24h: number;
    /** Last access timestamp */
    lastAccess: Date;
  };
  /** Memory health metrics */
  health: {
    /** Embedding quality score */
    embeddingQuality: number;
    /** Index fragmentation level */
    fragmentation: number;
    /** Duplicate content percentage */
    duplicatePercentage: number;
  };
}

/**
 * Memory cleanup configuration
 */
export interface MemoryCleanupConfig {
  /** Remove chunks older than (days) */
  maxAge: number;
  /** Remove chunks with access count below threshold */
  minAccessCount: number;
  /** Remove chunks with importance below threshold */
  minImportance: number;
  /** Keep minimum number of chunks per type */
  minChunksPerType: number;
  /** Maximum total chunks per agent */
  maxTotalChunks: number;
}

/**
 * Memory cleanup result
 */
export interface MemoryCleanupResult {
  /** Cleanup success flag */
  success: boolean;
  /** Number of chunks removed */
  chunksRemoved: number;
  /** Storage space freed (bytes) */
  spaceSaved: number;
  /** Cleanup duration */
  duration: number;
  /** Cleanup summary by type */
  summary: Record<MemoryChunkType, number>;
  /** Error message if failed */
  error?: string;
}

/**
 * Memory search index configuration
 */
export interface MemoryIndexConfig {
  /** Embedding dimension */
  dimension: number;
  /** Distance metric */
  distanceMetric: 'cosine' | 'euclidean' | 'manhattan';
  /** Index type */
  indexType: 'flat' | 'hnsw' | 'ivf';
  /** Index parameters */
  parameters: Record<string, any>;
}

/**
 * Memory context for enhanced queries
 */
export interface MemoryContext {
  /** Current conversation ID */
  conversationId?: string;
  /** User ID for personalization */
  userId?: string;
  /** Session context */
  sessionContext?: Record<string, any>;
  /** Temporal context */
  temporalContext?: {
    /** Current time context */
    currentTime: Date;
    /** Relevant time period */
    relevantPeriod?: {
      start: Date;
      end: Date;
    };
  };
  /** Semantic context */
  semanticContext?: {
    /** Current topic */
    topic?: string;
    /** Related concepts */
    concepts?: string[];
    /** Context keywords */
    keywords?: string[];
  };
}

/**
 * Enhanced memory query with context
 */
export interface ContextualMemoryQuery extends MemoryQueryRequest {
  /** Memory context for enhanced retrieval */
  context: MemoryContext;
  /** Use contextual ranking */
  useContextualRanking: boolean;
  /** Boost recent memories */
  recencyBoost?: number;
  /** Boost frequently accessed memories */
  frequencyBoost?: number;
}

/**
 * Memory analytics data
 */
export interface MemoryAnalytics {
  /** Agent ID */
  agentId: string;
  /** Time period for analytics */
  period: {
    start: Date;
    end: Date;
  };
  /** Query patterns */
  queryPatterns: {
    /** Most common query types */
    commonQueries: Array<{
      query: string;
      count: number;
      avgResponseTime: number;
    }>;
    /** Peak query times */
    peakTimes: Array<{
      hour: number;
      queryCount: number;
    }>;
  };
  /** Memory usage trends */
  usageTrends: {
    /** Memory growth over time */
    growth: Array<{
      date: Date;
      totalChunks: number;
      totalSize: number;
    }>;
    /** Access patterns */
    accessPatterns: Array<{
      chunkType: MemoryChunkType;
      accessCount: number;
      lastAccessed: Date;
    }>;
  };
  /** Performance metrics */
  performance: {
    /** Average query response time */
    avgQueryTime: number;
    /** Storage operation times */
    avgStorageTime: number;
    /** Index efficiency metrics */
    indexEfficiency: number;
  };
}
