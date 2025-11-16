import { RunRequest } from "@crowbartools/firebot-custom-scripts-types";
import { getStartupScripts } from "./startup-scripts";
import { checkSemanticVersion } from "./semantic-version";
import { loadScriptVersion } from "./script-loader";

/**
 * Checks if platform-lib startup script is installed and meets minimum version requirement.
 *
 * @param runRequest - Firebot RunRequest with modules and scriptDataDir
 * @param integrationName - Name of the integration performing the check (for logging and error messages)
 * @param constraint - Incoming constraint to check against
 * @param logger - Logger for debug output
 * @returns Object with success status and error message if check fails
 */
export async function checkPlatformLibCompatibility(
    runRequest: RunRequest<any>,
    integrationName: string,
    constraint: string,
    logger: { debug: (msg: string) => void; error: (msg: string) => void }
): Promise<{ success: boolean; errorMessage?: string }> {
    const { modules, scriptDataDir } = runRequest;
    try {
        logger.debug(`Checking platform-lib compatibility against constraint: ${constraint} for integration: ${integrationName}`);
        const startupScripts = await getStartupScripts(modules, logger, 5000);

        // Look for platform-lib startup script by ID
        // Following the same pattern as integration-detector.ts
        const platformLib = startupScripts.find(
            (script: any) => script.name?.toLowerCase() === "firebot-mage-platform-lib"
        );

        if (!platformLib) {
            logger.error(`Platform-lib startup script not found. Scripts found: ${startupScripts.map((s: any) => s.name).join(", ")}`);
            return {
                success: false,
                errorMessage:
                    `Platform Library startup script is not installed. Please install https://github.com/TheStaticMage/firebot-mage-platform-lib before using ${integrationName}.`
            };
        }

        if (!platformLib.scriptName) {
            return {
                success: false,
                errorMessage:
                    `Platform Library startup script could not determine its script name. Please reinstall https://github.com/TheStaticMage/firebot-mage-platform-lib before using ${integrationName}.`
            };
        }

        logger.debug(`Found platform-lib: ${platformLib.name} in script: ${platformLib.scriptName}`);
        const version = loadScriptVersion(platformLib.scriptName, scriptDataDir, modules, logger);

        if (!version) {
            return {
                success: false,
                errorMessage: `Platform Library version could not be determined. Please install https://github.com/TheStaticMage/firebot-mage-platform-lib before using ${integrationName}.`
            };
        }

        // Check version compatibility
        const isCompatible = checkSemanticVersion(version, constraint);
        if (!isCompatible) {
            return {
                success: false,
                errorMessage: `Platform Library version ${version} is not compatible. ${integrationName} requires version ${constraint} or higher. Please install a compatible version of https://github.com/TheStaticMage/firebot-mage-platform-lib before using ${integrationName}.`
            };
        }

        logger.debug(`Platform-lib v${version} is compatible`);

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error checking platform-lib compatibility: ${errorMessage}`);

        return {
            success: false,
            errorMessage: `Error checking Platform Library: ${errorMessage}`
        };
    }
}
