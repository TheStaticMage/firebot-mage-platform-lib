import { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';
import { firebot, logger, platformLib } from '../main';

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
    youtubeChatter: 'Streamer';

    // Platform enable/disable flags
    twitchEnabled: boolean;
    kickEnabled: boolean;
    youtubeEnabled: boolean;

    // Unknown platform handling
    unknownPlatformTarget?: 'none' | 'twitch' | 'kick' | 'youtube';

    // Global send controls
    globalSendMode?: 'always' | 'when-connected' | 'when-live';
    sendToChatFeed?: boolean;
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
        <eos-container header="Platforms" pad-top="true">
            <div style="display: flex; flex-direction: row; width: 100%; margin: 10px 0;">
                <firebot-checkbox
                    label="Twitch"
                    model="effect.twitchEnabled"
                    style="margin: 0px 15px 0px 0px"
                />
                <firebot-checkbox
                    label="Kick"
                    model="effect.kickEnabled"
                    style="margin: 0px 15px 0px 0px"
                    ng-if="hasKick"
                />
                <firebot-checkbox
                    label="YouTube"
                    model="effect.youtubeEnabled"
                    style="margin: 0px 15px 0px 0px"
                    ng-if="hasYouTube"
                />
            </div>
        </eos-container>

        <eos-container header="Twitch Chat Settings" pad-top="true" ng-if="effect.twitchEnabled">
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

        <eos-container header="Kick Chat Settings" pad-top="true" ng-if="hasKick && effect.kickEnabled">
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

        <eos-container header="YouTube Chat Settings" pad-top="true" ng-if="hasYouTube && effect.youtubeEnabled">
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
                <dropdown-select options="['Streamer']" selected="effect.youtubeChatter"></dropdown-select>
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

        <eos-container header="Options" pad-top="true">
            <eos-container header="Overrides and Conditions" pad-top="true">
                <p class="muted">Restrict when messages are sent:</p>
                <dropdown-select
                    options="{
                        always: 'Send regardless of connection or stream status',
                        'when-connected': 'Only when integration is connected',
                        'when-live': 'Only when stream is live'
                    }"
                    selected="effect.globalSendMode">
                </dropdown-select>

                <p class="muted" style="margin-top: 10px;">If a message cannot be sent due to the above restrictions, optionally send it to the chat feed instead:</p>

                <firebot-checkbox
                    label="Send to chat feed when not sent to platform"
                    model="effect.sendToChatFeed"
                    style="margin: 0px 15px 0px 0px"
                />
            </eos-container>

            <eos-container header="Unknown Platform" pad-top="true">
                <p class="muted">When a trigger is received from an unknown platform, treat the message as if it came from this platform:</p>
                <dropdown-select
                    options="unknownPlatformOptions"
                    selected="effect.unknownPlatformTarget"
                    placeholder="Select platform for unknown triggers">
                </dropdown-select>
            </eos-container>
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

            if ($scope.hasKick && $scope.effect.kickEnabled) {
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

            if ($scope.hasYouTube && $scope.effect.youtubeEnabled) {
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

        // Initialize Twitch defaults if not set
        if ($scope.effect.twitchEnabled == null) {
            $scope.effect.twitchEnabled = true; // Twitch always defaults to enabled
        }

        if ($scope.effect.twitchSend == null) {
            $scope.effect.twitchSend = 'onTrigger';
        }
        if ($scope.effect.twitchReply == null) {
            $scope.effect.twitchReply = false;
        }
        if ($scope.effect.twitchChatter == null) {
            $scope.effect.twitchChatter = 'Streamer';
        }

        // Initialize other defaults
        if ($scope.effect.globalSendMode == null) {
            $scope.effect.globalSendMode = 'always';
        }

        if ($scope.effect.sendToChatFeed == null) {
            $scope.effect.sendToChatFeed = false;
        }

        // Build unknown platform dropdown options
        const unknownOptions: Record<string, string> = { none: 'None' };
        if ($scope.effect.twitchEnabled) {
            unknownOptions.twitch = 'Twitch';
        }
        if ($scope.hasKick && $scope.effect.kickEnabled) {
            unknownOptions.kick = 'Kick';
        }
        if ($scope.hasYouTube && $scope.effect.youtubeEnabled) {
            unknownOptions.youtube = 'YouTube';
        }
        $scope.unknownPlatformOptions = unknownOptions;

        if (!$scope.effect.unknownPlatformTarget) {
            $scope.effect.unknownPlatformTarget = 'none';
        }
    },
    optionsValidator: (effect) => {
        const errors: string[] = [];

        // Ensure at least one platform is enabled
        if (!effect.twitchEnabled && !effect.kickEnabled && !effect.youtubeEnabled) {
            errors.push('At least one platform must be enabled');
        }

        // Validate Twitch message only if enabled and sending
        if (effect.twitchEnabled && effect.twitchSend !== 'never' && (!effect.twitchMessage || effect.twitchMessage.trim() === '')) {
            errors.push('Twitch message cannot be blank when sending is enabled');
        }

        // Validate Kick message only if enabled and sending
        if (effect.kickEnabled && effect.kickSend !== 'never' && (!effect.kickMessage || effect.kickMessage.trim() === '')) {
            errors.push('Kick message cannot be blank when sending is enabled');
        }

        // Validate YouTube message only if enabled and sending
        if (effect.youtubeEnabled && effect.youtubeSend !== 'never' && (!effect.youtubeMessage || effect.youtubeMessage.trim() === '')) {
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

                const request: any = { message, chatter, replyId };

                // For Twitch, check if we should send based on global mode
                if (platform === 'twitch') {
                    const { shouldSend, reason } = await shouldSendToTwitch(effect);

                    if (!shouldSend) {
                        logger.debug(`Skipping Twitch: ${reason}`);

                        // Send to chat feed if enabled (only for Twitch since we control it)
                        if (effect.sendToChatFeed) {
                            await sendToChatFeed(effect, reason || 'Unknown');
                        }
                        continue;
                    }
                }

                // For Kick/YouTube, pass send mode and chat feed flag to let integration decide
                if (platform !== 'twitch') {
                    if (effect.globalSendMode) {
                        request.sendMode = effect.globalSendMode;
                    }
                    if (effect.sendToChatFeed) {
                        request.sendToChatFeed = true;
                    }
                }

                await platformLib.platformDispatcher.dispatchOperation(
                    'send-chat-message',
                    platform,
                    request
                );

                logger.debug(`Message sent successfully to ${platform}`);
            } catch (error) {
                logger.error(`Failed to send message to ${platform}: ${error}`);
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

    // Twitch (only if enabled)
    if (effect.twitchEnabled) {
        if (effect.twitchSend === 'always') {
            targets.push('twitch');
        } else if (effect.twitchSend === 'onTrigger' && platform === 'twitch') {
            targets.push('twitch');
        }
    }

    // Kick (only if enabled and integration is detected)
    if (effect.kickEnabled && platformLib.integrationDetector.isIntegrationDetected('kick')) {
        if (effect.kickSend === 'always') {
            targets.push('kick');
        } else if (effect.kickSend === 'onTrigger' && platform === 'kick') {
            targets.push('kick');
        }
    }

    // YouTube (only if enabled and integration is detected)
    if (effect.youtubeEnabled && platformLib.integrationDetector.isIntegrationDetected('youtube')) {
        if (effect.youtubeSend === 'always') {
            targets.push('youtube');
        } else if (effect.youtubeSend === 'onTrigger' && platform === 'youtube') {
            targets.push('youtube');
        }
    }

    // Handle unknown platform
    if (platform === 'unknown' && effect.unknownPlatformTarget && effect.unknownPlatformTarget !== 'none') {
        const target = effect.unknownPlatformTarget;
        if (!targets.includes(target)) {
            // Verify the target platform is enabled and available
            if (target === 'twitch' && effect.twitchEnabled) {
                targets.push('twitch');
            } else if (target === 'kick' && effect.kickEnabled && platformLib.integrationDetector.isIntegrationDetected('kick')) {
                targets.push('kick');
            } else if (target === 'youtube' && effect.youtubeEnabled && platformLib.integrationDetector.isIntegrationDetected('youtube')) {
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

/**
 * Determines if a message should be sent to Twitch based on global send mode
 * @param effect Effect settings
 * @returns Object with shouldSend boolean and optional reason
 */
export async function shouldSendToTwitch(
    effect: ChatPlatformEffectModel
): Promise<{ shouldSend: boolean; reason?: string }> {
    if (!effect.globalSendMode) {
        return { shouldSend: true };
    }

    if (effect.globalSendMode === 'always') {
        return { shouldSend: true };
    }

    if (effect.globalSendMode === 'when-connected') {
        return { shouldSend: true };
    }

    if (effect.globalSendMode === 'when-live') {
        const { twitchApi } = firebot.modules;
        try {
            const stream = await twitchApi.streams.getStreamersCurrentStream();
            if (!stream) {
                return { shouldSend: false, reason: 'Stream offline' };
            }
            return { shouldSend: true };
        } catch (error) {
            logger.error(`Failed to check stream status: ${error}`);
            return { shouldSend: false, reason: 'Status check failed' };
        }
    }

    return { shouldSend: true };
}

/**
 * Sends a message to the Firebot chat feed as a fallback when Twitch message cannot be sent
 * @param effect Effect settings
 * @param failedPlatforms Array of platforms that failed to send
 */
export async function sendToChatFeed(
    effect: ChatPlatformEffectModel,
    reasonText: string
): Promise<void> {
    try {
        const { frontendCommunicator } = firebot.modules;

        frontendCommunicator.send("chatUpdate", {
            fbEvent: "ChatAlert",
            message: `[Not sent (Twitch): ${reasonText}] ${effect.twitchMessage}`,
            icon: "fad fa-exclamation-triangle"
        });

        logger.debug('Sent message to chat feed as fallback');
    } catch (error) {
        logger.error(`Failed to send to chat feed: ${error}`);
    }
}
