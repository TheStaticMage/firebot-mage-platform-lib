import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';

/**
 * Loads a script's manifest and extracts version information from bundled integration scripts.
 *
 * IMPLEMENTATION NOTE: This function uses eval() to execute bundled webpack scripts because Firebot
 * does not expose:
 * 1. A public API to query installed script metadata (versions, manifests) without going through IPC
 * 2. The script manifest data within the startup script response objects
 * 3. Access to the actual script files to call getScriptManifest() directly via require()
 *
 * As a result, we must:
 * - Manually construct file paths from scriptDataDir (a private RunRequest field)
 * - Read bundled script files from disk ourselves
 * - Use eval() to execute the webpack bundle and extract the exports
 * - Call getScriptManifest() directly on the resulting module
 *
 * This workaround would be unnecessary if Firebot's startup script handler returned the version
 * info in the response, or if there was a public ScriptManager.getScriptManifest(scriptName) method.
 *
 * @param scriptName Name of the script file to load
 * @param scriptDataDir Path to the script data directory (typically from RunRequest.scriptDataDir)
 * @param modules ScriptModules from RunRequest
 * @param debugLogger Optional logger for debug output
 * @returns Version string or undefined if not found
 */
export function loadScriptVersion(
    scriptName: string,
    scriptDataDir: string | undefined,
    modules: ScriptModules | undefined,
    debugLogger?: { debug: (msg: string) => void }
): string | undefined {
    if (!scriptDataDir || !modules?.path || !modules?.fs) {
        return undefined;
    }

    try {
        const pathModule = modules.path;
        const fsModule = modules.fs;

        // Construct full script path from scriptDataDir
        // scriptDataDir is at {profile}/script-data/{script-name}/
        // scripts folder is at {profile}/scripts/
        const scriptsFolder = pathModule.resolve(scriptDataDir, '../../scripts');
        const scriptPath = pathModule.join(scriptsFolder, scriptName);

        debugLogger?.debug(
            `Script path resolution: scriptDataDir=${scriptDataDir}, scriptsFolder=${scriptsFolder}, scriptPath=${scriptPath}`
        );

        // For bundled webpack scripts, read the file and eval it to get the actual exports
        if (fsModule.existsSync(scriptPath) && fsModule.readFileSync) {
            const fileContent = fsModule.readFileSync(scriptPath, 'utf8');

            // Create a context object to capture the module exports
            const moduleContext = { exports: {} };

            // Execute the bundled code with access to the module context
            // The bundled webpack code will populate module.exports with the script's exports
            // eslint-disable-next-line no-eval
            eval(`(function(module) { ${fileContent} })(moduleContext);`);

            // Try to get the manifest from the evaluated module exports
            const evaledModule = moduleContext.exports as any;
            if (evaledModule && typeof evaledModule.getScriptManifest === 'function') {
                const manifest = evaledModule.getScriptManifest();
                if (manifest && typeof manifest === 'object' && manifest.version) {
                    debugLogger?.debug(`Extracted version from eval'd script: ${manifest.version}`);
                    return manifest.version;
                }
            }
        }

        // If no version found, return undefined
        return undefined;
    } catch (error) {
        debugLogger?.debug(`Failed to load script manifest for ${scriptName}: ${error}`);
        return undefined;
    }
}
