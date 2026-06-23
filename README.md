# Firebot Multi-Platform Support Library

> :warning: **Archive Notice**: This plugin is not compatible with backend infrastructure changes in Firebot 5.67 and higher. The plugin will no longer be updated.

This is a [Firebot](https://firebot.app) plugin that provides centralized platform-aware functionality for multi-platform streaming integrations. The Platform Library enables seamless cross-platform communication and feature management for Twitch, Kick, and YouTube.

## Features

- User database for non-Twitch users
- Platform Variable (`$platform`) - Detects the platform from event context
- Platform-Aware User Display Name Variable (`$platformAwareUserDisplayName`) - Resolve usernames across platforms
- Platform Currency Variable (`$platformCurrency`) - Read Kick and YouTube currency balances
- Platform User Metadata Variable (`$platformUserMetadata`) - Get custom metadata
- Platform User Avatar URL Variable (`$platformUserAvatarUrl`) - Get user avatar URLs
- Platform Last Seen Variable (`$platformLastSeen`) - Get last seen date
- Platform Chat Messages Variable (`$platformChatMessages`) - Get chat message count
- [Override certain built-in Firebot variables](/doc/variable-override.md) - Option to make certain Firebot variables platform-aware (_EXPERIMENTAL_)
- [Platform-Aware Chat Effect](/doc/effects/chat-platform.md) - Send messages to specific platforms or all platforms
- Update Platform User Currency Effect - Update currency for Twitch, Kick, and YouTube users
- Set Platform User Metadata Effect - Save metadata associated to a user on Twitch, Kick, or YouTube
- Remove Platform User Metadata Effect - Remove a metadata key from a user on Twitch, Kick, or YouTube
- Increment Platform User Metadata Effect - Increment a numeric metadata value for a user on Twitch, Kick, or YouTube
- Platform Condition - Conditional logic based on platform
- Platform Filter - Filter events by platform
- Platform Restriction - Restrict effects to specific platforms

## Documentation

Requires Firebot 5.65 or 5.66.

- [Installation](/doc/installation.md)
- [Upgrading](/doc/upgrading.md)
- [Variable Override](/doc/variable-override.md) - Experimental feature to override built-in Firebot variables
- [Chat (Multi-Platform) effect](/doc/effects/chat-platform.md)

## Supported Platforms

| Platform | Support | Required Integration | Min Version |
| ---------- | --------- | --------------------- | ------------- |
| Twitch | ✓ Built-in | None | N/A |
| Kick | ✓ Via Integration | [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) | 0.11.0+ |
| YouTube | ✓ Via Integration | [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) | 0.0.4+ |

:bulb: This library adds _no useful functionality_ without at least one of the non-Twitch integrations noted above.

## Archive Notice

This plugin is not compatible with Firebot 5.67 and higher due to backend infrastructure changes. The plugin will no longer be updated.

If you are running Firebot 5.67 or higher, this plugin may not work correctly. Your options are:

1. Downgrade to Firebot 5.66. Be sure to disable automatic upgrades and manually install the latest Firebot 5.66 release. Note that you will not get new Firebot features and will no longer receive support from official Firebot channels.
2. Uninstall this plugin.

## License

This plugin is released under the [GNU General Public License version 3](/LICENSE). That makes it free to use whether your stream is monetized or not.

If you use this on your stream, I would appreciate a shout-out. (Appreciated, but not required.)

- <https://www.twitch.tv/thestaticmage>
- <https://kick.com/thestaticmage>
- <https://youtube.com/@thestaticmagerisk>

Some code in this project is based on Firebot source code, which is also licensed under GNU GPL 3.
