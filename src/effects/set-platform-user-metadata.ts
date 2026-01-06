import type { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { extractTriggerUserId } from '../internal/trigger-helpers';
import { firebot, logger, platformLib } from '../main';

interface SetPlatformUserMetadataEffectModel {
    platform: string;
    username: string;
    key: string;
    data: string;
    propertyPath: string;
}

export const setPlatformUserMetadataEffect: Effects.EffectType<SetPlatformUserMetadataEffectModel> = {
    definition: {
        id: 'mage-platform-lib:set-platform-user-metadata',
        name: 'Set Platform User Metadata',
        description: 'Save metadata associated to a user on Twitch, Kick, or YouTube',
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
            <p class="muted">You'll use this key to reference this elsewhere via $userMetadata replace phrase.</p>
            <input ng-model="effect.key" type="text" class="form-control" id="chat-text-setting" placeholder="Enter key name" replace-variables>
        </eos-container>

        <eos-container header="Data" pad-top="true">
            <p class="muted">This is the data that will be saved under the above key in the user's data. Can be text or another replace phrase.</p>
            <selectable-input-editors
                editors="editors"
                initial-editor-label="initialEditorLabel"
                model="effect.data"
            />
            <p class="muted" style="font-size: 11px;"><b>Note:</b> If data is a valid JSON string, it will be parsed into an object or array.</p>

            <div style="margin-top: 10px;">
                <eos-collapsable-panel show-label="Advanced" hide-label="Advanced" hide-info-box="true">
                    <h4>Property Path (Optional)</h4>
                    <p class="muted">If the metadata key already has data saved in the form of an object or array, you can define a path (using dot notation) to a specific property or index to update with the above data. If nothing is provided, the entire metadata entry is replaced. If there is no existing data and a property path is provided, nothing happens.</p>
                    <eos-collapsable-panel show-label="Show examples" hide-label="Hide examples" hide-info-box="true">
                        <span>Examples:</span>
                        <ul>
                            <li>some.property</li>
                            <li>1</li>
                            <li>1.value</li>
                        </ul>
                    </eos-collapsable-panel>
                    <input ng-model="effect.propertyPath" type="text" class="form-control" id="propertyPath" placeholder="Enter path" replace-variables>
                </eos-collapsable-panel>
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

        $scope.editors = [
            {
                label: 'Basic',
                inputType: 'text',
                useTextArea: true,
                placeholderText: 'Enter text/data'
            },
            {
                label: 'JSON',
                inputType: 'codemirror',
                placeholderText: 'Enter text/data',
                codeMirrorOptions: {
                    mode: { name: 'javascript', json: true },
                    theme: 'blackboard',
                    lineNumbers: true,
                    autoRefresh: true,
                    showGutter: true
                }
            }
        ];

        $scope.initialEditorLabel = $scope.effect?.data?.startsWith('{') || $scope.effect?.data?.startsWith('[') ? 'JSON' : 'Basic';
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
        return `Set ${effect.username}'s ${effect.key} (${platformDisplay})`;
    },
    onTriggerEvent: async (event) => {
        const { effect } = event;

        try {
            const username = typeof effect.username === 'string' ? effect.username.trim() : '';
            const key = typeof effect.key === 'string' ? effect.key.trim() : '';
            const data = typeof effect.data === 'string' ? effect.data : '';
            const propertyPath = typeof effect.propertyPath === 'string' ? effect.propertyPath.trim() : '';
            let platform = effect.platform;

            if (!username || !key) {
                logger.error('Set Platform User Metadata: Username and key are required');
                return false;
            }

            let detectedPlatform = platform;
            if (!detectedPlatform || detectedPlatform === 'auto-detect') {
                const triggerUserId = extractTriggerUserId(event.trigger);
                detectedPlatform = platformLib.userDatabase.detectPlatform(triggerUserId, username, event.trigger);
            }

            if (!detectedPlatform || detectedPlatform === 'unknown') {
                logger.error(`Set Platform User Metadata: Cannot determine platform for user ${username}`);
                return false;
            }

            platform = detectedPlatform;

            if (platform === 'twitch') {
                const { viewerMetadataManager } = firebot.modules as unknown as {
                    viewerMetadataManager: {
                        updateViewerMetadata: (username: string, key: string, value: string, propertyPath?: string) => Promise<void>;
                    };
                };
                await viewerMetadataManager.updateViewerMetadata(username, key, data, propertyPath || undefined);
                logger.debug(`Set metadata for Twitch user ${username}: ${key}`);
                return true;
            }

            if (platform !== 'kick' && platform !== 'youtube') {
                logger.error(`Set Platform User Metadata: Platform ${platform} not supported`);
                return false;
            }

            // For platform DB, we need to handle property path parsing
            const user = await platformLib.userDatabase.getUserByUsername(username, platform);
            if (!user) {
                logger.error(`Set Platform User Metadata: User not found: ${username}`);
                return false;
            }

            await platformLib.userDatabase.setUserMetadata(platform, user._id, key, data, propertyPath || undefined);
            logger.debug(`Set metadata for ${platform} user ${username}: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Set Platform User Metadata: ${error}`);
            return false;
        }
    }
};
