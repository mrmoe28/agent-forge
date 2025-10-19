/**
 * API Response Utilities
 *
 * Standardized response formatting for API routes.
 * Provides consistent structure for success and error responses.
 */

import { NextResponse } from 'next/server';

/**
 * Standard API error response structure
 */
export interface APIErrorResponse {
  error: string;
  validationErrors?: Record<string, string[]>;
  statusCode: number;
  timestamp: string;
}

/**
 * Standard API success response structure
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<APISuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  message: string,
  status = 500,
  validationErrors?: Record<string, string[]>
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      validationErrors,
      statusCode: status,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create a validation error response (400)
 */
export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<APIErrorResponse> {
  return errorResponse('Validation failed', 400, errors);
}

/**
 * Create a not found error response (404)
 */
export function notFoundResponse(resource: string): NextResponse<APIErrorResponse> {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Create an unauthorized error response (401)
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<APIErrorResponse> {
  return errorResponse(message, 401);
}

/**
 * Create a forbidden error response (403)
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse<APIErrorResponse> {
  return errorResponse(message, 403);
}

/**
 * Create an internal server error response (500)
 */
export function serverErrorResponse(message = 'Internal server error'): NextResponse<APIErrorResponse> {
  return errorResponse(message, 500);
}
