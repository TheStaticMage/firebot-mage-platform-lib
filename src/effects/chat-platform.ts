import { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { IntegrationDetector } from '../integration-detector';
import { PlatformDispatcher } from '../platform-dispatcher';
import { detectPlatform } from '../platform-detector';
import { LogWrapper } from '../main';

/**
 * Effect model for platform-aware chat effect
 */
export interface ChatPlatformEffectModel {
    // Twitch settings
    twitchMessage: string;
    twitchSend: 'never' | 'onTrigger' | 'always';
    twitchReply: boolean;

    // Kick settings (if detected)
    kickMessage: string;
    kickSend: 'never' | 'onTrigger' | 'always';
    kickReply: boolean;

    // YouTube settings (if detected)
    youtubeMessage: string;
    youtubeSend: 'never' | 'onTrigger' | 'always';
    youtubeReply: boolean;

    // Unknown platform handling
    unknownSend: 'twitch' | 'none';
}


/**
 * Creates a platform-aware chat effect
 * @param integrationDetector Integration detector instance
 * @param platformDispatcher Platform dispatcher instance
 * @param frontendCommunicator Frontend communicator for IPC
 * @param logger Logger instance
 * @returns The platform-aware chat effect
 */
export function createChatPlatformEffect(
    integrationDetector: IntegrationDetector,
    platformDispatcher: PlatformDispatcher,
    frontendCommunicator: ScriptModules['frontendCommunicator'],
    logger: LogWrapper
): Effects.EffectType<ChatPlatformEffectModel> {
    return {
        definition: {
            id: 'mage-platform-lib:chat-platform',
            name: 'Chat (Platform-Aware)',
            description: 'Send a chat message to one or more platforms based on trigger source',
            icon: 'fad fa-comment-alt-lines',
            categories: ['chat based', 'common'],
            dependencies: ['chat'],
            triggers: {
                command: true,
                custom_script: true, // eslint-disable-line camelcase
                event: true,
                manual: true,
                preset: true,
                startup_script: true, // eslint-disable-line camelcase
                api: true,
                quick_action: true, // eslint-disable-line camelcase
                hotkey: true,
                timer: true,
                counter: true,
                channel_reward: true // eslint-disable-line camelcase
            }
        },
        optionsTemplate: generateDynamicTemplate(integrationDetector),
        optionsController($scope, backendCommunicator) {
            // Query available platforms from backend
            (backendCommunicator as any).fireEventAsync('platform-lib:get-available-platforms')
                .then((response: any) => {
                    if (response && response.platforms) {
                        logger.debug(`Available platforms: ${response.platforms.join(', ')}`);

                        // Initialize defaults if not set
                        if ($scope.effect.twitchSend == null) {
                            $scope.effect.twitchSend = 'onTrigger';
                        }
                        if ($scope.effect.twitchReply == null) {
                            $scope.effect.twitchReply = false;
                        }

                        if (response.platforms.includes('kick')) {
                            if ($scope.effect.kickSend == null) {
                                $scope.effect.kickSend = 'onTrigger';
                            }
                            if ($scope.effect.kickReply == null) {
                                $scope.effect.kickReply = false;
                            }
                        }

                        if (response.platforms.includes('youtube')) {
                            if ($scope.effect.youtubeSend == null) {
                                $scope.effect.youtubeSend = 'onTrigger';
                            }
                            if ($scope.effect.youtubeReply == null) {
                                $scope.effect.youtubeReply = false;
                            }
                        }

                        if ($scope.effect.unknownSend == null) {
                            $scope.effect.unknownSend = 'twitch';
                        }
                    }
                })
                .catch((error: unknown) => {
                    logger.error(`Failed to query available platforms: ${error}`);
                });
        },
        optionsValidator(effect) {
            const errors: string[] = [];

            // Validate Twitch message if sending
            if (effect.twitchSend !== 'never' && (!effect.twitchMessage || effect.twitchMessage.trim() === '')) {
                errors.push('Twitch message cannot be blank when sending is enabled');
            }

            // Validate Kick message if sending
            if (effect.kickSend !== 'never' && (!effect.kickMessage || effect.kickMessage.trim() === '')) {
                errors.push('Kick message cannot be blank when sending is enabled');
            }

            // Validate YouTube message if sending
            if (effect.youtubeSend !== 'never' && (!effect.youtubeMessage || effect.youtubeMessage.trim() === '')) {
                errors.push('YouTube message cannot be blank when sending is enabled');
            }

            return errors;
        },
        async onTriggerEvent({ effect, trigger }) {
            const detectedPlatform = detectPlatform(trigger);
            logger.debug(`Detected platform: ${detectedPlatform}`);

            // Determine which platforms to send to
            const targetPlatforms = determinePlatformTargets(detectedPlatform, effect, integrationDetector);
            logger.debug(`Target platforms: ${targetPlatforms.join(', ')}`);

            // Send to each target platform
            for (const platform of targetPlatforms) {
                try {
                    const message = getMessageForPlatform(platform, effect);
                    const replyId = getReplyIdForPlatform(platform, trigger, effect);

                    logger.debug(`Sending message to ${platform}: ${message.substring(0, 50)}...`);

                    await platformDispatcher.dispatch(
                        platform,
                        'send-chat-message',
                        { message, replyId }
                    );

                    logger.debug(`Message sent successfully to ${platform}`);
                } catch (error) {
                    logger.error(`Failed to send message to ${platform}: ${error}`);
                    // Continue to next platform
                }
            }

            return true;
        }
    };
}

/**
 * Generates a dynamic template based on detected integrations
 * @param integrationDetector Integration detector instance
 * @returns HTML template string
 */
export function generateDynamicTemplate(integrationDetector: IntegrationDetector): string {
    const hasKick = integrationDetector.isIntegrationDetected('kick');
    const hasYouTube = integrationDetector.isIntegrationDetected('youtube');

    let template = '<div>';

    // Twitch section (always present)
    template += `
        <div class="effect-setting-container">
            <div class="effect-specific-title"><h4>Twitch</h4></div>
            <div class="input-group">
                <span class="input-group-addon">Message</span>
                <textarea ng-model="effect.twitchMessage" class="form-control" rows="4" placeholder="Enter message for Twitch" replace-variables></textarea>
            </div>
            <div class="input-group" style="margin-top: 10px;">
                <span class="input-group-addon">Send</span>
                <select class="form-control" ng-model="effect.twitchSend">
                    <option value="never">Never</option>
                    <option value="onTrigger">When triggered from Twitch</option>
                    <option value="always">Always</option>
                </select>
            </div>
            <div style="margin-top: 10px;">
                <label class="control-fb control--checkbox">
                    Send as reply (when available)
                    <input type="checkbox" ng-model="effect.twitchReply">
                    <div class="control__indicator"></div>
                </label>
            </div>
        </div>
    `;

    // Kick section (conditional)
    if (hasKick) {
        template += `
            <div class="effect-setting-container">
                <div class="effect-specific-title"><h4>Kick</h4></div>
                <div class="input-group">
                    <span class="input-group-addon">Message</span>
                    <textarea ng-model="effect.kickMessage" class="form-control" rows="4" placeholder="Enter message for Kick" replace-variables></textarea>
                </div>
                <div class="input-group" style="margin-top: 10px;">
                    <span class="input-group-addon">Send</span>
                    <select class="form-control" ng-model="effect.kickSend">
                        <option value="never">Never</option>
                        <option value="onTrigger">When triggered from Kick</option>
                        <option value="always">Always</option>
                    </select>
                </div>
                <div style="margin-top: 10px;">
                    <label class="control-fb control--checkbox">
                        Send as reply (when available)
                        <input type="checkbox" ng-model="effect.kickReply">
                        <div class="control__indicator"></div>
                    </label>
                </div>
            </div>
        `;
    }

    // YouTube section (conditional)
    if (hasYouTube) {
        template += `
            <div class="effect-setting-container">
                <div class="effect-specific-title"><h4>YouTube</h4></div>
                <div class="input-group">
                    <span class="input-group-addon">Message</span>
                    <textarea ng-model="effect.youtubeMessage" class="form-control" rows="4" placeholder="Enter message for YouTube" replace-variables></textarea>
                </div>
                <div class="input-group" style="margin-top: 10px;">
                    <span class="input-group-addon">Send</span>
                    <select class="form-control" ng-model="effect.youtubeSend">
                        <option value="never">Never</option>
                        <option value="onTrigger">When triggered from YouTube</option>
                        <option value="always">Always</option>
                    </select>
                </div>
                <div style="margin-top: 10px;">
                    <label class="control-fb control--checkbox">
                        Send as reply (when available)
                        <input type="checkbox" ng-model="effect.youtubeReply">
                        <div class="control__indicator"></div>
                    </label>
                </div>
            </div>
        `;
    }

    // Unknown trigger handling
    template += `
        <div class="effect-setting-container">
            <div class="effect-specific-title"><h4>Unknown Platform Handling</h4></div>
            <div class="input-group">
                <span class="input-group-addon">When platform is unknown</span>
                <select class="form-control" ng-model="effect.unknownSend">
                    <option value="twitch">Send to Twitch</option>
                    <option value="none">Don't send</option>
                </select>
            </div>
        </div>
    `;

    template += '</div>';
    return template;
}

/**
 * Determines which platforms to send messages to based on trigger and settings
 * @param platform Detected platform from trigger
 * @param effect Effect settings
 * @param integrationDetector Integration detector instance
 * @returns Array of platform identifiers to send to
 */
export function determinePlatformTargets(
    platform: string,
    effect: ChatPlatformEffectModel,
    integrationDetector: IntegrationDetector
): string[] {
    const targets: string[] = [];

    // Twitch
    if (effect.twitchSend === 'always') {
        targets.push('twitch');
    } else if (effect.twitchSend === 'onTrigger' && platform === 'twitch') {
        targets.push('twitch');
    }

    // Kick (only if integration is detected)
    if (integrationDetector.isIntegrationDetected('kick')) {
        if (effect.kickSend === 'always') {
            targets.push('kick');
        } else if (effect.kickSend === 'onTrigger' && platform === 'kick') {
            targets.push('kick');
        }
    }

    // YouTube (only if integration is detected)
    if (integrationDetector.isIntegrationDetected('youtube')) {
        if (effect.youtubeSend === 'always') {
            targets.push('youtube');
        } else if (effect.youtubeSend === 'onTrigger' && platform === 'youtube') {
            targets.push('youtube');
        }
    }

    // Handle unknown platform
    if (platform === 'unknown' && effect.unknownSend === 'twitch') {
        if (!targets.includes('twitch')) {
            targets.push('twitch');
        }
    }

    return targets;
}

/**
 * Gets the message content for a specific platform
 * @param platform Platform identifier
 * @param effect Effect settings
 * @returns Message string for the platform
 */
export function getMessageForPlatform(platform: string, effect: ChatPlatformEffectModel): string {
    if (platform === 'kick') {
        return effect.kickMessage || '';
    }
    if (platform === 'youtube') {
        return effect.youtubeMessage || '';
    }
    return effect.twitchMessage || '';
}

/**
 * Gets the reply ID for a specific platform from trigger metadata
 * @param platform Platform identifier
 * @param trigger Trigger data
 * @param effect Effect settings
 * @returns Reply ID if reply is enabled and available, undefined otherwise
 */
export function getReplyIdForPlatform(
    platform: string,
    trigger: Trigger,
    effect: ChatPlatformEffectModel
): string | undefined {
    // Check if reply is enabled for this platform
    let replyEnabled = false;
    if (platform === 'kick') {
        replyEnabled = effect.kickReply === true;
    } else if (platform === 'youtube') {
        replyEnabled = effect.youtubeReply === true;
    } else {
        replyEnabled = effect.twitchReply === true;
    }

    if (!replyEnabled) {
        return undefined;
    }

    // Try to extract reply ID from trigger metadata
    const metadata = trigger.metadata as Record<string, unknown>;
    if (!metadata) {
        return undefined;
    }

    // Check chatMessage for messageId or id
    const chatMessage = metadata.chatMessage as Record<string, unknown>;
    if (chatMessage) {
        if (typeof chatMessage.messageId === 'string') {
            return chatMessage.messageId;
        }
        if (typeof chatMessage.id === 'string') {
            return chatMessage.id;
        }
    }

    // Check eventData for messageId or id
    const eventData = metadata.eventData as Record<string, unknown>;
    if (eventData) {
        if (typeof eventData.messageId === 'string') {
            return eventData.messageId;
        }
        if (typeof eventData.id === 'string') {
            return eventData.id;
        }
    }

    return undefined;
}
