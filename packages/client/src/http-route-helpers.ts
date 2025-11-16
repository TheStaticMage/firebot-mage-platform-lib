/**
 * Helper functions for registering HTTP operation routes in integrations
 */

import type { Request, Response } from 'express';

/**
 * Type definition for HTTP server object
 */
export interface HttpServer {
    registerCustomRoute(
        prefix: string,
        route: string,
        method: string,
        handler: (req: Request, res: Response) => Promise<void> | void
    ): void;
    unregisterCustomRoute(prefix: string, route: string, method: string): void;
}

/**
 * Handler for an operation
 */
export type OperationHandler<TRequest = any, TResponse = any> = (
    request: TRequest
) => Promise<TResponse>;

/**
 * Configuration for registering an operation
 */
export interface OperationConfig<TRequest = any, TResponse = any> {
    integrationId: string;
    operation: string;
    method: 'GET' | 'POST';
    handler: OperationHandler<TRequest, TResponse>;
}

/**
 * Standard error response format
 */
export interface StandardErrorResponse {
    success: false;
    error: string;
}

/**
 * Registers an operation route with standard error handling
 */
export function registerOperation<TRequest = any, TResponse = any>(
    httpServer: HttpServer,
    config: OperationConfig<TRequest, TResponse>
): void {
    const { integrationId, operation, method, handler } = config;
    const route = `/operations/${operation}`;

    httpServer.registerCustomRoute(
        integrationId,
        route,
        method,
        async (req: Request, res: Response) => {
            try {
                // Build request data based on HTTP method
                let requestData: TRequest;
                if (method === 'GET') {
                    requestData = (req.query as unknown) as TRequest;
                } else {
                    requestData = (req.body as unknown) as TRequest;
                }

                const result = await handler(requestData);
                res.json(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                const errorResponse: StandardErrorResponse = {
                    success: false,
                    error: message
                };
                res.status(500).json(errorResponse);
            }
        }
    );
}

/**
 * Unregisters an operation route
 */
export function unregisterOperation(
    httpServer: HttpServer,
    integrationId: string,
    operation: string,
    method: 'GET' | 'POST' = 'POST'
): void {
    const route = `/operations/${operation}`;
    httpServer.unregisterCustomRoute(integrationId, route, method);
}

/**
 * Helper to validate required fields in a request
 */
export function validateRequired<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
            errors.push(`${String(field)} is required`);
        }
    }

    return errors;
}

/**
 * Helper to create a standard error response for validation failures
 */
export function createValidationErrorResponse(errors: string[]): StandardErrorResponse {
    return {
        success: false,
        error: errors.join('; ')
    };
}
