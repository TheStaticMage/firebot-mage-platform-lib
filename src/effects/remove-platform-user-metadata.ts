import type { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { extractTriggerUserId } from '../internal/trigger-helpers';
import { firebot, logger, platformLib } from '../main';

interface RemovePlatformUserMetadataEffectModel {
    platform: string;
    username: string;
    key: string;
}

export const removePlatformUserMetadataEffect: Effects.EffectType<RemovePlatformUserMetadataEffectModel> = {
    definition: {
        id: 'mage-platform-lib:remove-platform-user-metadata',
        name: 'Remove Platform User Metadata',
        description: 'Remove a metadata key from a user on Twitch, Kick, or YouTube',
        icon: 'fad fa-user-cog',
        categories: ['advanced', 'scripting']
    },
    optionsTemplate: `
        <eos-container header="Platform">
            <dropdown-select options="platformOptions" selected="effect.platform"></dropdown-select>
        </eos-container>

        <p class="muted" style="margin: 10px 0 0 10px;" ng-if="effect.platform === 'auto-detect'">
            Auto-detect will identify the platform from the username suffix, falling back to trigger metadata.
        </p>

        <eos-container header="Username" pad-top="true">
            <input type="text" class="form-control" aria-describedby="basic-addon3" ng-model="effect.username" placeholder="Enter username" replace-variables menu-position="below" />
        </eos-container>

        <eos-container header="Metadata Key" pad-top="true">
            <p class="muted">Define which key you want to delete from this user's metadata.</p>
            <input ng-model="effect.key" type="text" class="form-control" id="chat-text-setting" placeholder="Enter key name" replace-variables>
        </eos-container>
    `,
    optionsController: ($scope: any, backendCommunicator: any) => {
        $scope.platformOptions = {
            'auto-detect': 'Auto-detect',
            twitch: 'Twitch'
        };

        const response = backendCommunicator.fireEventSync('platform-lib:get-available-platforms');
        if (response && response.platforms) {
            if (response.platforms.includes('kick')) {
                $scope.platformOptions.kick = 'Kick';
            }
            if (response.platforms.includes('youtube')) {
                $scope.platformOptions.youtube = 'YouTube';
            }
        }
    },
    optionsValidator: (effect) => {
        const errors: string[] = [];
        if (!effect.platform) {
            errors.push('Please select a platform.');
        }
        if (effect.username == null || effect.username === '') {
            errors.push('Please provide a username.');
        }
        if (effect.key == null || effect.key === '') {
            errors.push('Please provide a key name.');
        }
        return errors;
    },
    getDefaultLabel: (effect) => {
        if (!effect.platform || !effect.username || !effect.key) {
            return '';
        }
        const platformDisplay = effect.platform === 'auto-detect' ? 'Auto-detect' : effect.platform.charAt(0).toUpperCase() + effect.platform.slice(1);
        return `Remove ${effect.username}'s ${effect.key} (${platformDisplay})`;
    },
    onTriggerEvent: async (event) => {
        const { effect } = event;

        try {
            const username = typeof effect.username === 'string' ? effect.username.trim() : '';
            const key = typeof effect.key === 'string' ? effect.key.trim() : '';
            let platform = effect.platform;

            if (!username || !key) {
                logger.error('Remove Platform User Metadata: Username and key are required');
                return false;
            }

            let detectedPlatform = platform;
            if (!detectedPlatform || detectedPlatform === 'auto-detect') {
                const triggerUserId = extractTriggerUserId(event.trigger);
                detectedPlatform = platformLib.userDatabase.detectPlatform(triggerUserId, username, event.trigger);
            }

            if (!detectedPlatform || detectedPlatform === 'unknown') {
                logger.error(`Remove Platform User Metadata: Cannot determine platform for user ${username}`);
                return false;
            }

            platform = detectedPlatform;

            if (platform === 'twitch') {
                const { viewerMetadataManager } = firebot.modules as unknown as {
                    viewerMetadataManager: {
                        removeViewerMetadata: (username: string, key: string) => Promise<void>;
                    };
                };
                await viewerMetadataManager.removeViewerMetadata(username, key);
                logger.debug(`Removed metadata for Twitch user ${username}: ${key}`);
                return true;
            }

            if (platform !== 'kick' && platform !== 'youtube') {
                logger.error(`Remove Platform User Metadata: Platform ${platform} not supported`);
                return false;
            }

            const user = await platformLib.userDatabase.getUserByUsername(username, platform);
            if (!user) {
                logger.error(`Remove Platform User Metadata: User not found: ${username}`);
                return false;
            }

            await platformLib.userDatabase.removeUserMetadata(platform, user._id, key);
            logger.debug(`Removed metadata for ${platform} user ${username}: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Remove Platform User Metadata: ${error}`);
            return false;
        }
    }
};
