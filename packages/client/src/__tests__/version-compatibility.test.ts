import { PLATFORM_LIB_VERSION } from '../version';
import { checkVersionCompatibility, PLATFORM_LIB_MIN_VERSION } from '../version-compatibility';

describe('checkVersionCompatibility', () => {
    describe('exact version matching', () => {
        it('should return compatible for exact match', () => {
            const result = checkVersionCompatibility('1.0.0', '1.0.0');
            expect(result.compatible).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return incompatible for mismatch', () => {
            const result = checkVersionCompatibility('1.0.0', '2.0.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('does not satisfy requirement');
        });
    });

    describe('caret range (^)', () => {
        it('should accept compatible minor version', () => {
            const result = checkVersionCompatibility('^1.0.0', '1.2.3');
            expect(result.compatible).toBe(true);
        });

        it('should accept compatible patch version', () => {
            const result = checkVersionCompatibility('^1.0.0', '1.0.5');
            expect(result.compatible).toBe(true);
        });

        it('should reject incompatible major version', () => {
            const result = checkVersionCompatibility('^1.0.0', '2.0.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('does not satisfy requirement');
        });

        it('should reject lower version', () => {
            const result = checkVersionCompatibility('^1.2.0', '1.1.0');
            expect(result.compatible).toBe(false);
        });
    });

    describe('tilde range (~)', () => {
        it('should accept compatible patch version', () => {
            const result = checkVersionCompatibility('~1.2.0', '1.2.5');
            expect(result.compatible).toBe(true);
        });

        it('should reject incompatible minor version', () => {
            const result = checkVersionCompatibility('~1.2.0', '1.3.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('does not satisfy requirement');
        });

        it('should reject incompatible major version', () => {
            const result = checkVersionCompatibility('~1.2.0', '2.2.0');
            expect(result.compatible).toBe(false);
        });
    });

    describe('range comparisons', () => {
        it('should accept version within range', () => {
            const result = checkVersionCompatibility('>=1.0.0 <2.0.0', '1.5.0');
            expect(result.compatible).toBe(true);
        });

        it('should reject version below range', () => {
            const result = checkVersionCompatibility('>=1.0.0 <2.0.0', '0.9.0');
            expect(result.compatible).toBe(false);
        });

        it('should reject version above range', () => {
            const result = checkVersionCompatibility('>=1.0.0 <2.0.0', '2.0.0');
            expect(result.compatible).toBe(false);
        });

        it('should handle greater than or equal', () => {
            const result = checkVersionCompatibility('>=1.2.0', '1.2.0');
            expect(result.compatible).toBe(true);
        });

        it('should handle less than', () => {
            const result = checkVersionCompatibility('<2.0.0', '1.9.9');
            expect(result.compatible).toBe(true);
        });
    });

    describe('version with metadata', () => {
        it('should handle versions with pre-release tags', () => {
            const result = checkVersionCompatibility('^1.0.0', '1.0.0-beta.1');
            // Pre-release versions typically don't satisfy ranges
            expect(result.compatible).toBe(false);
        });

        it('should handle clean versions with build metadata', () => {
            const result = checkVersionCompatibility('^1.0.0', '1.0.0+build.123');
            expect(result.compatible).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle missing required version', () => {
            const result = checkVersionCompatibility('', '1.0.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('Missing version information');
        });

        it('should handle missing current version', () => {
            const result = checkVersionCompatibility('^1.0.0', '');
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('Missing version information');
        });

        it('should handle invalid current version', () => {
            const result = checkVersionCompatibility('^1.0.0', 'not-a-version');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('Invalid current version');
        });

        it('should handle invalid required range', () => {
            const result = checkVersionCompatibility('not-a-range', '1.0.0');
            expect(result.compatible).toBe(false);
            // Semver may treat this as a version mismatch rather than an error
            expect(result.reason).toBeDefined();
        });
    });

    describe('real-world scenarios', () => {
        it('should validate integration compatibility with platform-lib', () => {
            // Platform-lib requires integration version ^0.6.0
            const result1 = checkVersionCompatibility('^0.6.0', '0.6.2');
            expect(result1.compatible).toBe(true);

            const result2 = checkVersionCompatibility('^0.6.0', '0.5.0');
            expect(result2.compatible).toBe(false);
        });

        it('should validate platform-lib compatibility with integration', () => {
            // Integration requires platform-lib >=1.0.0
            const result1 = checkVersionCompatibility('>=1.0.0', '1.2.0');
            expect(result1.compatible).toBe(true);

            const result2 = checkVersionCompatibility('>=1.0.0', '0.9.0');
            expect(result2.compatible).toBe(false);
        });

        it('should use PLATFORM_LIB_MIN_VERSION constant', () => {
            const result = checkVersionCompatibility(
                `>=${PLATFORM_LIB_MIN_VERSION}`,
                PLATFORM_LIB_VERSION
            );
            expect(result.compatible).toBe(true);
        });
    });
});
