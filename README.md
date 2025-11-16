# Firebot Multi-Platform Support Library

A centralized platform-aware library that provides shared functionality for multi-platform streaming integrations in Firebot. This library enables seamless cross-platform communication and feature management for Twitch, Kick, YouTube, and other streaming platforms.

## Overview

The Platform Library serves as a central hub for platform-aware features, providing:

- **Platform Detection**: Automatically detect which platform triggered an event
- **Platform Dispatching**: Route operations to the correct platform (Twitch, Kick, YouTube)
- **Platform-Aware Effects**: Chat messages, moderation actions that work across platforms
- **Platform-Aware Variables**: Dynamically resolve user information based on platform
- **IPC Communication**: Backend-frontend communication via Reflector pattern
- **Integration Registry**: Manage and verify installed platform integrations

## Features

- Platform Variable (`$platform`) - Detects the platform from event context
- Platform-Aware Chat Effect - Send messages to specific platforms or all platforms
- Platform-Aware User Display Name Variable - Resolve usernames across platforms
- Platform Filter - Filter events by platform
- Platform Condition - Conditional logic based on platform
- Platform Restriction - Restrict effects to specific platforms

## Installation

This library is designed to be loaded as a Firebot startup script.

1. Download the latest `firebot-mage-platform-lib.js` file from the [Releases](https://github.com/TheStaticMage/firebot-mage-platform-lib/releases) page
2. In Firebot, go to Settings > Scripts
3. Click "Add New Script" and select the downloaded file
4. Enable "Run at Startup" for the script
5. Restart Firebot

The library will automatically initialize and make platform-aware features available to all your effects and commands.

## Dependencies

- **Firebot v5** or later (required)
- Platform integrations that support the Platform Library protocol v1.0.0:
  - **Twitch**: Built-in support (no additional integration required)
  - **Kick**: Requires [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) v0.6.0 or later
  - **YouTube**: Requires [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) v0.1.0 or later

## Configuration

The library accepts the following startup script parameters:

- **Debug Mode** (boolean, default: `false`) - Enable detailed debug logging to help troubleshoot issues

To configure:
1. Go to Settings > Scripts in Firebot
2. Find "Platform Library" in your script list
3. Click the settings icon
4. Toggle "Debug Mode" if needed
5. Save and restart Firebot

## Supported Platforms

| Platform | Support | Required Integration | Min Version |
|----------|---------|---------------------|-------------|
| Twitch | ✓ Built-in | None | N/A |
| Kick | ✓ Via Integration | [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) | 0.6.0+ |
| YouTube | ✓ Via Integration | [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) | 0.1.0+ |

## Version Compatibility

**Platform Library Version**: 1.0.0

**Compatible Integration Versions**:
- Kick Integration: `^0.6.0` (0.6.0 or later, but before 1.0.0)
- YouTube Integration: `^0.1.0` (0.1.0 or later, but before 1.0.0)

The library uses semantic versioning. Breaking changes to the IPC protocol will increment the major version. Integrations must be updated when the major version changes.

## Documentation

- **[User Guide](doc/user-guide.md)** - How to use platform-aware features in your Firebot setup
- **[Integration Developer Guide](doc/integration-guide.md)** - For developers creating platform integrations
- **[API Reference](doc/api.md)** - Complete IPC protocol and interface documentation
- **[Reusable Utilities Guide](INTEGRATION_GUIDE.md)** - Using `@thestaticmage/mage-platform-lib-client` in your integrations

## For Integration Developers

If you're developing a platform integration that uses this library:

- See the **[Reusable Utilities Guide](INTEGRATION_GUIDE.md)** for how to use the script loader and reflector factory utilities provided by the client library
- See the **[Integration Developer Guide](doc/integration-guide.md)** for details on implementing the required IPC handlers and operation contracts

## Contributions

Contributions are welcome via [Pull Requests](https://github.com/TheStaticMage/firebot-mage-platform-lib/pulls). I strongly suggest that you contact me before making significant changes, because I'd feel really bad if you spent a lot of time working on something that is not consistent with my vision for the project. Please refer to the [Contribution Guidelines](/.github/contributing.md) for specifics.

## License

This project is released under the [GNU General Public License version 3](/LICENSE).

Some code in this project is based on (or copied from) [Firebot](https://github.com/crowbartools/firebot), which is licensed under the GNU GPL 3 as well. Since the source code is distributed here and links back to Firebot, this project complies with the license.
