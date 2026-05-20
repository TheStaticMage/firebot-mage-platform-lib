import * as fs from "node:fs";
import * as path from "node:path";

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
 * @param debugLogger Optional logger for debug output
 * @returns Version string or undefined if not found
 */
export function loadScriptVersion(
    scriptName: string,
    scriptDataDir: string | undefined,
    debugLogger?: { debug: (msg: string) => void }
): string {
    if (!scriptDataDir) {
        throw new Error("scriptDataDir is required to load script version");
    }

    // Construct full script path from scriptDataDir
    // scriptDataDir is at {profile}/script-data/{script-name}/
    // scripts folder is at {profile}/scripts/
    const scriptsFolder = path.resolve(scriptDataDir, "../../scripts");
    const scriptPath = path.join(scriptsFolder, scriptName);

    debugLogger?.debug(
        `Script path resolution: scriptDataDir=${scriptDataDir}, scriptsFolder=${scriptsFolder}, scriptPath=${scriptPath}`
    );

    // For bundled webpack scripts, read the file and eval it to get the actual exports
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found at path: ${scriptPath}`);
    }

    const fileContent = fs.readFileSync(scriptPath, "utf8");

    // Create a context object to capture the module exports
    const moduleContext = { exports: {} };

    // Execute the bundled code with access to the module context
    // The bundled webpack code will populate module.exports with the script's exports
    // eslint-disable-next-line no-eval
    eval(`(function(module) { ${fileContent} })(moduleContext);`);

    // Try to get the manifest from the evaluated module exports
    const evaledModule = moduleContext.exports as any;
    if (
        evaledModule &&
        typeof evaledModule.getScriptManifest === "function"
    ) {
        const manifest = evaledModule.getScriptManifest();
        if (manifest && typeof manifest === "object" && manifest.version) {
            debugLogger?.debug(
                `Extracted version from eval'd script: ${manifest.version}`
            );
            return manifest.version;
        }

        throw new Error(`getScriptManifest() did not return a valid manifest with version for script: ${scriptName}`);
    }

    throw new Error(`Could not get evaledModule.getScriptManifest for script: ${scriptName}`);
}
