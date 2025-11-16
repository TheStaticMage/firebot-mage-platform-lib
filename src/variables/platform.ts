import { ReplaceVariable } from '@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';

/**
 * Platform variable - returns the detected platform for the current trigger
 *
 * Returns one of: "twitch", "kick", "youtube", "unknown"
 */
export const platformVariable: ReplaceVariable = {
    definition: {
        handle: 'platform',
        description: 'The detected streaming platform for the current event (twitch, kick, youtube, or unknown)',
        usage: 'platform',
        examples: [
            {
                usage: 'platform',
                description: 'Returns the platform name (e.g., "kick", "twitch", "youtube", or "unknown")'
            }
        ],
        categories: ['common', 'trigger based'],
        possibleDataOutput: ['text'],
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
    evaluator(trigger: Trigger): string {
        return detectPlatform(trigger);
    }
};
