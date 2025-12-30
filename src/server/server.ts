import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { IntegrationConstants } from "../constants";
import { LogWrapper } from "../main";

export function registerRoutes(modules: ScriptModules, logger: LogWrapper) {
    const { httpServer } = modules;

    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "ping",
        "GET",
        async (req, res) => {
            try {
                res.json({ success: true, message: "OK" });
            } catch (error) {
                logger.error(`ping operation failed: ${error}`);
                res.status(500).json({ success: false, error: String(error) });
            }
        }
    );

    logger.debug("Platform-lib HTTP endpoint handlers registered successfully.");
}

export function unregisterRoutes(modules: ScriptModules, logger: LogWrapper) {
    const { httpServer } = modules;

    httpServer.unregisterCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "ping",
        "GET"
    );

    logger.debug("Platform-lib HTTP endpoint handlers unregistered successfully.");
}
