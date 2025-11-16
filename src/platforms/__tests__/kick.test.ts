import {
    kickifyUserId,
    unkickifyUserId,
    kickifyUsername,
    unkickifyUsername
} from '../kick';

describe('kickifyUserId', () => {
    it('returns empty string for undefined', () => {
        expect(kickifyUserId(undefined)).toBe('');
    });

    it('returns empty string for null', () => {
        expect(kickifyUserId(null as any)).toBe('');
    });

    it('adds k prefix to numeric userId', () => {
        expect(kickifyUserId(12345)).toBe('k12345');
    });

    it('adds k prefix to string userId', () => {
        expect(kickifyUserId('67890')).toBe('k67890');
    });

    it('does not add k prefix if already present', () => {
        expect(kickifyUserId('k12345')).toBe('k12345');
    });

    it('handles zero userId', () => {
        expect(kickifyUserId(0)).toBe('k0');
    });

    it('handles empty string', () => {
        expect(kickifyUserId('')).toBe('k');
    });

    it('handles string that starts with k but is not kickified', () => {
        expect(kickifyUserId('kabc')).toBe('kabc');
    });
});

describe('unkickifyUserId', () => {
    it('returns empty string for undefined', () => {
        expect(unkickifyUserId(undefined)).toBe('');
    });

    it('returns empty string for null', () => {
        expect(unkickifyUserId(null as any)).toBe('');
    });

    it('removes k prefix from kickified userId', () => {
        expect(unkickifyUserId('k12345')).toBe('12345');
    });

    it('returns as-is for non-kickified userId', () => {
        expect(unkickifyUserId('67890')).toBe('67890');
    });

    it('handles numeric input by converting to string', () => {
        expect(unkickifyUserId(12345)).toBe('12345');
    });

    it('handles zero', () => {
        expect(unkickifyUserId(0)).toBe('0');
    });

    it('handles empty string', () => {
        expect(unkickifyUserId('')).toBe('');
    });

    it('handles single k character', () => {
        expect(unkickifyUserId('k')).toBe('');
    });

    it('handles k with other text', () => {
        expect(unkickifyUserId('kabc')).toBe('abc');
    });
});

describe('kickifyUsername', () => {
    it('returns empty string for undefined', () => {
        expect(kickifyUsername(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(kickifyUsername('')).toBe('');
    });

    it('adds @kick suffix to username', () => {
        expect(kickifyUsername('testuser')).toBe('testuser@kick');
    });

    it('does not add @kick suffix if already present', () => {
        expect(kickifyUsername('testuser@kick')).toBe('testuser@kick');
    });

    it('handles username with @ symbol but not @kick', () => {
        expect(kickifyUsername('user@other')).toBe('user@other@kick');
    });

    it('handles username that ends with partial @kick', () => {
        expect(kickifyUsername('user@kic')).toBe('user@kic@kick');
    });

    it('handles single character username', () => {
        expect(kickifyUsername('a')).toBe('a@kick');
    });

    it('removes leading @ symbol from username', () => {
        expect(kickifyUsername('@testuser')).toBe('testuser@kick');
    });

    it('handles username with leading @ that already has @kick suffix', () => {
        expect(kickifyUsername('@testuser@kick')).toBe('testuser@kick');
    });

    it('handles username with multiple leading @ symbols', () => {
        expect(kickifyUsername('@@testuser')).toBe('@testuser@kick');
    });
});

describe('unkickifyUsername', () => {
    it('returns empty string for undefined', () => {
        expect(unkickifyUsername(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(unkickifyUsername('')).toBe('');
    });

    it('removes @kick suffix from username', () => {
        expect(unkickifyUsername('testuser@kick')).toBe('testuser');
    });

    it('returns as-is for username without @kick suffix', () => {
        expect(unkickifyUsername('testuser')).toBe('testuser');
    });

    it('removes leading @ symbol after removing @kick', () => {
        expect(unkickifyUsername('@testuser@kick')).toBe('testuser');
    });

    it('handles username that is just @kick', () => {
        expect(unkickifyUsername('@kick')).toBe('');
    });

    it('handles username with @ but not @kick suffix', () => {
        expect(unkickifyUsername('user@other')).toBe('user@other');
    });

    it('handles username with multiple @ symbols', () => {
        expect(unkickifyUsername('@user@test@kick')).toBe('user@test');
    });

    it('removes @ prefix from regular username', () => {
        expect(unkickifyUsername('@username')).toBe('username');
    });

    it('handles complex username with @ prefix and @kick suffix', () => {
        expect(unkickifyUsername('@complex.user-name123@kick')).toBe('complex.user-name123');
    });
});
