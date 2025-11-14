/**
 * @mage-platform-lib/types
 *
 * Shared TypeScript types for the Mage Platform Library and integrations
 */

// Version types
export {
    PLATFORM_LIB_VERSION,
    PlatformLibVersionInfo,
    IntegrationVersionInfo
} from './version';

// Operation types
export {
    PlatformOperation,
    SendChatMessageRequest,
    SendChatMessageResponse,
    GetUserDisplayNameRequest,
    GetUserDisplayNameResponse,
    BanUserRequest,
    BanUserResponse,
    TimeoutUserRequest,
    TimeoutUserResponse,
    SetStreamTitleRequest,
    SetStreamTitleResponse,
    SetStreamCategoryRequest,
    SetStreamCategoryResponse,
    OperationName
} from './operations';

// Registry types
export {
    DetectedIntegration,
    RegistrationRequest,
    RegistrationResponse,
    DeregistrationRequest,
    DeregistrationResponse,
    QueryPlatformsResponse
} from './registry';
