/**
 * Authentication Middleware
 * 
 * JWT verification middleware for API routes with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/ServiceFactory';
import { Permission, AuthMiddlewareOptions } from '@/types/auth';
import { ApiResponse } from '@/types/api';

/**
 * Authentication middleware factory
 */
export function withAuth(options: AuthMiddlewareOptions = {}) {
  return async function authMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Skip authentication if configured
      if (options.skipAuth && options.skipAuth(request)) {
        return handler(request);
      }

      const services = await getServices();
      const { auth, monitoring } = services;

      // Extract authorization header
      const authHeader = request.headers.get('authorization');
      const apiKeyHeader = request.headers.get('x-api-key');

      if (!authHeader && !apiKeyHeader) {
        await monitoring.log({
          level: 'warn',
          message: 'No authorization header provided',
          service: 'auth-middleware',
          metadata: {
            endpoint: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get('user-agent'),
            ip: getClientIP(request)
          }
        });

        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authorization required. Provide either Bearer token or X-API-Key header.',
              timestamp: new Date()
            }
          } as ApiResponse,
          { status: 401 }
        );
      }

      let user: any = null;
      let authMethod = '';

      // Try JWT authentication first
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const tokenResult = await auth.verifyToken(token);
        if (tokenResult.data) {
          user = tokenResult.data.user;
          authMethod = 'jwt';
        } else if (!options.allowApiKey) {
          await monitoring.log({
            level: 'warn',
            message: 'Invalid JWT token provided',
            service: 'auth-middleware',
            error: {
              name: 'TokenVerificationFailed',
              message: tokenResult.error?.message || 'Token verification failed'
            },
            metadata: {
              endpoint: request.nextUrl.pathname,
              method: request.method,
              errorCode: tokenResult.error?.code
            }
          });

          return NextResponse.json(
            {
              error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token',
                timestamp: new Date()
              }
            } as ApiResponse,
            { status: 401 }
          );
        }
      }

      // Try API key authentication if JWT failed and API keys are allowed
      if (!user && options.allowApiKey && apiKeyHeader) {
        const apiKeyResult = await auth.verifyApiKey(apiKeyHeader);
        if (apiKeyResult.data) {
          user = apiKeyResult.data.user;
          authMethod = 'apikey';

          // Check API key rate limits
          // TODO: Implement API key specific rate limiting
        } else {
          await monitoring.log({
            level: 'warn',
            message: 'Invalid API key provided',
            service: 'auth-middleware',
            error: {
              name: 'APIKeyVerificationFailed',
              message: apiKeyResult.error?.message || 'API key verification failed'
            },
            metadata: {
              endpoint: request.nextUrl.pathname,
              method: request.method,
              partialKey: apiKeyHeader.substring(0, 8) + '...'
            }
          });

          return NextResponse.json(
            {
              error: {
                code: 'INVALID_API_KEY',
                message: 'Invalid API key',
                timestamp: new Date()
              }
            } as ApiResponse,
            { status: 401 }
          );
        }
      }

      // If no valid authentication found
      if (!user) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTHENTICATION_FAILED',
              message: 'Authentication failed. Provide a valid Bearer token or API key.',
              timestamp: new Date()
            }
          } as ApiResponse,
          { status: 401 }
        );
      }

      // Check role requirements
      if (options.role && user.role !== options.role) {
        await monitoring.log({
          level: 'warn',
          message: 'Insufficient role for endpoint access',
          service: 'auth-middleware',
          userId: user.id,
          metadata: {
            endpoint: request.nextUrl.pathname,
            method: request.method,
            requiredRole: options.role,
            userRole: user.role,
            authMethod
          }
        });

        return NextResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_ROLE',
              message: `Required role: ${options.role}. Your role: ${user.role}`,
              timestamp: new Date()
            }
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Check permission requirements
      if (options.permissions && options.permissions.length > 0) {
        const permissionCheck = await auth.checkPermissions(user.id, options.permissions);
        
        if (permissionCheck.error || !permissionCheck.data?.authorized) {
          await monitoring.log({
            level: 'warn',
            message: 'Insufficient permissions for endpoint access',
            service: 'auth-middleware',
            userId: user.id,
            metadata: {
              endpoint: request.nextUrl.pathname,
              method: request.method,
              requiredPermissions: options.permissions,
              userPermissions: user.permissions,
              authMethod
            }
          });

          return NextResponse.json(
            {
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have the required permissions to access this endpoint',
                details: {
                  required: options.permissions,
                  missing: options.permissions.filter(p => !user.permissions.includes(p))
                },
                timestamp: new Date()
              }
            } as ApiResponse,
            { status: 403 }
          );
        }
      }

      // Check optional permissions (any one required)
      if (options.optionalPermissions && options.optionalPermissions.length > 0) {
        const hasAnyPermission = options.optionalPermissions.some(permission => 
          user.permissions.includes(permission)
        );

        if (!hasAnyPermission) {
          await monitoring.log({
            level: 'warn',
            message: 'No matching optional permissions for endpoint access',
            service: 'auth-middleware',
            userId: user.id,
            metadata: {
              endpoint: request.nextUrl.pathname,
              method: request.method,
              optionalPermissions: options.optionalPermissions,
              userPermissions: user.permissions,
              authMethod
            }
          });

          return NextResponse.json(
            {
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You need at least one of the required permissions to access this endpoint',
                details: {
                  requiredAny: options.optionalPermissions
                },
                timestamp: new Date()
              }
            } as ApiResponse,
            { status: 403 }
          );
        }
      }

      // Check MFA requirements
      if (options.requireMfa && !user.mfaEnabled) {
        await monitoring.log({
          level: 'warn',
          message: 'MFA required but not enabled for user',
          service: 'auth-middleware',
          userId: user.id,
          metadata: {
            endpoint: request.nextUrl.pathname,
            method: request.method,
            authMethod
          }
        });

        return NextResponse.json(
          {
            error: {
              code: 'MFA_REQUIRED',
              message: 'Multi-factor authentication is required for this endpoint',
              timestamp: new Date()
            }
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Log successful authentication
      await monitoring.log({
        level: 'info',
        message: 'User authenticated successfully',
        service: 'auth-middleware',
        userId: user.id,
        metadata: {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          authMethod,
          userRole: user.role,
          authDuration: Date.now() - startTime
        }
      });

      // Record authentication metrics
      await monitoring.recordMetric({
        name: 'auth.requests',
        value: 1,
        type: 'counter',
        tags: {
          method: authMethod,
          endpoint: request.nextUrl.pathname,
          userRole: user.role,
          success: 'true'
        },
        timestamp: new Date()
      });

      // Add user context to request headers for downstream handlers
      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-user-id': user.id,
          'x-user-role': user.role,
          'x-auth-method': authMethod
        },
        body: request.body
      });

      // Call the actual handler
      return handler(modifiedRequest);

    } catch (error) {
      const services = await getServices().catch(() => null);
      if (services?.monitoring) {
        await services.monitoring.log({
          level: 'error',
          message: 'Unexpected error in authentication middleware',
          service: 'auth-middleware',
          error: {
            name: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            stack: error instanceof Error ? error.stack : undefined
          },
          metadata: {
            endpoint: request.nextUrl.pathname,
            method: request.method
          }
        });

        await services.monitoring.recordMetric({
          name: 'auth.errors',
          value: 1,
          type: 'counter',
          tags: {
            endpoint: request.nextUrl.pathname,
            errorType: 'middleware_error'
          },
          timestamp: new Date()
        });
      }

      return NextResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'An error occurred during authentication',
            timestamp: new Date()
          }
        } as ApiResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to extract client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check for forwarded IP addresses (from proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  return request.headers.get('x-client-ip') || 'unknown';
}

/**
 * Middleware for endpoints that require authentication
 */
export const requireAuth = withAuth();

/**
 * Middleware for admin-only endpoints
 */
export const requireAdmin = withAuth({
  role: 'admin'
});

/**
 * Middleware for agent management endpoints
 */
export const requireAgentPermissions = withAuth({
  permissions: ['agents:read', 'agents:create', 'agents:update']
});

/**
 * Middleware that allows both JWT and API key authentication
 */
export const allowApiKey = withAuth({
  allowApiKey: true
});

/**
 * Helper to get authenticated user from request headers
 */
export function getAuthenticatedUser(request: NextRequest): { userId: string; role: string; authMethod: string } | null {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const authMethod = request.headers.get('x-auth-method');

  if (!userId || !userRole || !authMethod) {
    return null;
  }

  return {
    userId,
    role: userRole,
    authMethod
  };
}

/**
 * Rate limiting middleware (placeholder)
 */
export function withRateLimit(options: { 
  windowMs: number; 
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // TODO: Implement proper rate limiting with Redis or in-memory store
    // For now, just pass through to handler
    
    const services = await getServices();
    const { monitoring } = services;

    // Log rate limit attempt
    await monitoring.recordMetric({
      name: 'api.rate_limit_checks',
      value: 1,
      type: 'counter',
      tags: {
        endpoint: request.nextUrl.pathname,
        method: request.method
      },
      timestamp: new Date()
    });

    return handler(request);
  };
}
