import { RestrictionType } from '@crowbartools/firebot-custom-scripts-types/types/restrictions';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { detectPlatform } from '@thestaticmage/mage-platform-lib-client';
import { checkMatch } from '../internal/platform-helpers';

interface PlatformRestrictionModel {
    comparison: 'is' | 'isNot';
    platform: string;
}

/**
 * Platform restriction - restricts triggers based on detected platform
 */
export const platformRestriction: RestrictionType<PlatformRestrictionModel> = {
    definition: {
        id: 'mage-platform-lib:platform',
        name: 'Platform',
        description: 'Restrict based on the platform in the trigger metadata',
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
    optionsTemplate: `
        <div>
            <div class="form-group">
                <label class="control-label">Comparison</label>
                <select class="form-control" ng-model="restriction.comparison">
                    <option value="is">Is</option>
                    <option value="isNot">Is Not</option>
                </select>
            </div>
            <div class="form-group">
                <label class="control-label">Platform</label>
                <select class="form-control" ng-model="restriction.platform">
                    <option value="any">Any Platform</option>
                    <option value="kick">Kick</option>
                    <option value="twitch">Twitch</option>
                    <option value="youtube">YouTube</option>
                    <option value="unknown">Unknown</option>
                </select>
            </div>
        </div>
    `,
    optionsController: ($scope) => {
        const restriction = $scope.restriction as unknown as PlatformRestrictionModel;
        if (restriction.comparison == null) {
            restriction.comparison = 'is';
        }
        if (restriction.platform == null) {
            restriction.platform = 'any';
        }
    },
    optionsValueDisplay: (restriction) => {
        const comparison = restriction.comparison === 'is' ? 'is' : 'is not';
        let platformDisplay: string;

        if (restriction.platform === 'any') {
            platformDisplay = 'Kick, Twitch, or YouTube';
        } else if (restriction.platform === 'kick') {
            platformDisplay = 'Kick';
        } else if (restriction.platform === 'twitch') {
            platformDisplay = 'Twitch';
        } else if (restriction.platform === 'youtube') {
            platformDisplay = 'YouTube';
        } else if (restriction.platform === 'unknown') {
            platformDisplay = 'Unknown';
        } else {
            platformDisplay = restriction.platform;
        }

        return `Platform ${comparison} ${platformDisplay}`;
    },
    predicate(triggerData: Trigger, restrictionData: PlatformRestrictionModel): boolean {
        const detectedPlatform = detectPlatform(triggerData);
        const targetPlatform = restrictionData.platform;

        const matches = checkMatch(detectedPlatform, targetPlatform, { allowUnknownMatch: true });

        if (restrictionData.comparison === 'is') {
            return matches;
        } else if (restrictionData.comparison === 'isNot') {
            return !matches;
        }

        return false;
    }
};
