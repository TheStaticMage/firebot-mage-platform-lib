import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { createReflector } from './reflector-factory';

/**
 * Script manifest from Firebot
 */
export interface ScriptManifest {
    name: string;
    version?: string;
    id?: string;
    scriptName?: string;
}

/**
 * Singleton reflector for querying startup scripts
 * Created on first call to getStartupScripts, reused for all subsequent calls
 */
let startupScriptsReflector: ReturnType<typeof createReflector> | null = null;
let isInitialized = false;

/**
 * Retrieves the list of startup scripts from Firebot
 *
 * This function manages its own reflector singleton internally. The first call will create
 * a reflector and wait for it to initialize. Subsequent calls will reuse the same reflector.
 *
 * @param modules ScriptModules from RunRequest
 * @param logger Optional logger for debug output
 * @param timeoutMs How long to wait for reflector initialization (default 5000ms)
 * @returns Array of startup script manifests
 *
 * @example
 * const scripts = await getStartupScripts(runRequest.modules, logger);
 * for (const script of scripts) {
 *     console.log(`Script: ${script.name} v${script.version}`);
 * }
 */
export async function getStartupScripts(
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<ScriptManifest[]> {
    // Initialize reflector on first call
    if (!isInitialized) {
        logger?.debug('Initializing startup scripts reflector...');
        startupScriptsReflector = createReflector({
            reflectorName: 'mage-startup-scripts',
            logger
        });

        // Register the reflector UI extension
        const uiExtensionManager = modules.uiExtensionManager;
        if (!uiExtensionManager) {
            throw new Error('UI Extension Manager not available');
        }

        uiExtensionManager.registerUIExtension(startupScriptsReflector.extension);
        logger?.debug('Startup scripts reflector UI extension registered');

        // Wait for reflector to initialize
        await startupScriptsReflector.waitForReflector(modules, timeoutMs);
        isInitialized = true;
        logger?.debug('Startup scripts reflector initialized');
    }

    if (!startupScriptsReflector) {
        throw new Error('Failed to initialize startup scripts reflector');
    }

    // Query startup scripts using the reflector
    logger?.debug('Querying startup scripts from backend...');
    try {
        const response = await startupScriptsReflector.reflectEvent<any>(
            modules,
            'getStartupScripts',
            null,
            true
        );

        // Handle both array and object responses
        let scripts: ScriptManifest[] = [];
        if (Array.isArray(response)) {
            scripts = response;
        } else if (response && typeof response === 'object') {
            // Convert object with script IDs as keys to array of scripts
            scripts = Object.values(response);
        }

        if (!scripts || scripts.length === 0) {
            logger?.debug('No startup scripts returned from backend');
            return [];
        }

        logger?.debug(`Retrieved ${scripts.length} startup scripts from backend`);
        return scripts;
    } catch (error) {
        const errorMsg = `Failed to query startup scripts: ${error}`;
        logger?.error(errorMsg);
        throw new Error(errorMsg);
    }
}

/**
 * Resets the startup scripts reflector
 * Useful for testing or resetting the singleton
 *
 * @internal
 */
export function resetStartupScriptsReflector(): void {
    startupScriptsReflector = null;
    isInitialized = false;
}
