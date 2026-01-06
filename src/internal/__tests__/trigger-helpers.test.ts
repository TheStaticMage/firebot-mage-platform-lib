import { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import * as platformLibClient from '@thestaticmage/mage-platform-lib-client';
import { detectPlatformFromInputs, determineTargetPlatform, extractTriggerUsername } from '../trigger-helpers';

jest.mock('@thestaticmage/mage-platform-lib-client', () => ({
    ...jest.requireActual('@thestaticmage/mage-platform-lib-client'),
    detectPlatform: jest.fn()
}));

describe('trigger-helpers', () => {
    const mockTrigger: Trigger = {
        type: 'event',
        metadata: {
            username: 'triggeruser',
            platform: 'twitch'
        }
    } as unknown as Trigger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('detectPlatformFromInputs', () => {
        const mockTrigger: Trigger = {
            type: 'event',
            metadata: {
                username: 'triggeruser',
                platform: 'twitch'
            }
        } as unknown as Trigger;

        beforeEach(() => {
            jest.clearAllMocks();
            (platformLibClient.detectPlatform as jest.Mock).mockReturnValue('twitch');
        });

        describe('userId detection', () => {
            it('returns kick when userId starts with k', () => {
                const result = detectPlatformFromInputs('k123456');
                expect(result).toBe('kick');
            });

            it('returns youtube when userId starts with y', () => {
                const result = detectPlatformFromInputs('y123456');
                expect(result).toBe('youtube');
            });

            it('trims whitespace from userId before checking', () => {
                const result = detectPlatformFromInputs('  k123456  ');
                expect(result).toBe('kick');
            });

            it('does not detect platform from userId starting with other letters', () => {
                const result = detectPlatformFromInputs('t123456');
                expect(result).toBe('unknown');
            });

            it('prioritizes userId over username and trigger', () => {
                const result = detectPlatformFromInputs('k123456', 'user@youtube', mockTrigger);
                expect(result).toBe('kick');
            });
        });

        describe('username detection', () => {
            it('returns kick when username ends with @kick', () => {
                const result = detectPlatformFromInputs(undefined, 'testuser@kick');
                expect(result).toBe('kick');
            });

            it('returns youtube when username ends with @youtube', () => {
                const result = detectPlatformFromInputs(undefined, 'testuser@youtube');
                expect(result).toBe('youtube');
            });

            it('converts username to lowercase before checking', () => {
                const result = detectPlatformFromInputs(undefined, 'TestUser@KICK');
                expect(result).toBe('kick');
            });

            it('does not detect platform from username without suffix', () => {
                const result = detectPlatformFromInputs(undefined, 'testuser');
                expect(result).toBe('unknown');
            });

            it('prioritizes username over trigger', () => {
                const result = detectPlatformFromInputs(undefined, 'testuser@kick', mockTrigger);
                expect(result).toBe('kick');
            });
        });

        describe('trigger detection', () => {
            it('returns platform from trigger when userId and username are undefined', () => {
                const result = detectPlatformFromInputs(undefined, undefined, mockTrigger);
                expect(result).toBe('twitch');
            });

            it('returns unknown when trigger detectPlatform returns unknown', () => {
                (platformLibClient.detectPlatform as jest.Mock).mockReturnValue('unknown');
                const result = detectPlatformFromInputs(undefined, undefined, mockTrigger);
                expect(result).toBe('unknown');
            });

            it('returns unknown when trigger detectPlatform returns falsy', () => {
                (platformLibClient.detectPlatform as jest.Mock).mockReturnValue(null);
                const result = detectPlatformFromInputs(undefined, undefined, mockTrigger);
                expect(result).toBe('unknown');
            });
        });

        describe('fallback behavior', () => {
            it('returns unknown when all inputs are undefined', () => {
                const result = detectPlatformFromInputs(undefined, undefined, undefined);
                expect(result).toBe('unknown');
            });

            it('returns unknown when userId has no prefix and username has no suffix', () => {
                const result = detectPlatformFromInputs('123456', 'testuser');
                expect(result).toBe('unknown');
            });

            it('returns unknown when userId is empty string', () => {
                const result = detectPlatformFromInputs('', 'testuser');
                expect(result).toBe('unknown');
            });

            it('returns unknown when username is empty string', () => {
                const result = detectPlatformFromInputs('123456', '');
                expect(result).toBe('unknown');
            });
        });
    });

    describe('determineTargetPlatform', () => {
        beforeEach(() => {
            (platformLibClient.detectPlatform as jest.Mock).mockReturnValue('twitch');
        });

        it('returns explicit platform when provided', () => {
            const result = determineTargetPlatform('kick', 'testuser', mockTrigger);
            expect(result).toBe('kick');
        });

        it('returns platform from username suffix when no explicit platform provided', () => {
            const result = determineTargetPlatform(undefined, 'testuser@youtube', mockTrigger);
            expect(result).toBe('youtube');
        });

        it('does not use "unknown" to override the platform', () => {
            const result = determineTargetPlatform('unknown', 'testuser@youtube', mockTrigger);
            expect(result).toBe('youtube');
        });

        it('returns platform from trigger when no explicit platform and username has no suffix', () => {
            const result = determineTargetPlatform(undefined, 'testuser', mockTrigger);
            expect(result).toBe('twitch');
        });

        it('falls back to trigger when explicit platform is unknown', () => {
            const result = determineTargetPlatform('unknown', 'testuser', mockTrigger);
            expect(result).toBe('twitch');
        });

        it('returns unknown when username is undefined and trigger has no platform', () => {
            (platformLibClient.detectPlatform as jest.Mock).mockReturnValue('unknown');
            const triggerNoPlatform: Trigger = {
                type: 'manual',
                metadata: {}
            } as unknown as Trigger;

            const result = determineTargetPlatform(undefined, undefined, triggerNoPlatform);
            expect(result).toBe('unknown');
        });

        it('prioritizes explicit platform over username suffix', () => {
            const result = determineTargetPlatform('kick', 'testuser@youtube', mockTrigger);
            expect(result).toBe('kick');
        });

        it('prioritizes username suffix over trigger platform', () => {
            const result = determineTargetPlatform(undefined, 'testuser@kick', mockTrigger);
            expect(result).toBe('kick');
        });
    });

    describe('extractTriggerUsername', () => {
        it('returns username from chatMessage', () => {
            const trigger: Trigger = {
                type: 'chat',
                metadata: {
                    chatMessage: { username: 'chatuser' }
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBe('chatuser');
        });

        it('prioritizes chatMessage username over eventData username', () => {
            const trigger: Trigger = {
                type: 'chat',
                metadata: {
                    chatMessage: { username: 'chatuser' },
                    eventData: { username: 'eventuser' }
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBe('chatuser');
        });

        it('returns username from eventData when chatMessage is absent', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    eventData: { username: 'eventuser' }
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBe('eventuser');
        });

        it('prioritizes eventData username over metadata username', () => {
            const trigger: Trigger = {
                type: 'event',
                metadata: {
                    username: 'metauser',
                    eventData: { username: 'eventuser' }
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBe('eventuser');
        });

        it('returns username from metadata when chatMessage and eventData are absent', () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 'metauser'
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBe('metauser');
        });

        it('returns null when no username is present', () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {}
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBeNull();
        });

        it('returns null when metadata is undefined', () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: undefined
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBeNull();
        });

        it('returns null when username is not a string', () => {
            const trigger: Trigger = {
                type: 'manual',
                metadata: {
                    username: 123
                }
            } as unknown as Trigger;

            const result = extractTriggerUsername(trigger);
            expect(result).toBeNull();
        });
    });
});
