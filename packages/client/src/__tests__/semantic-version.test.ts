import { checkSemanticVersion } from '../semantic-version';

describe('checkSemanticVersion', () => {
    describe('greater than or equal ranges', () => {
        it('should return true when current version equals range version', () => {
            const result = checkSemanticVersion('5.65.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should return true when current version is greater than range version', () => {
            const result = checkSemanticVersion('5.66.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should return true when current major version is greater', () => {
            const result = checkSemanticVersion('6.0.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should return false when current version is less than range version', () => {
            const result = checkSemanticVersion('5.64.0', '>= 5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('caret ranges', () => {
        it('should accept versions within caret range', () => {
            const result = checkSemanticVersion('5.70.0', '^5.65.0');
            expect(result).toBe(true);
        });

        it('should reject versions outside caret range', () => {
            const result = checkSemanticVersion('6.0.0', '^5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('tilde ranges', () => {
        it('should accept versions within tilde range', () => {
            const result = checkSemanticVersion('5.65.5', '~5.65.0');
            expect(result).toBe(true);
        });

        it('should reject versions outside tilde range', () => {
            const result = checkSemanticVersion('5.66.0', '~5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('exact version ranges', () => {
        it('should accept exact version match', () => {
            const result = checkSemanticVersion('5.65.0', '5.65.0');
            expect(result).toBe(true);
        });

        it('should reject non-matching exact version', () => {
            const result = checkSemanticVersion('5.65.1', '5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('complex ranges', () => {
        it('should handle range with AND condition', () => {
            const result = checkSemanticVersion('5.67.0', '>= 5.65.0 < 6.0.0');
            expect(result).toBe(true);
        });

        it('should reject version outside complex range', () => {
            const result = checkSemanticVersion('6.0.0', '>= 5.65.0 < 6.0.0');
            expect(result).toBe(false);
        });

        it('should handle hyphenated range', () => {
            const result = checkSemanticVersion('5.70.0', '5.65.0 - 6.0.0');
            expect(result).toBe(true);
        });
    });

    describe('version normalization', () => {
        it('should handle versions with leading v character', () => {
            const result = checkSemanticVersion('v5.65.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should handle pre-release versions', () => {
            const result = checkSemanticVersion('5.65.0-beta', '>= 5.65.0-alpha');
            expect(result).toBe(true);
        });

        it('should handle build metadata', () => {
            const result = checkSemanticVersion('5.65.0+build123', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should reject incomplete version formats', () => {
            const result = checkSemanticVersion('5.65', '>= 5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('invalid versions', () => {
        it('should return false for invalid current version', () => {
            const result = checkSemanticVersion('invalid', '>= 5.65.0');
            expect(result).toBe(false);
        });

        it('should return false for invalid range', () => {
            const result = checkSemanticVersion('5.65.0', 'invalid');
            expect(result).toBe(false);
        });

        it('should return false for empty current version', () => {
            const result = checkSemanticVersion('', '>= 5.65.0');
            expect(result).toBe(false);
        });

        it('should return false for empty range', () => {
            const result = checkSemanticVersion('5.65.0', '');
            expect(result).toBe(false);
        });

        it('should return false when both are invalid', () => {
            const result = checkSemanticVersion('invalid', 'also invalid');
            expect(result).toBe(false);
        });

        it('should return false for null-like version strings', () => {
            const result = checkSemanticVersion('null', '>= 5.65.0');
            expect(result).toBe(false);
        });
    });

    describe('real-world scenarios', () => {
        it('should accept newer Firebot versions with >= requirement', () => {
            const result = checkSemanticVersion('5.70.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should reject older Firebot versions with >= requirement', () => {
            const result = checkSemanticVersion('5.60.0', '>= 5.65.0');
            expect(result).toBe(false);
        });

        it('should handle major version requirement', () => {
            const result = checkSemanticVersion('6.5.0', '>= 5.65.0');
            expect(result).toBe(true);
        });

        it('should handle caret range for stable updates', () => {
            const result = checkSemanticVersion('5.80.0', '^5.65.0');
            expect(result).toBe(true);
        });

        it('should prevent major version jumps with caret', () => {
            const result = checkSemanticVersion('6.0.0', '^5.65.0');
            expect(result).toBe(false);
        });
    });
});
