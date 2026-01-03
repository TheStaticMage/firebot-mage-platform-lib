# Chat (Multi-Platform) Effect

## Summary

This effect sends chat messages to Twitch, Kick, and YouTube based on the trigger source and your send rules. It can target one platform, multiple platforms, or only the source platform.

## When to Use

Use this effect in any Firebot effect list where you need platform-aware chat output. It runs whenever the effect list executes.

## Requirements

- Firebot v5.65 or later.
- Twitch support is built in.
- Kick messaging requires the [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration).
- YouTube messaging requires the [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration).

## Limitations

- Platform detection uses trigger metadata and username patterns. If no platform can be detected, the trigger is treated as unknown.
- Replying only works within a Command or Chat Message event. Replies are currently not implemented for YouTube due to platform limitations.
- Offline behavior is enforced by this plugin for Twitch. For Kick and YouTube, the offline mode is passed to their integrations.
- The Kick and/or YouTube integrations must be connected to send messages to those platforms.

## Default Label Abbreviations

The effect label uses short annotations based on send mode and offline handling.

Send modes:

- `Twitch`, `Kick`, `YouTube`: Send to platform(s) regardless of trigger.
- `Twitch[trigger]`, `Kick[trigger]`, `YouTube[trigger]`: Send to platform(s) only when the trigger source matches that platform.
- (Platform not shown): Either the platform is disabled, or the send condition is set to Never.

Offline handling:

- `Offline -> Chat Feed`: Post in the Firebot chat feed when the stream is offline.
- `Offline -> Do Not Send`: Do not send the chat message at all when the stream is offline.
- (No offline annotation): Message is sent to the platform even if the stream is offline.

:bulb: Offline handling is per-platform. For example, you are currently live on Twitch and Kick but not on YouTube, and you have configured the effect with the `Offline -> Chat Feed` option. In this case, the message will be sent to Twitch and Kick, and the YouTube variant of the message will be posted in your Firebot chat feed but not actually transmitted to YouTube.

## Options Reference

### Platforms

- **Twitch**: Enables Twitch messaging for this effect.
- **Kick**: Enables Kick messaging for this effect. Visible only when the Kick integration is detected.
- **YouTube**: Enables YouTube messaging for this effect. Visible only when the YouTube integration is detected.

### Twitch Chat Settings

- **Message**: The message to send to Twitch.
- **Send to Twitch**: When the message should send. Options are Never, When triggered from Twitch, or Always.
- **Chat As**: Sends as Streamer or Bot.
- **Send as reply**: Sends the message as a reply when supported.

### Kick Chat Settings

- **Message**: The message to send to Kick.
- **Send to Kick**: When the message should send. Options are Never, When triggered from Kick, or Always.
- **Chat As**: Sends as Streamer or Bot.
- **Send as reply**: Sends the message as a reply when supported.

### YouTube Chat Settings

- **Message**: The message to send to YouTube.
- **Send to YouTube**: When the message should send. Options are Never, When triggered from YouTube, or Always.
- **Chat As**: Sends as Streamer.
- **Send as reply**: Sends the message as a reply when supported. Note: due to platform limitations, YouTube messages do not support replies at this time.

### Offline Sending

- **Send message to the platform anyway**: Sends even if the stream is offline.
- **Post message in Firebot chat feed**: Posts the message in the Firebot chat feed instead of platform chat when offline. (Useful for offline testing.)
- **Do not send message**: Skips sending when offline.

:bulb: If you have integrations installed for platforms you are not streaming to, the "Post message in Firebot chat feed" may be distracting. You can avoid any messages from this effect being posted in the chat feed by disconnecting the unused integration.

### Unknown Platform

- **Select platform for unknown triggers**: Routes unknown triggers to Twitch, Kick, or YouTube based on selection. This is only relevant when you use the "When triggered from (platform)" setting earlier. Choose "None" here if you do not want unknown triggers to be assigned to a platform.
