import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { platformRestriction } from '../platform';

interface PlatformRestrictionModel {
    comparison: 'is' | 'isNot';
    platform: string;
}

describe('platformRestriction', () => {
    describe('optionsValueDisplay', () => {
        it('should display "is" comparison with specific platform', () => {
            const restriction: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'kick'
            };

            expect(platformRestriction.optionsValueDisplay).toBeDefined();
            const display = platformRestriction.optionsValueDisplay
                ? platformRestriction.optionsValueDisplay(restriction)
                : '';

            expect(display).toBe('Platform is Kick');
        });

        it('should display "is not" comparison with specific platform', () => {
            const restriction: PlatformRestrictionModel = {
                comparison: 'isNot',
                platform: 'twitch'
            };

            const display = platformRestriction.optionsValueDisplay
                ? platformRestriction.optionsValueDisplay(restriction)
                : '';

            expect(display).toBe('Platform is not Twitch');
        });

        it('should display "any" platform', () => {
            const restriction: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'any'
            };

            const display = platformRestriction.optionsValueDisplay
                ? platformRestriction.optionsValueDisplay(restriction)
                : '';

            expect(display).toBe('Platform is Kick, Twitch, or YouTube');
        });

        it('should display YouTube platform', () => {
            const restriction: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'youtube'
            };

            const display = platformRestriction.optionsValueDisplay
                ? platformRestriction.optionsValueDisplay(restriction)
                : '';

            expect(display).toBe('Platform is YouTube');
        });

        it('should display Unknown platform', () => {
            const restriction: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'unknown'
            };

            const display = platformRestriction.optionsValueDisplay
                ? platformRestriction.optionsValueDisplay(restriction)
                : '';

            expect(display).toBe('Platform is Unknown');
        });
    });

    describe('predicate', () => {
        it('should return true when platform "is" Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" Twitch but detected is Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'twitch'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });

        it('should return true when platform "is" Twitch', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'twitch'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" YouTube', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'youtube'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is Twitch', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" any and detected is YouTube', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@youtube',
                    platform: 'youtube'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" any but detected is unknown', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'any'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });

        it('should return true when platform "is" unknown and detected is unknown', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'unknown'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" unknown but detected is Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'unknown'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });

        it('should return true when platform "isNot" Kick and detected is Twitch', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'isNot',
                platform: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false when platform "isNot" Kick and detected is Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'isNot',
                platform: 'kick'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });

        it('should return true when platform "isNot" any and detected is unknown', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'isNot',
                platform: 'any'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false when platform "isNot" any and detected is Kick', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'isNot',
                platform: 'any'
            };

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });

        it('should detect platform from userId patterns', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'youtube'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should detect platform from eventSource', () => {
            const restrictionData: PlatformRestrictionModel = {
                comparison: 'is',
                platform: 'kick'
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

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(true);
        });

        it('should return false for unknown comparison type', () => {
            const restrictionData = {
                comparison: 'contains',
                platform: 'kick'
            } as unknown as PlatformRestrictionModel;

            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformRestriction.predicate(trigger, restrictionData);

            expect(result).toBe(false);
        });
    });
});
