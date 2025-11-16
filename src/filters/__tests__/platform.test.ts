/* eslint-disable @typescript-eslint/unbound-method */
import { FilterSettings } from '@crowbartools/firebot-custom-scripts-types/types/modules/event-filter-manager';
import { platformFilter } from '../platform';

describe('platformFilter', () => {
    describe('presetValues', () => {
        it('should return preset platform values', () => {
            expect(platformFilter.presetValues).toBeDefined();

            const presets = platformFilter.presetValues ? platformFilter.presetValues() : [];

            expect(presets).toEqual([
                { value: 'kick', display: 'Kick' },
                { value: 'twitch', display: 'Twitch' },
                { value: 'youtube', display: 'YouTube' },
                { value: 'unknown', display: 'Unknown' }
            ]);
        });
    });

    describe('predicate', () => {
        it('should return true when platform "is" Kick', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'kick'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return false when platform "is" Twitch but event is Kick', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'twitch'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(false);
        });

        it('should return true when platform "is" Twitch', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'twitch'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" YouTube', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'youtube'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@youtube',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is" unknown', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'unknown'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: undefined,
                    eventSource: undefined,
                    eventData: undefined,
                    chatMessage: undefined
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return true when platform "is not" Kick but is Twitch', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is not',
                value: 'kick'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser',
                    platform: 'twitch'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return false when platform "is not" Kick and is Kick', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is not',
                value: 'kick'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(false);
        });

        it('should detect platform from userId patterns', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'youtube'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser',
                    eventData: {
                        userId: 'y1234567890123456789012'
                    }
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should detect platform from eventSource', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is',
                value: 'kick'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser',
                    eventSource: {
                        id: 'kick',
                        name: 'Kick'
                    }
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });

        it('should return false for unknown comparison type', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'contains',
                value: 'kick'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(false);
        });

        it('should handle multiple platforms with "is not" comparison', () => {
            const filterSettings: FilterSettings = {
                comparisonType: 'is not',
                value: 'youtube'
            };

            const eventData = {
                eventSourceId: 'twitch',
                eventId: 'chat-message',
                eventMeta: {
                    username: 'testuser@kick',
                    platform: 'kick'
                }
            };

            const result = platformFilter.predicate(filterSettings, eventData);

            expect(result).toBe(true);
        });
    });
});
