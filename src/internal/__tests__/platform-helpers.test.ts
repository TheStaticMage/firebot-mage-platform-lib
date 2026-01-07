import { checkMatch } from '../platform-helpers';

describe('checkMatch', () => {
    describe('with allowUnknownMatch: false (default)', () => {
        it('should return true for matching platforms', () => {
            expect(checkMatch('kick', 'kick')).toBe(true);
            expect(checkMatch('twitch', 'twitch')).toBe(true);
            expect(checkMatch('youtube', 'youtube')).toBe(true);
        });

        it('should return false for non-matching platforms', () => {
            expect(checkMatch('kick', 'twitch')).toBe(false);
            expect(checkMatch('twitch', 'kick')).toBe(false);
            expect(checkMatch('youtube', 'kick')).toBe(false);
        });

        it('should return true when target is "any" and detected is a known platform', () => {
            expect(checkMatch('kick', 'any')).toBe(true);
            expect(checkMatch('twitch', 'any')).toBe(true);
            expect(checkMatch('youtube', 'any')).toBe(true);
        });

        it('should return false when target is "any" and detected is unknown', () => {
            expect(checkMatch('unknown', 'any')).toBe(false);
        });

        it('should return false when detected is unknown (regardless of target)', () => {
            expect(checkMatch('unknown', 'kick')).toBe(false);
            expect(checkMatch('unknown', 'twitch')).toBe(false);
            expect(checkMatch('unknown', 'youtube')).toBe(false);
            expect(checkMatch('unknown', 'unknown')).toBe(false);
        });
    });

    describe('with allowUnknownMatch: true', () => {
        it('should return true for matching platforms', () => {
            expect(checkMatch('kick', 'kick', { allowUnknownMatch: true })).toBe(true);
            expect(checkMatch('twitch', 'twitch', { allowUnknownMatch: true })).toBe(true);
            expect(checkMatch('youtube', 'youtube', { allowUnknownMatch: true })).toBe(true);
        });

        it('should return false for non-matching platforms', () => {
            expect(checkMatch('kick', 'twitch', { allowUnknownMatch: true })).toBe(false);
            expect(checkMatch('twitch', 'kick', { allowUnknownMatch: true })).toBe(false);
            expect(checkMatch('youtube', 'kick', { allowUnknownMatch: true })).toBe(false);
        });

        it('should return true when target is "any" and detected is a known platform', () => {
            expect(checkMatch('kick', 'any', { allowUnknownMatch: true })).toBe(true);
            expect(checkMatch('twitch', 'any', { allowUnknownMatch: true })).toBe(true);
            expect(checkMatch('youtube', 'any', { allowUnknownMatch: true })).toBe(true);
        });

        it('should return false when target is "any" and detected is unknown', () => {
            expect(checkMatch('unknown', 'any', { allowUnknownMatch: true })).toBe(false);
        });

        it('should return true when both detected and target are unknown', () => {
            expect(checkMatch('unknown', 'unknown', { allowUnknownMatch: true })).toBe(true);
        });

        it('should return false when detected is unknown but target is not', () => {
            expect(checkMatch('unknown', 'kick', { allowUnknownMatch: true })).toBe(false);
            expect(checkMatch('unknown', 'twitch', { allowUnknownMatch: true })).toBe(false);
            expect(checkMatch('unknown', 'youtube', { allowUnknownMatch: true })).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle default options parameter', () => {
            expect(checkMatch('kick', 'kick')).toBe(true);
            expect(checkMatch('unknown', 'unknown')).toBe(false);
        });

        it('should handle case-sensitive platform matching', () => {
            expect(checkMatch('Kick', 'kick')).toBe(false);
            expect(checkMatch('KICK', 'kick')).toBe(false);
            expect(checkMatch('kick', 'Kick')).toBe(false);
        });
    });
});
