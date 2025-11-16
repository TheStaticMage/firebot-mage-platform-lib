import { ConditionSettings } from '@crowbartools/firebot-custom-scripts-types/types/modules/condition-manager';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { platformCondition } from '../platform';

type PlatformComparison = 'is' | 'isNot';

describe('platformCondition', () => {
    describe('getRightSidePresetValues', () => {
        it('should return preset platform values', () => {
            expect(platformCondition.getRightSidePresetValues).toBeDefined();

            const presets = platformCondition.getRightSidePresetValues ? platformCondition.getRightSidePresetValues() : [];

            expect(presets).toEqual([
                { value: 'kick', display: 'Kick' },
                { value: 'twitch', display: 'Twitch' },
                { value: 'youtube', display: 'YouTube' },
                { value: 'any', display: 'Any Platform' }
            ]);
        });
    });

    describe('predicate', () => {
        it('should return true when platform "is" Kick', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" Twitch but detected is Kick', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'twitch'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });

        it('should return true when platform "is" Twitch', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'twitch'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" YouTube', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'youtube'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@youtube',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is Kick', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is Twitch', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is YouTube', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@youtube',
                    platform: 'youtube'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" any but detected is unknown', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: undefined,
                    eventSource: undefined,
                    eventData: undefined,
                    chatMessage: undefined
                }
            } as unknown as Trigger;

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });

        it('should return true when platform "isNot" Kick and detected is Twitch', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'isNot',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return false when platform "isNot" Kick and detected is Kick', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'isNot',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });

        it('should return true when platform "isNot" any and detected is unknown', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'isNot',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: undefined,
                    eventSource: undefined,
                    eventData: undefined,
                    chatMessage: undefined
                }
            } as unknown as Trigger;

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return false when platform "isNot" any and detected is Kick', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'isNot',
                leftSideValue: undefined,
                rightSideValue: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });

        it('should detect platform from userId patterns', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'youtube'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        userId: 'y1234567890123456789012'
                    }
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should detect platform from eventSource', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventSource: {
                        id: 'kick',
                        name: 'Kick'
                    }
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(true);
        });

        it('should return false for unknown comparison type', () => {
            const condition = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'contains',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            } as unknown as ConditionSettings<PlatformComparison, 'none', 'preset'>;

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });

        it('should return false when detected platform is unknown', () => {
            const condition: ConditionSettings<PlatformComparison, 'none', 'preset'> = {
                type: 'mage-platform-lib:platform',
                comparisonType: 'is',
                leftSideValue: undefined,
                rightSideValue: 'kick'
            };

            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            const result = platformCondition.predicate(condition, trigger);

            expect(result).toBe(false);
        });
    });
});
