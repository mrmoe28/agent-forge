/**
 * Authentication Types and Interfaces
 * 
 * Defines authentication, authorization, and user management structures
 * based on doc_features.md specifications.
 */

/**
 * User role enumeration
 */
export type UserRole = 'admin' | 'developer' | 'viewer' | 'agent_manager';

/**
 * Permission types for role-based access control
 */
export type Permission = 
  | 'agents:create'
  | 'agents:read'
  | 'agents:update'
  | 'agents:delete'
  | 'agents:deploy'
  | 'tasks:create'
  | 'tasks:read'
  | 'tasks:update'
  | 'tasks:cancel'
  | 'memory:read'
  | 'memory:write'
  | 'memory:delete'
  | 'monitoring:read'
  | 'settings:read'
  | 'settings:write'
  | 'api_keys:create'
  | 'api_keys:read'
  | 'api_keys:revoke'
  | 'system:admin';

/**
 * Authentication provider types
 */
export type AuthProvider = 'local' | 'oauth' | 'github' | 'google' | 'microsoft';

/**
 * User account information
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email: string;
  /** Display name */
  name: string;
  /** User role */
  role: UserRole;
  /** User permissions */
  permissions: Permission[];
  /** Authentication provider */
  provider: AuthProvider;
  /** Profile avatar URL */
  avatar?: string;
  /** Account creation date */
  createdAt: Date;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Account status */
  status: 'active' | 'inactive' | 'suspended';
  /** User preferences */
  preferences: UserPreferences;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Language preference */
  language: string;
  /** Timezone */
  timezone: string;
  /** Notification settings */
  notifications: {
    /** Email notifications */
    email: boolean;
    /** In-app notifications */
    inApp: boolean;
    /** Agent status updates */
    agentUpdates: boolean;
    /** Task completions */
    taskCompletions: boolean;
    /** System alerts */
    systemAlerts: boolean;
  };
  /** Dashboard preferences */
  dashboard: {
    /** Default view */
    defaultView: 'grid' | 'list';
    /** Items per page */
    itemsPerPage: number;
    /** Auto-refresh interval */
    autoRefreshInterval: number;
  };
}

/**
 * JWT token payload
 */
export interface JwtPayload {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** User permissions */
  permissions: Permission[];
  /** Token issued at */
  iat: number;
  /** Token expires at */
  exp: number;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
  /** Session ID */
  sessionId: string;
}

/**
 * Authentication request payload
 */
export interface AuthRequest {
  /** User email */
  email: string;
  /** User password (for local auth) */
  password?: string;
  /** OAuth provider token */
  providerToken?: string;
  /** Authentication provider */
  provider: AuthProvider;
  /** Remember me flag */
  rememberMe?: boolean;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  /** Authentication success flag */
  success: boolean;
  /** JWT access token */
  accessToken?: string;
  /** JWT refresh token */
  refreshToken?: string;
  /** Token expiration time */
  expiresIn?: number;
  /** User information */
  user?: User;
  /** Error message if failed */
  error?: string;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * Session information
 */
export interface Session {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Client IP address */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Session status */
  status: 'active' | 'expired' | 'revoked';
  /** Additional session data */
  metadata: Record<string, any>;
}

/**
 * API key for programmatic access
 */
export interface ApiKey {
  /** API key ID */
  id: string;
  /** User ID who owns the key */
  userId: string;
  /** API key name */
  name: string;
  /** Hashed key value */
  keyHash: string;
  /** Partial key for display */
  partialKey: string;
  /** Key permissions */
  permissions: Permission[];
  /** Rate limit (requests per minute) */
  rateLimit: number;
  /** Key creation date */
  createdAt: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Key expiration date */
  expiresAt?: Date;
  /** Key status */
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  /** Usage statistics */
  usageStats: {
    /** Total requests made */
    totalRequests: number;
    /** Requests in last 24h */
    requestsLast24h: number;
    /** Last request timestamp */
    lastRequestAt?: Date;
  };
}

/**
 * Role definition
 */
export interface Role {
  /** Role name */
  name: UserRole;
  /** Role display name */
  displayName: string;
  /** Role description */
  description: string;
  /** Role permissions */
  permissions: Permission[];
  /** Default role flag */
  isDefault: boolean;
  /** System role flag (cannot be deleted) */
  isSystem: boolean;
}

/**
 * Permission definition
 */
export interface PermissionDefinition {
  /** Permission name */
  name: Permission;
  /** Permission description */
  description: string;
  /** Resource this permission applies to */
  resource: string;
  /** Action this permission allows */
  action: string;
  /** Permission category */
  category: 'agents' | 'tasks' | 'memory' | 'monitoring' | 'settings' | 'system';
}

/**
 * Authentication audit log entry
 */
export interface AuthAuditLog {
  /** Log entry ID */
  id: string;
  /** User ID */
  userId: string;
  /** Action performed */
  action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 'role_change' | 'permission_change';
  /** Action result */
  result: 'success' | 'failure';
  /** Client IP address */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Additional context */
  metadata: Record<string, any>;
  /** Timestamp */
  timestamp: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** User email */
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  /** Reset token */
  token: string;
  /** New password */
  newPassword: string;
}

/**
 * Multi-factor authentication setup
 */
export interface MfaSetup {
  /** User ID */
  userId: string;
  /** MFA method */
  method: 'totp' | 'sms' | 'email';
  /** Setup secret (for TOTP) */
  secret?: string;
  /** QR code data (for TOTP) */
  qrCode?: string;
  /** Backup codes */
  backupCodes: string[];
  /** Setup status */
  status: 'pending' | 'active' | 'disabled';
}

/**
 * MFA verification request
 */
export interface MfaVerificationRequest {
  /** User ID */
  userId: string;
  /** Verification code */
  code: string;
  /** MFA method used */
  method: 'totp' | 'sms' | 'email' | 'backup';
}

/**
 * Access control context
 */
export interface AccessContext {
  /** Current user */
  user: User;
  /** Current session */
  session: Session;
  /** Resource being accessed */
  resource: string;
  /** Action being performed */
  action: string;
  /** Additional context data */
  metadata: Record<string, any>;
}

/**
 * Authentication middleware options
 */
export interface AuthMiddlewareOptions {
  /** Required permissions */
  permissions?: Permission[];
  /** Optional permissions (any one required) */
  optionalPermissions?: Permission[];
  /** Required role */
  role?: UserRole;
  /** Allow API key authentication */
  allowApiKey?: boolean;
  /** Require MFA */
  requireMfa?: boolean;
  /** Skip authentication for certain conditions */
  skipAuth?: (request: any) => boolean;
}
