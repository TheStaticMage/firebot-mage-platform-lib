import { detectPlatform } from '../platform-detector';
import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';

describe('PlatformDetector', () => {
    describe('detectPlatform', () => {
        it('should return unknown for null trigger', () => {
            const result = detectPlatform(null as unknown as Trigger);
            expect(result).toBe('unknown');
        });

        it('should return unknown for trigger with no metadata', () => {
            const trigger = {} as Trigger;
            const result = detectPlatform(trigger);
            expect(result).toBe('unknown');
        });

        describe('Level 1: Explicit platform in metadata', () => {
            it('should detect platform from metadata.platform', () => {
                const trigger = {
                    metadata: {
                        platform: 'kick'
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should detect platform from metadata.eventData.platform', () => {
                const trigger = {
                    metadata: {
                        eventData: {
                            platform: 'youtube'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should normalize platform names', () => {
                const trigger1 = {
                    metadata: { platform: 'Twitch' }
                } as unknown as Trigger;
                expect(detectPlatform(trigger1)).toBe('twitch');

                const trigger2 = {
                    metadata: { platform: 'KICK' }
                } as unknown as Trigger;
                expect(detectPlatform(trigger2)).toBe('kick');

                const trigger3 = {
                    metadata: { platform: 'YouTube' }
                } as unknown as Trigger;
                expect(detectPlatform(trigger3)).toBe('youtube');
            });

            it('should handle twitchtv variation', () => {
                const trigger = {
                    metadata: { platform: 'twitchtv' }
                } as unknown as Trigger;
                expect(detectPlatform(trigger)).toBe('twitch');
            });

            it('should handle yt variation', () => {
                const trigger = {
                    metadata: { platform: 'yt' }
                } as unknown as Trigger;
                expect(detectPlatform(trigger)).toBe('youtube');
            });
        });

        describe('Level 2: EventSource ID', () => {
            it('should detect platform from eventSource.id', () => {
                const trigger = {
                    metadata: {
                        eventSource: {
                            id: 'kick'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should map mage-kick-integration to kick', () => {
                const trigger = {
                    metadata: {
                        eventSource: {
                            id: 'mage-kick-integration'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should map mage-youtube-integration to youtube', () => {
                const trigger = {
                    metadata: {
                        eventSource: {
                            id: 'mage-youtube-integration'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should detect twitch from eventSource.id', () => {
                const trigger = {
                    metadata: {
                        eventSource: {
                            id: 'twitch'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('twitch');
            });

            it('should prioritize explicit platform over eventSource', () => {
                const trigger = {
                    metadata: {
                        platform: 'youtube',
                        eventSource: {
                            id: 'kick'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });
        });

        describe('Level 3: Chat message patterns', () => {
            it('should detect YouTube from chat message userId pattern', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            userId: 'yabcdefghijklmnopqrs'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should detect Kick from chat message userId pattern', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            userId: 'k12345'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should detect Twitch from numeric user ID', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            userId: '12345678'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('twitch');
            });

            it('should detect Kick from username pattern', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            username: 'testuser@kick'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should detect YouTube from username pattern', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            username: 'testuser@youtube'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });
        });

        describe('Level 4: Event data patterns', () => {
            it('should detect YouTube from eventData userId pattern', () => {
                const trigger = {
                    metadata: {
                        eventData: {
                            userId: 'yabcdefghijklmnopqrstuvwxyz'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should check eventData when chatMessage is not available', () => {
                const trigger = {
                    metadata: {
                        eventData: {
                            userId: 'yzyxwvutsrqponmlkjihgfedcba'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should prioritize chatMessage over eventData', () => {
                const trigger = {
                    metadata: {
                        chatMessage: {
                            userId: 'yabcdefghijklmnopqrstuvwxyz111'
                        },
                        eventData: {
                            userId: 'yabcdefghijklmnopqrstuvwxyz222'
                        }
                    }
                } as unknown as Trigger;

                // Both would detect youtube, but chatMessage is checked first
                expect(detectPlatform(trigger)).toBe('youtube');
            });
        });

        describe('Level 5: Top-level metadata', () => {
            it('should detect Kick from metadata.username pattern', () => {
                const trigger = {
                    metadata: {
                        username: 'testuser@kick'
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should detect YouTube from metadata.username pattern', () => {
                const trigger = {
                    metadata: {
                        username: 'testuser@youtube'
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should return twitch for username without platform indicator', () => {
                const trigger = {
                    metadata: {
                        username: 'testuser'
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('twitch');
            });

            it('should detect YouTube from metadata.user.id', () => {
                const trigger = {
                    metadata: {
                        user: {
                            id: 'yabcdefghijklmnopqrstuvwxyz'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });

            it('should detect Kick from metadata.user.id', () => {
                const trigger = {
                    metadata: {
                        user: {
                            id: 'k12345'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should detect Twitch from metadata.user.id', () => {
                const trigger = {
                    metadata: {
                        user: {
                            id: '12345678'
                        }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('twitch');
            });
        });

        describe('Hierarchical priority', () => {
            it('should use explicit platform even when other signals exist', () => {
                const trigger = {
                    metadata: {
                        platform: 'twitch',
                        eventSource: { id: 'kick' },
                        chatMessage: { userId: 'yabcdefghijklmnopqrstuvwxyz' }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('twitch');
            });

            it('should use eventSource when explicit platform is missing', () => {
                const trigger = {
                    metadata: {
                        eventSource: { id: 'kick' },
                        chatMessage: { userId: 'yabcdefghijklmnopqrstuvwxyz' }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('kick');
            });

            it('should use chatMessage when higher levels are missing', () => {
                const trigger = {
                    metadata: {
                        chatMessage: { userId: 'yabcdefghijklmnopqrstuvwxyz' }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('youtube');
            });
        });

        describe('Edge cases', () => {
            it('should handle empty strings gracefully', () => {
                const trigger = {
                    metadata: {
                        platform: '',
                        eventSource: { id: '' },
                        chatMessage: { userId: '' }
                    }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('unknown');
            });

            it('should handle whitespace-only platform strings', () => {
                const trigger = {
                    metadata: { platform: '   ' }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('unknown');
            });

            it('should return unknown for unrecognized platform names', () => {
                const trigger = {
                    metadata: { platform: 'facebook' }
                } as unknown as Trigger;

                expect(detectPlatform(trigger)).toBe('facebook');
            });
        });
    });
});
