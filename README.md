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

1. Download the latest release from the [Releases](https://github.com/TheStaticMage/firebot-mage-platform-lib/releases) page
2. Place the script in your Firebot scripts directory
3. Configure it as a startup script in Firebot settings
4. Restart Firebot

## Dependencies

- Firebot v5 or later
- Platform integrations (Kick, YouTube) that support the Platform Library protocol

## Configuration

The library accepts the following parameters:

- `debug` (boolean, default: false) - Enable debug logging

## Platform Integrations

This library works with the following integrations:

- **Twitch**: Built-in support (no additional integration required)
- **Kick**: Requires [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration)
- **YouTube**: Requires [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration)

## For Integration Developers

If you're developing a platform integration that uses this library, see the [Integration Developer Guide](doc/integration-guide.md) for details on implementing the required IPC handlers.

## Contributions

Contributions are welcome via [Pull Requests](https://github.com/TheStaticMage/firebot-mage-platform-lib/pulls). I strongly suggest that you contact me before making significant changes, because I'd feel really bad if you spent a lot of time working on something that is not consistent with my vision for the project. Please refer to the [Contribution Guidelines](/.github/contributing.md) for specifics.

## License

This project is released under the [GNU General Public License version 3](/LICENSE).

Some code in this project is based on (or copied from) [Firebot](https://github.com/crowbartools/firebot), which is licensed under the GNU GPL 3 as well. Since the source code is distributed here and links back to Firebot, this project complies with the license.
