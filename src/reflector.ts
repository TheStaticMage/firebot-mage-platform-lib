import { AngularJsFactory, UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import { IntegrationConstants } from "./constants";
import { firebot, logger } from "./main";

export interface ReflectedEvent {
    id: string;
    async: boolean;
    eventName: string;
    eventData: any;
}

const reflectorService: AngularJsFactory = {
    name: "reflectorService",
    function: (backendCommunicator: any) => {
        // IntegrationConstants not available in here, so hardcoding
        // Use onAsync to properly handle both sync and async backend handlers
        backendCommunicator.onAsync(`mage-platform-lib:reflect-sync`, async (data: ReflectedEvent) => {
            if (data == null || !data.eventName?.length) {
                return;
            }
            if (data.async) {
                try {
                    const result = await backendCommunicator.fireEventAsync(data.eventName, data.eventData);
                    // Send response back through a response event with the same id
                    backendCommunicator.fireEventAsync(`mage-platform-lib:reflect-response:${data.id}`, result);
                    return result;
                } catch (error) {
                    backendCommunicator.fireEventAsync(`mage-platform-lib:reflect-error:${data.id}`, { message: String(error) });
                    throw error;
                }
            }
            return backendCommunicator.fireEventSync(data.eventName, data.eventData);
        });

        // Signal to backend that reflector is ready
        backendCommunicator.fireEventAsync(`mage-platform-lib:reflector-ready`, {}).catch(() => {
            // Ignore errors if no one is listening
        });

        return {};
    }
};

export const reflectorExtension: UIExtension = {
    id: `${IntegrationConstants.INTEGRATION_ID}-reflector`,
    providers: {
        factories: [reflectorService]
    }
};

export async function reflectEvent<T>(
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
    logger.debug(`Sending reflect event to frontend: eventName=${eventName}, isAsync=${isAsync}, id=${requestId}`);

    const { frontendCommunicator } = firebot.modules;
    const timeoutMs = 10000;
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
            const truncatedResponse = responseStr.length > 100 ? `${responseStr.substring(0, 100)}...` : responseStr;
            logger.debug(`Reflect event response received for ${eventName}: id=${requestId} response=${truncatedResponse}`);
            resolve(response);
        };

        const errorHandler = (error: { message: string }) => {
            if (handled) {
                return;
            }
            handled = true;
            clearTimeout(timeout);
            logger.error(`Reflect event error for ${eventName}: id=${requestId} error=${error.message}`);
            reject(new Error(error.message));
        };

        timeout = setTimeout(() => {
            if (handled) {
                return;
            }
            handled = true;
            reject(new Error(`Reflect event timeout for ${eventName}: id=${requestId}`));
        }, timeoutMs);

        // Register handlers for response and error
        frontendCommunicator.on(`mage-platform-lib:reflect-response:${requestId}`, responseHandler);
        frontendCommunicator.on(`mage-platform-lib:reflect-error:${requestId}`, errorHandler);

        // Send the request
        frontendCommunicator.send(`mage-platform-lib:reflect-sync`, payload);
    });
}
