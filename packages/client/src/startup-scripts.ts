import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { createReflector } from './reflector-factory';

/**
 * Script manifest from Firebot
 *
 * Note: The version is NOT included in this manifest. Firebot's startup scripts list
 * does not provide version information. To get the version of a script, use
 * loadScriptVersion() which extracts version info directly from the script file.
 */
export interface ScriptManifest {
    name: string;
    id?: string;
    scriptName?: string;
}

/**
 * Cached result of getStartupScripts
 * Since startup scripts don't change during the lifetime of the program,
 * we cache the result after the first successful query
 */
let cachedScripts: ScriptManifest[] | null = null;

/**
 * Retrieves the list of startup scripts from Firebot
 *
 * This function caches the result after the first successful query since startup scripts
 * don't change during the lifetime of the program. Each call creates a uniquely-named
 * reflector to avoid registration conflicts when multiple integrations call this function.
 *
 * @param modules ScriptModules from RunRequest
 * @param logger Optional logger for debug output
 * @param timeoutMs How long to wait for reflector initialization (default 5000ms)
 * @returns Array of startup script manifests (cached after first call)
 *
 * @example
 * const scripts = await getStartupScripts(runRequest.modules, logger);
 * for (const script of scripts) {
 *     console.log(`Script: ${script.name}`);
 *     // To get version, use loadScriptVersion() with script.scriptName
 * }
 */
export async function getStartupScripts(
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<ScriptManifest[]> {
    // Return cached result if available
    if (cachedScripts !== null) {
        logger?.debug(`Returning cached startup scripts (${cachedScripts.length} scripts)`);
        return cachedScripts;
    }

    // Generate unique reflector name using timestamp and random suffix
    const uniqueReflectorName = `mage-startup-scripts-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    logger?.debug(`Creating startup scripts reflector: ${uniqueReflectorName}`);

    const startupScriptsReflector = createReflector({
        reflectorName: uniqueReflectorName,
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
    logger?.debug('Startup scripts reflector initialized');

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
            cachedScripts = [];
            return [];
        }

        logger?.debug(`Retrieved ${scripts.length} startup scripts from backend`);
        // Cache the result
        cachedScripts = scripts;
        return scripts;
    } catch (error) {
        const errorMsg = `Failed to query startup scripts: ${error}`;
        logger?.error(errorMsg);
        throw new Error(errorMsg);
    }
}

/**
 * Resets the startup scripts cache
 * Useful for testing or forcing a fresh query
 *
 * @internal
 */
export function resetStartupScriptsReflector(): void {
    cachedScripts = null;
}
