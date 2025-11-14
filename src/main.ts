import { Firebot, RunRequest } from '@crowbartools/firebot-custom-scripts-types';
import { Logger } from '@crowbartools/firebot-custom-scripts-types/types/modules/logger';
import { IntegrationConstants } from './constants';

export let firebot: RunRequest<any>;
export let logger: LogWrapper;

export const scriptVersion = '0.0.1';

interface ScriptParameters extends Record<string, unknown> {
    debug?: boolean;
}

const script: Firebot.CustomScript<ScriptParameters> = {
    getScriptManifest: () => {
        return {
            name: 'Platform Library',
            description: 'Shared platform-aware logic for multi-platform streaming',
            author: 'The Static Mage',
            version: scriptVersion,
            startupOnly: true,
            firebotVersion: '5'
        };
    },
    getDefaultParameters: () => {
        return {
            debug: {
                type: 'boolean',
                title: 'Debug Mode',
                default: false,
                description: 'Enable debug logging'
            }
        };
    },
    run: (runRequest: RunRequest<ScriptParameters>) => {
        firebot = runRequest;
        const debugMode = typeof runRequest.parameters?.debug === 'boolean' ? runRequest.parameters.debug : false;
        logger = new LogWrapper(runRequest.modules.logger, debugMode);

        logger.info(`Platform Library v${scriptVersion} initializing...`);

        // TODO: Initialize PlatformLibrary class here when implemented
        // const platformLib = new PlatformLibrary(logger, runRequest.modules, debugMode);
        // await platformLib.initialize();

        logger.info('Platform Library initialized successfully');
    }
};

export default script;

class LogWrapper {
    private _logger: Logger;
    private _debug: boolean;

    constructor(inLogger: Logger, debug = false) {
        this._logger = inLogger;
        this._debug = debug;
    }

    info(message: string) {
        this._logger.info(`[${IntegrationConstants.INTEGRATION_ID}] ${message}`);
    }

    error(message: string) {
        this._logger.error(`[${IntegrationConstants.INTEGRATION_ID}] ${message}`);
    }

    debug(message: string) {
        if (this._debug) {
            this._logger.debug(`[${IntegrationConstants.INTEGRATION_ID}] ${message}`);
        }
    }

    warn(message: string) {
        this._logger.warn(`[${IntegrationConstants.INTEGRATION_ID}] ${message}`);
    }
}
