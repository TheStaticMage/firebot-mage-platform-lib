import type { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { extractTriggerUserId } from '../internal/trigger-helpers';
import { firebot, logger, platformLib } from '../main';

interface IncrementPlatformUserMetadataEffectModel {
    platform: string;
    username: string;
    key: string;
    amount: number;
}

export const incrementPlatformUserMetadataEffect: Effects.EffectType<IncrementPlatformUserMetadataEffectModel> = {
    definition: {
        id: 'mage-platform-lib:increment-platform-user-metadata',
        name: 'Increment Platform User Metadata',
        description: 'Increment a numeric metadata value for a user on Twitch, Kick, or YouTube',
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
            <p class="muted">The metadata key to increment (or decrement if amount is negative).</p>
            <input ng-model="effect.key" type="text" class="form-control" id="chat-text-setting" placeholder="Enter key name" replace-variables>
        </eos-container>

        <eos-container header="Amount" pad-top="true">
            <p class="muted">The amount to increment by (can be negative to decrement). Non-numeric values are treated as 0.</p>
            <div class="input-group">
                <span class="input-group-addon" id="increment-type">Amount</span>
                <input type="text" ng-model="effect.amount" class="form-control" id="increment-setting" aria-describedby="increment-type" replace-variables="number">
            </div>
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

        if ($scope.effect.amount === undefined) {
            $scope.effect.amount = 1;
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
        if (effect.amount === undefined || effect.amount === null) {
            errors.push('Please provide an increment amount.');
        }
        return errors;
    },
    getDefaultLabel: (effect) => {
        if (!effect.platform || !effect.username || !effect.key || effect.amount === undefined) {
            return '';
        }
        const platformDisplay = effect.platform === 'auto-detect' ? 'Auto-detect' : effect.platform.charAt(0).toUpperCase() + effect.platform.slice(1);
        const action = effect.amount < 0 ? 'Decrement' : 'Increment';
        return `${action} ${effect.username}'s ${effect.key} by ${Math.abs(effect.amount)} (${platformDisplay})`;
    },
    onTriggerEvent: async (event) => {
        const { effect } = event;

        try {
            const username = typeof effect.username === 'string' ? effect.username.trim() : '';
            const key = typeof effect.key === 'string' ? effect.key.trim() : '';
            const amount = parseFloat(String(effect.amount));
            let platform = effect.platform;

            if (!username || !key) {
                logger.error('Increment Platform User Metadata: Username and key are required');
                return false;
            }

            if (isNaN(amount) || !isFinite(amount)) {
                logger.error(`Increment Platform User Metadata: Amount must be a valid, finite number: ${effect.amount}`);
                return false;
            }

            let detectedPlatform = platform;
            if (!detectedPlatform || detectedPlatform === 'auto-detect') {
                const triggerUserId = extractTriggerUserId(event.trigger);
                detectedPlatform = platformLib.userDatabase.detectPlatform(triggerUserId, username, event.trigger);
            }

            if (!detectedPlatform || detectedPlatform === 'unknown') {
                logger.error(`Increment Platform User Metadata: Cannot determine platform for user ${username}`);
                return false;
            }

            platform = detectedPlatform;

            if (platform === 'twitch') {
                const { viewerMetadataManager } = firebot.modules as unknown as {
                    viewerMetadataManager: {
                        getViewerMetadata: (username: string, key: string, propertyPath?: string) => Promise<unknown>;
                        updateViewerMetadata: (username: string, key: string, value: string, propertyPath?: string) => Promise<void>;
                    };
                };

                const currentValue = await viewerMetadataManager.getViewerMetadata(username, key, undefined);
                const numericValue = typeof currentValue === 'number' ? currentValue : 0;
                const newValue = numericValue + amount;
                await viewerMetadataManager.updateViewerMetadata(username, key, String(newValue), undefined);
                logger.debug(`Incremented metadata for Twitch user ${username}: ${key}=${newValue}`);
                return true;
            }

            if (platform !== 'kick' && platform !== 'youtube') {
                logger.error(`Increment Platform User Metadata: Platform ${platform} not supported`);
                return false;
            }

            const user = await platformLib.userDatabase.getUserByUsername(username, platform);
            if (!user) {
                logger.error(`Increment Platform User Metadata: User not found: ${username}`);
                return false;
            }

            const newValue = await platformLib.userDatabase.incrementUserMetadata(platform, user._id, key, amount);
            logger.debug(`Incremented metadata for ${platform} user ${username}: ${key}=${newValue}`);
            return true;
        } catch (error) {
            logger.error(`Increment Platform User Metadata: ${error}`);
            return false;
        }
    }
};
