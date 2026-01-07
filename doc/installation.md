# Installation

| Plugin Version | Minimum Firebot Version |
| --- | --- |
| 0.0.1+ | 5.65 |

## Installation: Plugin

1. Enable custom scripts in Firebot (Settings > Scripts) if you have not already done so.
2. From the latest [Release](https://github.com/TheStaticMage/firebot-mage-platform-lib/releases), download `firebot-mage-platform-lib-<version>.js` into your Firebot scripts directory (File > Open Data Folder, then select the "scripts" directory).
3. Go to Settings > Scripts > Manage Startup Scripts > Add New Script and add the `firebot-mage-platform-lib-<version>.js` script.
4. Restart Firebot. (The plugin will _not_ be loaded until you actually restart Firebot.)

## Configuration

The plugin accepts the following startup script parameters:

- **Debug Mode** (boolean, default: `false`) - Enable detailed debug logging to help troubleshoot issues
- **Override Built-in Variables** (boolean, default: `false`) - Override Firebot built-in variables with platform-aware versions (experimental)

:warning: **Variable Override is an experimental feature.** When enabled, TypeError messages will appear in Firebot logs during startup. This is expected behavior and does not indicate a problem. The feature allows built-in Firebot variables to work across platforms (Twitch, Kick, YouTube) instead of being Twitch-only.

To configure:

1. Go to Settings > Scripts > Manage Startup Scripts in Firebot
2. Find "firebot-mage-platform-lib" in your script list
3. Click Edit button
4. Toggle **Debug Mode** if needed
5. Toggle **Override Built-in Variables** to enable experimental variable override feature
6. Save and restart Firebot

See [Variable Override](/doc/variable-override.md) for more details about this experimental feature.

## Platform Integrations

The Platform Library provides built-in support for Twitch and can be extended with platform-specific integrations:

| Platform | Support | Required Integration | Min Version |
| ---------- | --------- | --------------------- | ------------- |
| Twitch | ✓ Built-in | None | N/A |
| Kick | ✓ Via Integration | [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) | 0.11.0+ |
| YouTube | ✓ Via Integration | [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) | 0.0.4+ |

To enable Kick or YouTube support, install the corresponding platform integration plugin before or after installing this plugin.
