/* eslint-disable @typescript-eslint/unbound-method */
import { IntegrationDetector } from '../integration-detector';
import { LogWrapper } from '../main';
import * as startupScriptsModule from '@thestaticmage/mage-platform-lib-client';

jest.mock('@thestaticmage/mage-platform-lib-client', () => ({
    ...jest.requireActual('@thestaticmage/mage-platform-lib-client'),
    getStartupScripts: jest.fn(),
    resetStartupScriptsReflector: jest.fn()
}));

describe('IntegrationDetector', () => {
    let mockLogger: LogWrapper;
    let detector: IntegrationDetector;
    let mockModules: any;
    const mockScriptDataDir = '/mock/script-data/test';

    beforeEach(() => {
        jest.clearAllMocks();
        (startupScriptsModule.resetStartupScriptsReflector as jest.Mock)();

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as LogWrapper;

        const pathModule = {
            resolve: jest.fn((...args: string[]) => args.join('/')),
            join: jest.fn((...args: string[]) => args.join('/'))
        };

        const fsModule = {
            existsSync: jest.fn(() => true),
            readFileSync: jest.fn(() => {
                // Return a minimal webpack bundle that exports getScriptManifest
                return `
                    (function() {
                        var exports = {};
                        module.exports = {
                            getScriptManifest: function() {
                                return { version: "0.6.2" };
                            }
                        };
                    })();
                `;
            })
        };

        mockModules = {
            path: pathModule,
            fs: fsModule
        };

        detector = new IntegrationDetector(mockLogger, mockModules, mockScriptDataDir);
    });

    describe('identifyIntegration', () => {
        it('should identify Kick integration by manifest name', () => {
            const script = { name: 'Kick Integration' };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('kick');
        });

        it('should identify YouTube integration by manifest name', () => {
            const script = { name: 'YouTube Integration' };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('youtube');
        });

        it('should identify Kick integration by script ID', () => {
            const script = {
                name: 'Some Other Name',
                id: 'firebot-mage-kick-integration'
            };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('kick');
        });

        it('should identify YouTube integration by script ID', () => {
            const script = {
                name: 'Some Other Name',
                id: 'firebot-mage-youtube-integration'
            };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('youtube');
        });

        it('should return null for unknown integration', () => {
            const script = { name: 'Unknown Integration' };
            const result = detector.identifyIntegration(script);
            expect(result).toBeNull();
        });

        it('should return null for invalid script data', () => {
            expect(detector.identifyIntegration({} as never)).toBeNull();
            expect(detector.identifyIntegration(null as never)).toBeNull();
        });
    });

    describe('detectInstalledIntegrations', () => {
        it('should detect and store Kick integration', async () => {
            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
            expect(detector.isIntegrationDetected('youtube')).toBe(false);
        });

        it('should detect and store YouTube integration', async () => {
            const scripts = [
                { name: 'YouTube Integration', id: 'firebot-mage-youtube-integration', scriptName: 'youtube.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('youtube')).toBe(true);
            expect(detector.isIntegrationDetected('kick')).toBe(false);
        });

        it('should detect multiple integrations', async () => {
            const scripts = [
                { name: 'Kick Integration', scriptName: 'kick.js' },
                { name: 'YouTube Integration', scriptName: 'youtube.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
            expect(detector.isIntegrationDetected('youtube')).toBe(true);
        });

        it('should ignore unknown scripts', async () => {
            const scripts = [
                { name: 'Unknown Script', scriptName: 'unknown.js' },
                { name: 'Kick Integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
        });

        it('should handle empty script list', async () => {
            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue([]);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(false);
            expect(detector.isIntegrationDetected('youtube')).toBe(false);
        });

        it('should handle null response gracefully', async () => {
            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(null);

            await detector.detectInstalledIntegrations();

            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            (startupScriptsModule.getStartupScripts as jest.Mock).mockRejectedValue(
                new Error('IPC failed')
            );

            await detector.detectInstalledIntegrations();

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getAvailablePlatforms', () => {
        it('should always include twitch', async () => {
            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue([]);

            await detector.detectInstalledIntegrations();

            const platforms = detector.getAvailablePlatforms();
            expect(platforms).toContain('twitch');
        });

        it('should include detected platforms', async () => {
            const scripts = [
                { name: 'Kick Integration', scriptName: 'kick.js' },
                { name: 'YouTube Integration', scriptName: 'youtube.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            const platforms = detector.getAvailablePlatforms();
            expect(platforms).toEqual(expect.arrayContaining(['twitch', 'kick', 'youtube']));
        });
    });

    describe('getDetectedIntegrationInfo', () => {
        it('should return integration info for detected integration', async () => {
            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            const info = detector.getDetectedIntegrationInfo('kick');
            expect(info).toEqual({
                scriptName: 'Kick Integration',
                version: '0.6.2', // Version loaded from mock fs.readFileSync
                scriptId: 'firebot-mage-kick-integration'
            });
        });

        it('should return null for undetected integration', () => {
            const info = detector.getDetectedIntegrationInfo('kick');
            expect(info).toBeNull();
        });
    });

    describe('checkIntegrationCompatibility', () => {
        it('should return compatible for valid detected integration', async () => {
            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return incompatible for version mismatch', async () => {
            // Temporarily change mock to return different version
            mockModules.fs.readFileSync.mockReturnValueOnce(`
                (function() {
                    var exports = {};
                    module.exports = {
                        getScriptManifest: function() {
                            return { version: "0.5.0" };
                        }
                    };
                })();
            `);

            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('does not satisfy requirement');
        });

        it('should return incompatible for undetected integration', () => {
            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('not detected');
        });

        it('should return incompatible for integration without version', async () => {
            // Script without scriptName means version cannot be loaded
            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('no version information');
        });

        it('should log warning for incompatible integration', async () => {
            // Temporarily change mock to return different version
            mockModules.fs.readFileSync.mockReturnValueOnce(`
                (function() {
                    var exports = {};
                    module.exports = {
                        getScriptManifest: function() {
                            return { version: "0.5.0" };
                        }
                    };
                })();
            `);

            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('incompatible')
            );
        });
    });

    describe('clear', () => {
        it('should clear detected integrations', async () => {
            const scripts = [
                { name: 'Kick Integration', scriptName: 'kick.js' }
            ];

            (startupScriptsModule.getStartupScripts as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();
            expect(detector.isIntegrationDetected('kick')).toBe(true);

            detector.clear();
            expect(detector.isIntegrationDetected('kick')).toBe(false);
        });
    });
});
