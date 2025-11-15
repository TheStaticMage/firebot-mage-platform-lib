import { createReflector } from "@thestaticmage/mage-platform-lib-client";
import { firebot, logger } from "./main";

// Create reflector using the factory with platform library's naming convention
const reflectorFactory = createReflector({
    reflectorName: "mage-platform-lib",
    logger
});

// Export the reflector extension for UI registration
export const reflectorExtension = reflectorFactory.extension;

/**
 * Wrapper around the factory's reflectEvent that uses the global firebot module
 * Provides convenience by automatically passing firebot.modules
 */
export async function reflectEvent<T>(
    eventName: string,
    eventData: any,
    isAsync = true
): Promise<T> {
    return reflectorFactory.reflectEvent<T>(firebot.modules, eventName, eventData, isAsync);
}

// Export the factory's waitForReflector for use during initialization
export const waitForReflector = reflectorFactory.waitForReflector;
