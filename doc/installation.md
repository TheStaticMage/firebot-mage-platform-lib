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

To configure:

1. Go to Settings > Scripts in Firebot
2. Find "Platform Library" in your script list
3. Click the settings icon
4. Toggle **Debug Mode** if needed
5. Save and restart Firebot

## Platform Integrations

The Platform Library provides built-in support for Twitch and can be extended with platform-specific integrations:

| Platform | Support | Required Integration | Min Version |
| --- | --- | --- | --- |
| Twitch | Built-in | None | N/A |
| Kick | Via Integration | [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) | 0.10.1+ |
| YouTube | Under Development | [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) | 0.0.2+ |

To enable Kick or YouTube support, install the corresponding platform integration plugin before or after installing this plugin.
