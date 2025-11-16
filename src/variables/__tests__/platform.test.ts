import { platformVariable } from '../platform';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('platformVariable', () => {
    describe('evaluator', () => {
        it('should detect explicit platform from metadata.platform', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'kick'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('kick');
        });

        it('should detect explicit platform from metadata.eventData.platform', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        platform: 'youtube'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('youtube');
        });

        it('should detect platform from eventSource.id', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventSource: {
                        id: 'twitch',
                        name: 'Twitch'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('twitch');
        });

        it('should detect YouTube from userId pattern', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        userId: 'y1234567890123456789012'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('youtube');
        });

        it('should detect Kick from userId pattern', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        userId: 'k12345'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('kick');
        });

        it('should detect Twitch from numeric userId', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    eventData: {
                        userId: '12345678'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('twitch');
        });

        it('should detect Kick from username pattern', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'someuser@kick'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('kick');
        });

        it('should detect YouTube from username pattern', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'someuser@youtube'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('youtube');
        });

        it('should return twitch for generic username', () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'testuser'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('twitch');
        });

        it('should return twitch for trigger with generic username', () => {
            const trigger: Trigger = {
                type: 'command',
                metadata: {
                    username: 'someuser'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('twitch');
        });

        it('should normalize platform strings', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'TWITCH'
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('twitch');
        });

        it('should handle null trigger gracefully', () => {
            const result = platformVariable.evaluator(null as never);
            expect(result).toBe('unknown');
        });

        it('should prioritize explicit platform over eventSource', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'testuser',
                    platform: 'kick',
                    eventSource: {
                        id: 'twitch',
                        name: 'Twitch'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('kick');
        });

        it('should work with chat message trigger', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'YouTubeUser@youtube',
                    chatMessage: {
                        userId: 'y9876543210987654321098',
                        username: 'YouTubeUser@youtube'
                    }
                }
            };

            const result = platformVariable.evaluator(trigger);
            expect(result).toBe('youtube');
        });
    });
});
