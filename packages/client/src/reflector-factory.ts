import { AngularJsFactory, UIExtension } from '@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';

/**
 * Configuration for creating a custom reflector
 */
export interface ReflectorConfig {
    /**
     * Name of the reflector (e.g., "my-integration")
     * Used to prefix all IPC events
     */
    reflectorName: string;

    /**
     * Optional logger for debug output
     */
    logger?: {
        debug: (msg: string) => void;
        error: (msg: string) => void;
    };
}

/**
 * Data structure for reflected events sent from backend to frontend
 */
export interface ReflectedEvent {
    id: string;
    async: boolean;
    eventName: string;
    eventData: any;
}

/**
 * Creates a reusable reflector UI extension and event functions
 *
 * The reflector allows backend scripts to call frontend handlers and wait for responses.
 * It works by having a frontend UI extension that forwards events through backendCommunicator.
 *
 * @param config Configuration for the reflector
 * @returns Object with UIExtension and helper functions
 *
 * @example
 * const { extension, reflectEvent, waitForReflector } = createReflector({ reflectorName: 'my-integration' });
 *
 * // In Firebot backend script:
 * await waitForReflector(modules, logger); // Wait for frontend reflector to initialize
 * const response = await reflectEvent('some-backend-event', { data: 'test' });
 */
export function createReflector(config: ReflectorConfig) {
    const { reflectorName, logger } = config;
    const readyEventName = `${reflectorName}:reflector-ready`;
    const syncEventName = `${reflectorName}:reflect-sync`;
    const responseEventName = `${reflectorName}:reflect-response`;
    const errorEventName = `${reflectorName}:reflect-error`;

    /**
     * AngularJS factory that runs in the frontend and handles reflected events
     * Event names are embedded directly as literal strings so they survive
     * toString()/eval() serialization
     *
     * WORKAROUND NOTE: This reflector pattern is a workaround for the fact that
     * Firebot's custom script API does not expose the various internals to
     * scripts. The reflector works around this for data and actions within
     * Firebot which are exposed through internal IPC communication by:
     * 1. Registering a UI extension (AngularJS factory) in the frontend
     * 2. Having the frontend listen for events from the backend
     * 3. Forwarding those events to backendCommunicator to reach other backend
     *    handlers
     * 4. Returning the response back to the original backend caller
     *
     * If Firebot were to expose the actual functionality directly in the custom
     * script API, this workaround would no longer be necessary.
     */
    const reflectorService: AngularJsFactory = {
        name: `${reflectorName}ReflectorService`,
        // Create the factory function with a custom toString that embeds values
        function: Object.defineProperty(
            function(backendCommunicator: any) {
                const eventSync = `${reflectorName}:reflect-sync`;
                const eventResponse = `${reflectorName}:reflect-response`;
                const eventError = `${reflectorName}:reflect-error`;
                const eventReady = `${reflectorName}:reflector-ready`;

                // Use onAsync to properly handle both sync and async backend handlers
                backendCommunicator.onAsync(eventSync, async (data: ReflectedEvent) => {
                    if (data == null || !data.eventName?.length) {
                        return;
                    }

                    if (data.async) {
                        try {
                            const result = await backendCommunicator.fireEventAsync(data.eventName, data.eventData);
                            // Send response back through a response event with the same id
                            backendCommunicator.fireEventAsync(`${eventResponse}:${data.id}`, result);
                            return result;
                        } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            backendCommunicator.fireEventAsync(`${eventError}:${data.id}`, {
                                message: errorMsg
                            });
                            throw error;
                        }
                    }

                    return backendCommunicator.fireEventSync(data.eventName, data.eventData);
                });

                // Signal to backend that reflector is ready
                backendCommunicator.fireEventAsync(eventReady, {}).catch(() => {
                    // Ignore errors if no one is listening
                });

                return {};
            },
            'toString',
            {
                value: function() {
                    return `['backendCommunicator', function(backendCommunicator) {
                        const eventSync = '${reflectorName}:reflect-sync';
                        const eventResponse = '${reflectorName}:reflect-response';
                        const eventError = '${reflectorName}:reflect-error';
                        const eventReady = '${reflectorName}:reflector-ready';
                        backendCommunicator.onAsync(eventSync, async (data) => {
                            if (data == null || !data.eventName?.length) {
                                return;
                            }
                            if (data.async) {
                                try {
                                    const result = await backendCommunicator.fireEventAsync(data.eventName, data.eventData);
                                    backendCommunicator.fireEventAsync(eventResponse + ':' + data.id, result);
                                    return result;
                                } catch (error) {
                                    const errorMsg = error instanceof Error ? error.message : String(error);
                                    backendCommunicator.fireEventAsync(eventError + ':' + data.id, { message: errorMsg });
                                    throw error;
                                }
                            }
                            return backendCommunicator.fireEventSync(data.eventName, data.eventData);
                        });
                        backendCommunicator.fireEventAsync(eventReady, {}).catch(() => {});
                        return {};
                    }]`;
                }
            }
        ) as any
    };

    /**
     * UI Extension configuration for the reflector service
     */
    const extension: UIExtension = {
        id: `${reflectorName}-reflector`,
        providers: {
            factories: [reflectorService]
        }
    };

    /**
     * Waits for the reflector to be initialized
     * @param modules ScriptModules from RunRequest
     * @param timeoutMs How long to wait before timing out (default 5000ms)
     * @returns Promise that resolves when reflector is ready
     */
    async function waitForReflector(
        modules: ScriptModules,
        timeoutMs = 1000
    ): Promise<void> {
        return new Promise((resolve) => {
            const { frontendCommunicator } = modules;

            const timeout = setTimeout(() => {
                const errorMsg = `${reflectorName} reflector did not initialize within ${timeoutMs}ms`;
                logger?.error(errorMsg);
                // Resolve anyway to allow continuation
                resolve();
            }, timeoutMs);

            frontendCommunicator.on(readyEventName, () => {
                clearTimeout(timeout);
                logger?.debug(`${reflectorName} reflector is ready`);
                resolve();
            });
        });
    }

    /**
     * Sends a reflected event from backend to frontend
     * @param modules ScriptModules from RunRequest (passed every time reflectEvent is called)
     * @param eventName Name of the event to call on the backend
     * @param eventData Data to pass to the event handler
     * @param isAsync Whether to wait for a response (default true)
     * @returns Promise with the response data
     */
    async function reflectEvent<T>(
        modules: ScriptModules,
        eventName: string,
        eventData: any,
        isAsync = true
    ): Promise<T> {
        const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const payload: ReflectedEvent = {
            id: requestId,
            async: isAsync,
            eventName,
            eventData
        };

        logger?.debug(
            `${reflectorName} sending reflected event: ${eventName} (async=${isAsync}, id=${requestId})`
        );

        if (!modules?.frontendCommunicator) {
            throw new Error(
                `${reflectorName} reflector not initialized. Did you call waitForReflector()?`
            );
        }

        const { frontendCommunicator } = modules;
        const eventTimeoutMs = 1000;
        let timeout: NodeJS.Timeout;
        let handled = false;

        return new Promise<T>((resolve, reject) => {
            // Set up response listener
            const responseHandler = (response: T) => {
                if (handled) {
                    return;
                }
                handled = true;
                clearTimeout(timeout);
                const responseStr = JSON.stringify(response);
                const truncatedResponse =
                    responseStr.length > 100 ? `${responseStr.substring(0, 100)}...` : responseStr;
                logger?.debug(
                    `${reflectorName} reflected event response: ${eventName} (id=${requestId}) response=${truncatedResponse}`
                );
                resolve(response);
            };

            const errorHandler = (error: { message: string }) => {
                if (handled) {
                    return;
                }
                handled = true;
                clearTimeout(timeout);
                logger?.error(
                    `${reflectorName} reflected event error: ${eventName} (id=${requestId}) error=${error.message}`
                );
                reject(new Error(error.message));
            };

            timeout = setTimeout(() => {
                if (handled) {
                    return;
                }
                handled = true;
                const errorMsg = `${reflectorName} reflected event timeout: ${eventName} (id=${requestId})`;
                logger?.error(errorMsg);
                reject(new Error(errorMsg));
            }, eventTimeoutMs);

            // Register handlers for response and error
            frontendCommunicator.on(`${responseEventName}:${requestId}`, responseHandler);
            frontendCommunicator.on(`${errorEventName}:${requestId}`, errorHandler);

            // Send the request
            frontendCommunicator.send(syncEventName, payload);
        });
    }

    return {
        extension,
        waitForReflector,
        reflectEvent
    };
}

/**
 * Initializes and waits for a custom reflector
 *
 * This is a convenience function that combines registering the reflector UI extension
 * and waiting for it to be ready.
 *
 * Note: You must pass modules to reflectEvent() on each call. It is not stored globally.
 *
 * @param reflectorName Name of the reflector
 * @param modules ScriptModules from RunRequest
 * @param logger Optional logger for debug output
 * @param timeoutMs How long to wait for reflector to initialize (default 5000ms)
 * @returns Promise that resolves when reflector is fully initialized
 *
 * @example
 * const { reflectEvent } = createReflector({ reflectorName: 'my-integration' });
 * await initializeReflector('my-integration', runRequest.modules, logger);
 * const response = await reflectEvent(runRequest.modules, 'some-event', data);
 */
export async function initializeReflector(
    reflectorName: string,
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<void> {
    const { extension, waitForReflector } = createReflector({
        reflectorName,
        logger
    });

    // Register the reflector UI extension
    const uiExtensionManager = modules.uiExtensionManager;
    if (!uiExtensionManager) {
        throw new Error('UI Extension Manager not available');
    }

    logger?.debug(`${reflectorName} registering UI extension...`);
    uiExtensionManager.registerUIExtension(extension);

    // Wait for reflector to initialize
    await waitForReflector(modules, timeoutMs);
}
