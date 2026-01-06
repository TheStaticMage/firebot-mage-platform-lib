import type { FirebotViewer } from '@crowbartools/firebot-custom-scripts-types/types/modules/viewer-database';

export type PlatformUser = Pick<
    FirebotViewer,
    '_id'
    | 'username'
    | 'displayName'
    | 'profilePicUrl'
    | 'lastSeen'
    | 'currency'
    | 'metadata'
    | 'chatMessages'
    | 'minutesInChannel'
    | 'twitchRoles'
>;
