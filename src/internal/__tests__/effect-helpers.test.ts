import type { Trigger } from '@crowbartools/firebot-custom-scripts-types/types/triggers';
import { resolvePlatformForEffect } from '../effect-helpers';

jest.mock('../../main', () => {
    const mockLogger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    };

    return {
        logger: mockLogger,
        platformLib: {
            userDatabase: {
                detectPlatform: jest.requireActual('../trigger-helpers').detectPlatformFromInputs
            }
        }
    };
});

describe('effect-helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolvePlatformForEffect', () => {
        const triggerWithChatUserId: Trigger = {
            type: 'event',
            metadata: {
                chatMessage: {
                    userId: 'k123456'
                }
            }
        } as unknown as Trigger;

        const triggerWithoutMetadata: Trigger = {
            type: 'event',
            metadata: undefined
        } as unknown as Trigger;

        it('returns explicit platform when provided', async () => {
            const result = await resolvePlatformForEffect('twitch', 'testuser', triggerWithChatUserId, 'TestEffect');

            expect(result).toBe('twitch');
        });

        it('detects platform when explicit platform is unknown', async () => {
            const result = await resolvePlatformForEffect('unknown', 'testuser', triggerWithChatUserId, 'TestEffect');

            expect(result).toBe('kick');
        });

        it('detects platform when platform is undefined', async () => {
            const result = await resolvePlatformForEffect(undefined, 'testuser', triggerWithChatUserId, 'TestEffect');

            expect(result).toBe('kick');
        });

        it('detects platform when platform is auto-detect', async () => {
            const result = await resolvePlatformForEffect('auto-detect', 'testuser', triggerWithChatUserId, 'TestEffect');

            expect(result).toBe('kick');
        });

        it('returns null when detection returns unknown', async () => {
            const result = await resolvePlatformForEffect(undefined, '', triggerWithoutMetadata, 'TestEffect');

            expect(result).toBeNull();
        });
    });
});
