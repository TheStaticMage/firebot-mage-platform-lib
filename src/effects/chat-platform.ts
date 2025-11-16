import { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';
import { logger, platformLib } from '../main';

/**
 * Effect model for platform-aware chat effect
 */
export interface ChatPlatformEffectModel {
    // Twitch settings
    twitchMessage: string;
    twitchSend: 'never' | 'onTrigger' | 'always';
    twitchReply: boolean;
    twitchChatter: 'Streamer' | 'Bot';

    // Kick settings (if detected)
    kickMessage: string;
    kickSend: 'never' | 'onTrigger' | 'always';
    kickReply: boolean;
    kickChatter: 'Streamer' | 'Bot';

    // YouTube settings (if detected)
    youtubeMessage: string;
    youtubeSend: 'never' | 'onTrigger' | 'always';
    youtubeReply: boolean;
    youtubeChatter: 'Streamer' | 'Bot';

    // Unknown platform handling
    unknownSendTwitch: boolean;
    unknownSendKick: boolean;
    unknownSendYouTube: boolean;
}

export const chatPlatformEffect: Effects.EffectType<ChatPlatformEffectModel> = {
    definition: {
        id: 'mage-platform-lib:chat-platform',
        name: 'Chat (Multi-Platform)',
        description: 'Send a chat message to one or more platforms based on trigger source. Currently supports Twitch, Kick, and YouTube.',
        icon: 'fad fa-comment-alt-lines',
        categories: ['chat based', 'common'],
        dependencies: ['chat']
    },
    optionsTemplate: `
        <eos-container header="Twitch Chat Settings" pad-top="true">
            <eos-container header="Message" pad-top="true">
                <firebot-input
                    model="effect.twitchMessage"
                    use-text-area="true"
                    placeholder-text="Enter message for Twitch"
                    rows="4"
                    cols="40"
                    menu-position="under"
                />
            </eos-container>

            <eos-container header="Send to Twitch" pad-top="true">
                <dropdown-select options="{never: 'Never', onTrigger: 'When triggered from Twitch', always: 'Always'}" selected="effect.twitchSend"></dropdown-select>
            </eos-container>

            <eos-container header="Chat As" pad-top="true">
                <dropdown-select options="['Streamer', 'Bot']" selected="effect.twitchChatter"></dropdown-select>
            </eos-container>

            <eos-container header="Options" pad-top="true">
                <firebot-checkbox
                    label="Send as reply"
                    tooltip="Replying only works within a Command or Chat Message event."
                    model="effect.twitchReply"
                    style="margin: 0px 15px 0px 0px"
                />
            </eos-container>
        </eos-container>

        <eos-container header="Kick Chat Settings" pad-top="true" ng-if="!hasKick">
            <p>Kick integration not detected. Please install and configure the Kick Integration script to enable Kick chat messaging.</p>
            <p><a href="https://github.com/TheStaticMage/firebot-mage-kick-integration" target="_blank">https://github.com/TheStaticMage/firebot-mage-kick-integration</a></p>
        </eos-container>

        <eos-container header="Kick Chat Settings" pad-top="true" ng-if="hasKick">
            <eos-container header="Message" pad-top="true">
                <firebot-input
                    model="effect.kickMessage"
                    use-text-area="true"
                    placeholder-text="Enter message for Kick"
                    rows="4"
                    cols="40"
                    menu-position="under"
                />
            </eos-container>

            <eos-container header="Send to Kick" pad-top="true">
                <dropdown-select options="{never: 'Never', onTrigger: 'When triggered from Kick', always: 'Always'}" selected="effect.kickSend"></dropdown-select>
            </eos-container>

            <eos-container header="Chat As" pad-top="true">
                <dropdown-select options="['Streamer', 'Bot']" selected="effect.kickChatter"></dropdown-select>
            </eos-container>

            <eos-container header="Options" pad-top="true">
                <firebot-checkbox
                    label="Send as reply"
                    tooltip="Replying only works within a Command or Chat Message event."
                    model="effect.kickReply"
                    style="margin: 0px 15px 0px 0px"
                />
            </eos-container>
        </eos-container>

        <eos-container header="YouTube Chat Settings" pad-top="true" ng-if="!hasYouTube">
            <p>YouTube integration not detected. Please install and configure the YouTube Integration script to enable YouTube chat messaging.</p>
            <p><a href="https://github.com/TheStaticMage/firebot-mage-youtube-integration" target="_blank">https://github.com/TheStaticMage/firebot-mage-youtube-integration</a></p>
        </eos-container>

        <eos-container header="YouTube Chat Settings" pad-top="true" ng-if="hasYouTube">
            <eos-container header="Message" pad-top="true">
                <firebot-input
                    model="effect.youtubeMessage"
                    use-text-area="true"
                    placeholder-text="Enter message for YouTube"
                    rows="4"
                    cols="40"
                    menu-position="under"
                />
            </eos-container>

            <eos-container header="Send to YouTube" pad-top="true">
                <dropdown-select options="{never: 'Never', onTrigger: 'When triggered from YouTube', always: 'Always'}" selected="effect.youtubeSend"></dropdown-select>
            </eos-container>

            <eos-container header="Chat As" pad-top="true">
                <dropdown-select options="['Streamer', 'Bot']" selected="effect.youtubeChatter"></dropdown-select>
            </eos-container>

            <eos-container header="Options" pad-top="true">
                <firebot-checkbox
                    label="Send as reply"
                    tooltip="Replying only works within a Command or Chat Message event."
                    model="effect.youtubeReply"
                    style="margin: 0px 15px 0px 0px"
                />
            </eos-container>
        </eos-container>

        <eos-container header="Unknown Platform Handling" pad-top="true">
            <firebot-checkbox
                    label="Send to Twitch"
                    tooltip="Send to Twitch if platform is unknown."
                    model="effect.unknownSendTwitch"
                    style="margin: 0px 15px 0px 0px"
                />
            <firebot-checkbox
                    label="Send to Kick"
                    tooltip="Send to Kick if platform is unknown."
                    model="effect.unknownSendKick"
                    style="margin: 0px 15px 0px 0px"
                    ng-if="hasKick"
                />
            <firebot-checkbox
                    label="Send to YouTube"
                    tooltip="Send to YouTube if platform is unknown."
                    model="effect.unknownSendYouTube"
                    style="margin: 0px 15px 0px 0px"
                    ng-if="hasYouTube"
                />
        </eos-container>
    `,
    optionsController: ($scope, backendCommunicator: any, logger: any) => {
        // Initialize platform availability flags
        $scope.hasKick = false;
        $scope.hasYouTube = false;

        // Query available platforms from backend
        const response = backendCommunicator.fireEventSync('platform-lib:get-available-platforms');
        if (response && response.platforms) {
            logger.debug(`Available platforms: ${response.platforms.join(', ')}`);

            // Set platform availability flags
            $scope.hasKick = response.platforms.includes('kick');
            $scope.hasYouTube = response.platforms.includes('youtube');

            // Initialize Twitch defaults if not set
            if ($scope.effect.twitchSend == null) {
                $scope.effect.twitchSend = 'onTrigger';
            }
            if ($scope.effect.twitchReply == null) {
                $scope.effect.twitchReply = false;
            }
            if ($scope.effect.twitchChatter == null) {
                $scope.effect.twitchChatter = 'Streamer';
            }

            if ($scope.hasKick) {
                if ($scope.effect.kickSend == null) {
                    $scope.effect.kickSend = 'onTrigger';
                }
                if ($scope.effect.kickReply == null) {
                    $scope.effect.kickReply = false;
                }
                if ($scope.effect.kickChatter == null) {
                    $scope.effect.kickChatter = 'Streamer';
                }
            } else {
                $scope.effect.kickSend = 'never';
            }

            if ($scope.hasYouTube) {
                if ($scope.effect.youtubeSend == null) {
                    $scope.effect.youtubeSend = 'onTrigger';
                }
                if ($scope.effect.youtubeReply == null) {
                    $scope.effect.youtubeReply = false;
                }
                if ($scope.effect.youtubeChatter == null) {
                    $scope.effect.youtubeChatter = 'Streamer';
                }
            } else {
                $scope.effect.youtubeSend = 'never';
            }
        } else {
            logger.error('Invalid response from platform-lib:get-available-platforms');
        }
    },
    optionsValidator: (effect) => {
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
    onTriggerEvent: async ({ effect, trigger }) => {
        const detectedPlatform = detectPlatform(trigger);
        logger.debug(`Detected platform: ${detectedPlatform}`);

        // Determine which platforms to send to
        const targetPlatforms = determinePlatformTargets(detectedPlatform, effect);
        logger.debug(`Target platforms: ${targetPlatforms.join(', ')}`);

        // Send to each target platform
        for (const platform of targetPlatforms) {
            try {
                const message = getMessageForPlatform(platform, effect);
                const replyId = getReplyIdForPlatform(platform, trigger, effect);
                const chatter = getChatterForPlatform(platform, effect);

                logger.debug(`Sending message to ${platform}: ${message.substring(0, 50)}...`);

                await platformLib.platformDispatcher.dispatchOperation(
                    'send-chat-message',
                    platform,
                    { message, chatter, replyId }
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

/**
 * Determines which platforms to send messages to based on trigger and settings
 * @param platform Detected platform from trigger
 * @param effect Effect settings
 * @returns Array of platform identifiers to send to
 */
export function determinePlatformTargets(
    platform: string,
    effect: ChatPlatformEffectModel
): string[] {
    const targets: string[] = [];

    // Twitch
    if (effect.twitchSend === 'always') {
        targets.push('twitch');
    } else if (effect.twitchSend === 'onTrigger' && platform === 'twitch') {
        targets.push('twitch');
    }

    // Kick (only if integration is detected)
    if (platformLib.integrationDetector.isIntegrationDetected('kick')) {
        if (effect.kickSend === 'always') {
            targets.push('kick');
        } else if (effect.kickSend === 'onTrigger' && platform === 'kick') {
            targets.push('kick');
        }
    }

    // YouTube (only if integration is detected)
    if (platformLib.integrationDetector.isIntegrationDetected('youtube')) {
        if (effect.youtubeSend === 'always') {
            targets.push('youtube');
        } else if (effect.youtubeSend === 'onTrigger' && platform === 'youtube') {
            targets.push('youtube');
        }
    }

    // Handle unknown platform
    if (platform === 'unknown') {
        if (!targets.includes('twitch') && effect.unknownSendTwitch) {
            targets.push('twitch');
        }
        if (platformLib.integrationDetector.isIntegrationDetected('kick')) {
            if (!targets.includes('kick') && effect.unknownSendKick) {
                targets.push('kick');
            }
        }
        if (platformLib.integrationDetector.isIntegrationDetected('youtube')) {
            if (!targets.includes('youtube') && effect.unknownSendYouTube) {
                targets.push('youtube');
            }
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

/**
 * Gets the chatter for a specific platform
 * @param platform Platform identifier
 * @param effect Effect settings
 * @returns Chatter ("Streamer" or "Bot")
 */
export function getChatterForPlatform(platform: string, effect: ChatPlatformEffectModel): 'Streamer' | 'Bot' {
    if (platform === 'kick') {
        return effect.kickChatter || 'Streamer';
    }
    if (platform === 'youtube') {
        return effect.youtubeChatter || 'Streamer';
    }
    return effect.twitchChatter || 'Streamer';
}
