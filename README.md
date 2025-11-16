# Firebot Multi-Platform Support Library

This is a [Firebot](https://firebot.app) plugin that provides centralized platform-aware functionality for multi-platform streaming integrations. The Platform Library enables seamless cross-platform communication and feature management for Twitch, Kick, and YouTube.

## Features

- Platform Variable (`$platform`) - Detects the platform from event context
- Platform-Aware User Display Name Variable (`$platformAwareUserDisplayName`) - Resolve usernames across platforms
- Platform-Aware Chat Effect - Send messages to specific platforms or all platforms
- Platform Condition - Conditional logic based on platform
- Platform Filter - Filter events by platform
- Platform Restriction - Restrict effects to specific platforms

## Documentation

Requires Firebot v5.65 or later.

- [Installation](/doc/installation.md)
- [Upgrading](/doc/upgrading.md)

## Supported Platforms

| Platform | Support | Required Integration | Min Version |
| ---------- | --------- | --------------------- | ------------- |
| Twitch | ✓ Built-in | None | N/A |
| Kick | ✓ Via Integration | [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) | 0.10.0+ |
| YouTube | :construction: Under Development | [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) | WIP |

:bulb: This library adds _no useful functionality_ without at least one of the non-Twitch integrations noted above.

## Support

The best way to get help is in my Discord server. Join [The Static Discord](https://discord.gg/EnP6JCJQ6n) and visit the `#firebot-mage-platform-lib` channel.

- Please do not DM me on Discord.
- Please do not ask for help in my chat when I am streaming.

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/TheStaticMage/firebot-mage-platform-lib/issues).

## Contributing

Contributions are welcome via [Pull Requests](https://github.com/TheStaticMage/firebot-mage-platform-lib/pulls). I _strongly suggest_ that you contact me before making significant changes. Please refer to the [Contribution Guidelines](/.github/contributing.md) for specifics.

## License

This plugin is released under the [GNU General Public License version 3](/LICENSE). That makes it free to use whether your stream is monetized or not.

If you use this on your stream, I would appreciate a shout-out. (Appreciated, but not required.)

- <https://www.twitch.tv/thestaticmage>
- <https://kick.com/thestaticmage>
- <https://youtube.com/@thestaticmagerisk>

Some code in this project is based on Firebot source code, which is also licensed under GNU GPL 3.
