/* eslint-disable @typescript-eslint/unbound-method */
import { IntegrationDetector } from '../integration-detector';
import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { LogWrapper } from '../main';

describe('IntegrationDetector', () => {
    let mockModules: ScriptModules;
    let mockLogger: LogWrapper;
    let detector: IntegrationDetector;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as LogWrapper;

        mockModules = {
            frontendCommunicator: {
                fireEventAsync: jest.fn()
            }
        } as unknown as ScriptModules;

        detector = new IntegrationDetector(mockModules, mockLogger);
    });

    describe('identifyIntegration', () => {
        it('should identify Kick integration by manifest name', () => {
            const script = { name: 'Kick Integration', version: '0.6.2' };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('kick');
        });

        it('should identify YouTube integration by manifest name', () => {
            const script = { name: 'YouTube Integration', version: '0.0.1' };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('youtube');
        });

        it('should identify Kick integration by script ID', () => {
            const script = {
                name: 'Some Other Name',
                id: 'firebot-mage-kick-integration',
                version: '0.6.2'
            };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('kick');
        });

        it('should identify YouTube integration by script ID', () => {
            const script = {
                name: 'Some Other Name',
                id: 'firebot-mage-youtube-integration',
                version: '0.0.1'
            };
            const result = detector.identifyIntegration(script);
            expect(result).toBe('youtube');
        });

        it('should return null for unknown integration', () => {
            const script = { name: 'Unknown Integration', version: '1.0.0' };
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
                { name: 'Kick Integration', version: '0.6.2', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
            expect(detector.isIntegrationDetected('youtube')).toBe(false);
        });

        it('should detect and store YouTube integration', async () => {
            const scripts = [
                { name: 'YouTube Integration', version: '0.0.1', id: 'firebot-mage-youtube-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('youtube')).toBe(true);
            expect(detector.isIntegrationDetected('kick')).toBe(false);
        });

        it('should detect multiple integrations', async () => {
            const scripts = [
                { name: 'Kick Integration', version: '0.6.2' },
                { name: 'YouTube Integration', version: '0.0.1' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
            expect(detector.isIntegrationDetected('youtube')).toBe(true);
        });

        it('should ignore unknown scripts', async () => {
            const scripts = [
                { name: 'Unknown Script', version: '1.0.0' },
                { name: 'Kick Integration', version: '0.6.2' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(true);
        });

        it('should handle empty script list', async () => {
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue([]);

            await detector.detectInstalledIntegrations();

            expect(detector.isIntegrationDetected('kick')).toBe(false);
            expect(detector.isIntegrationDetected('youtube')).toBe(false);
        });

        it('should handle null response gracefully', async () => {
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(null);

            await detector.detectInstalledIntegrations();

            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockRejectedValue(
                new Error('IPC failed')
            );

            await detector.detectInstalledIntegrations();

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getAvailablePlatforms', () => {
        it('should always include twitch', async () => {
            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue([]);

            await detector.detectInstalledIntegrations();

            const platforms = detector.getAvailablePlatforms();
            expect(platforms).toContain('twitch');
        });

        it('should include detected platforms', async () => {
            const scripts = [
                { name: 'Kick Integration', version: '0.6.2' },
                { name: 'YouTube Integration', version: '0.0.1' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            const platforms = detector.getAvailablePlatforms();
            expect(platforms).toEqual(expect.arrayContaining(['twitch', 'kick', 'youtube']));
        });
    });

    describe('getDetectedIntegrationInfo', () => {
        it('should return integration info for detected integration', async () => {
            const scripts = [
                { name: 'Kick Integration', version: '0.6.2', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();

            const info = detector.getDetectedIntegrationInfo('kick');
            expect(info).toEqual({
                scriptName: 'Kick Integration',
                version: '0.6.2',
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
                { name: 'Kick Integration', version: '0.6.2', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it('should return incompatible for version mismatch', async () => {
            const scripts = [
                { name: 'Kick Integration', version: '0.5.0', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);
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
            const scripts = [
                { name: 'Kick Integration', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);
            await detector.detectInstalledIntegrations();

            const result = detector.checkIntegrationCompatibility('kick', '^0.6.0');
            expect(result.compatible).toBe(false);
            expect(result.reason).toContain('no version information');
        });

        it('should log warning for incompatible integration', async () => {
            const scripts = [
                { name: 'Kick Integration', version: '0.5.0', id: 'firebot-mage-kick-integration' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);
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
                { name: 'Kick Integration', version: '0.6.2' }
            ];

            (mockModules.frontendCommunicator.fireEventAsync as jest.Mock).mockResolvedValue(scripts);

            await detector.detectInstalledIntegrations();
            expect(detector.isIntegrationDetected('kick')).toBe(true);

            detector.clear();
            expect(detector.isIntegrationDetected('kick')).toBe(false);
        });
    });

    describe('registerIntegration', () => {
        it('should manually register an integration', () => {
            expect(detector.isIntegrationDetected('kick')).toBe(false);

            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            expect(detector.isIntegrationDetected('kick')).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith('Manually registered integration: kick v0.6.2');
        });

        it('should store correct integration info', () => {
            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            const info = detector.getDetectedIntegrationInfo('kick');
            expect(info).toEqual({
                scriptName: 'mage-kick-integration',
                version: '0.6.2',
                scriptId: 'mage-kick-integration'
            });
        });

        it('should override existing integration registration', () => {
            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.0'
            });

            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            const info = detector.getDetectedIntegrationInfo('kick');
            expect(info?.version).toBe('0.6.2');
        });

        it('should make platform available', () => {
            const platformsBefore = detector.getAvailablePlatforms();
            expect(platformsBefore).not.toContain('kick');

            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            const platformsAfter = detector.getAvailablePlatforms();
            expect(platformsAfter).toContain('kick');
        });
    });

    describe('deregisterIntegration', () => {
        it('should remove a registered integration', () => {
            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            expect(detector.isIntegrationDetected('kick')).toBe(true);

            detector.deregisterIntegration('kick');

            expect(detector.isIntegrationDetected('kick')).toBe(false);
            expect(mockLogger.info).toHaveBeenCalledWith('Deregistered integration: kick');
        });

        it('should warn when deregistering unknown integration', () => {
            detector.deregisterIntegration('unknown');

            expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to deregister unknown integration: unknown');
        });

        it('should not throw error when deregistering unknown integration', () => {
            expect(() => {
                detector.deregisterIntegration('unknown');
            }).not.toThrow();
        });

        it('should remove platform from available platforms', () => {
            detector.registerIntegration({
                integrationId: 'kick',
                integrationName: 'mage-kick-integration',
                version: '0.6.2'
            });

            const platformsBefore = detector.getAvailablePlatforms();
            expect(platformsBefore).toContain('kick');

            detector.deregisterIntegration('kick');

            const platformsAfter = detector.getAvailablePlatforms();
            expect(platformsAfter).not.toContain('kick');
        });
    });
});
