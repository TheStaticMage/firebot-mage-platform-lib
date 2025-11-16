/**
 * @mage-platform-lib/client
 *
 * Shared TypeScript types for the Mage Platform Library and integrations
 */

// Version types
export {
    PLATFORM_LIB_VERSION,
    PlatformLibVersionInfo,
    IntegrationVersionInfo,
    SUPPORTED_OPERATIONS,
    createPlatformLibVersionInfo,
    createIntegrationVersionInfo
} from './version';

// Version compatibility
export {
    VersionCheckResult,
    PLATFORM_LIB_MIN_VERSION,
    checkVersionCompatibility
} from './version-compatibility';

// Platform library compatibility check
export {
    checkPlatformLibCompatibility
} from './platform-lib-checker';

// Semantic version checking (commonly used for Firebot version validation)
export {
    checkSemanticVersion
} from './semantic-version';

// Operation types
export type {
    SendChatMessageRequest,
    SendChatMessageResponse,
    GetUserDisplayNameRequest,
    GetUserDisplayNameResponse,
    OperationName
} from './operations';

// Registry types
export {
    DetectedIntegration,
    QueryPlatformsResponse
} from './registry';

// Script loading utilities
export {
    loadScriptVersion
} from './script-loader';

// Error modal utilities
export {
    ErrorModalConfig,
    createErrorModal,
    initializeErrorModal
} from './error-modal-factory';

// Startup scripts utilities
export {
    ScriptManifest,
    getStartupScripts,
    resetStartupScriptsReflector
} from './startup-scripts';

// Platform detection
export {
    detectPlatform
} from './platform-detector';

// HTTP route helpers for integrations
export {
    HttpServer,
    OperationHandler,
    OperationConfig,
    StandardErrorResponse,
    registerOperation,
    unregisterOperation,
    validateRequired,
    createValidationErrorResponse
} from './http-route-helpers';

// Operation and integration constants
export {
    OPERATIONS,
    PLATFORMS,
    INTEGRATIONS,
    PLATFORM_TO_INTEGRATION,
    DEFAULT_WEB_SERVER_PORT,
    OPERATION_TIMEOUTS,
    OPERATION_RETRIES
} from './constants';
