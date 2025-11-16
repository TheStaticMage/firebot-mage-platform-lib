import { ConditionType, ConditionSettings } from '@crowbartools/firebot-custom-scripts-types/types/modules/condition-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';

type PlatformComparison = 'is' | 'isNot';

/**
 * Platform condition - checks if the detected platform matches a value
 */
export const platformCondition: ConditionType<PlatformComparison, 'none', 'preset'> = {
    id: 'mage-platform-lib:platform',
    name: 'Platform',
    description: 'Check the platform in the trigger metadata',
    comparisonTypes: ['is', 'isNot'],
    leftSideValueType: 'none',
    rightSideValueType: 'preset',
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
    },
    getRightSidePresetValues() {
        return [
            { value: 'kick', display: 'Kick' },
            { value: 'twitch', display: 'Twitch' },
            { value: 'youtube', display: 'YouTube' },
            { value: 'any', display: 'Any Platform' }
        ];
    },
    predicate(
        conditionSettings: ConditionSettings<PlatformComparison, 'none', 'preset'>,
        trigger: Trigger
    ): boolean {
        const detectedPlatform = detectPlatform(trigger);
        const targetPlatform = conditionSettings.rightSideValue;

        const matches = checkMatch(detectedPlatform, targetPlatform);

        if (conditionSettings.comparisonType === 'is') {
            return matches;
        } else if (conditionSettings.comparisonType === 'isNot') {
            return !matches;
        }

        return false;
    }
};

/**
 * Checks if the detected platform matches the target platform
 * @param detectedPlatform The platform detected from the trigger
 * @param targetPlatform The platform to compare against
 * @returns True if the platforms match
 */
function checkMatch(detectedPlatform: string, targetPlatform: string): boolean {
    // "unknown" never matches
    if (detectedPlatform === 'unknown') {
        return false;
    }

    // "any" matches any known platform (kick, twitch, youtube)
    if (targetPlatform === 'any') {
        return detectedPlatform === 'kick' || detectedPlatform === 'twitch' || detectedPlatform === 'youtube';
    }

    // Direct comparison
    return detectedPlatform === targetPlatform;
}
