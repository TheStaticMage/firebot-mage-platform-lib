# Platform Library User Guide

This guide explains how to use the Platform Library's platform-aware features in your Firebot setup.

## Installation and Setup

### Prerequisites

- Firebot v5 or later
- Platform integrations for the platforms you want to use:
  - Twitch: Built-in (no additional setup required)
  - Kick: Install [Mage Kick Integration](https://github.com/TheStaticMage/firebot-mage-kick-integration) v0.6.0+
  - YouTube: Install [Mage YouTube Integration](https://github.com/TheStaticMage/firebot-mage-youtube-integration) v0.1.0+

### Installation Steps

1. **Download the Platform Library**
   - Go to [Releases](https://github.com/TheStaticMage/firebot-mage-platform-lib/releases)
   - Download the latest `firebot-mage-platform-lib.js` file

2. **Add to Firebot**
   - Open Firebot
   - Go to Settings > Scripts
   - Click "Add New Script"
   - Select the downloaded `firebot-mage-platform-lib.js` file
   - Enable "Run at Startup"
   - Click "Save"

3. **Restart Firebot**
   - Close and reopen Firebot
   - The library will initialize automatically

4. **Verify Installation**
   - Check the Firebot logs for: `Platform Library v1.0.0 initialized successfully`
   - If you see this message, the library is ready to use

## Available Features

### Platform Variable

The `$platform` variable detects which platform triggered an event.

**Returns:**
- `twitch` - Event from Twitch
- `kick` - Event from Kick
- `youtube` - Event from YouTube
- `unknown` - Platform could not be determined

**Examples:**
- In a chat message: `You are using: $platform`
- In a conditional: Check if `$platform` equals `kick`

**Use Cases:**
- Display different messages based on platform
- Create platform-specific commands
- Log which platform users are coming from

### Platform-Aware Chat Effect

Send chat messages to specific platforms based on trigger context.

**How to Use:**

1. Add a "Chat (Platform)" effect to your event/command
2. Configure messages for each platform:
   - **Twitch Message**: Message sent to Twitch chat
   - **Kick Message**: Message sent to Kick chat (if Kick integration installed)
   - **YouTube Message**: Message sent to YouTube chat (if YouTube integration installed)

3. Set when to send for each platform:
   - **Never**: Don't send to this platform
   - **On Trigger**: Send only when this platform triggered the event
   - **Always**: Send to this platform regardless of trigger

4. Enable reply mode (optional):
   - Check "Reply" to reply to the triggering message (if available)
   - Works with chat events that include message IDs

**Examples:**

**Example 1: Platform-Specific Greeting**
```
Trigger: !hello command
Twitch Message: "Hey $user! Welcome from Twitch!"
Kick Message: "Yo $user! You're on Kick!"
YouTube Message: "Hello $user! Thanks for watching on YouTube!"

Twitch Send: On Trigger
Kick Send: On Trigger
YouTube Send: On Trigger
```

**Example 2: Broadcast to All Platforms**
```
Trigger: !announcement command
Twitch Message: "Stream starting in 5 minutes!"
Kick Message: "Stream starting in 5 minutes!"
YouTube Message: "Stream starting in 5 minutes!"

Twitch Send: Always
Kick Send: Always
YouTube Send: Always
```

**Example 3: Kick-Only Message**
```
Trigger: Event from Kick
Twitch Message: (leave blank)
Kick Message: "Thanks for the Kick sub!"
YouTube Message: (leave blank)

Twitch Send: Never
Kick Send: On Trigger
YouTube Send: Never
```

### Platform-Aware User Display Name Variable

Get a user's display name, automatically querying the correct platform.

**Syntax:** `$platformAwareUserDisplayName[username]`

**How It Works:**
1. Detects platform from username format or trigger context
2. Queries the appropriate platform integration for display name
3. Returns the display name or falls back to username

**Username Formats:**
- `user@kick` - Query Kick for this user's display name
- `user@youtube` - Query YouTube for this user's display name
- `user` - Query based on trigger platform

**Examples:**
- `$platformAwareUserDisplayName[$user]` - Get triggering user's display name
- `$platformAwareUserDisplayName[streamer@kick]` - Get Kick user's display name
- Welcome message: `Welcome, $platformAwareUserDisplayName[$user]!`

**Use Cases:**
- Show proper capitalization of usernames
- Display platform-specific user information
- Handle users across multiple platforms

### Platform Filter

Filter events based on which platform triggered them.

**How to Use:**

1. Add Event Source to your event
2. Add "Platform" filter
3. Configure:
   - **Comparison**: "Is" or "Is Not"
   - **Platform**: Select platform to match

**Platform Options:**
- **Any Platform**: Kick, Twitch, or YouTube
- **Kick**: Only Kick events
- **Twitch**: Only Twitch events
- **YouTube**: Only YouTube events
- **Unknown**: Events where platform couldn't be determined

**Examples:**

**Example 1: Kick-Only Event**
```
Event: Chat Message
Filter: Platform Is Kick
Effect: Send message "Thanks for chatting on Kick!"
```

**Example 2: Non-Twitch Events**
```
Event: Follow
Filter: Platform Is Not Twitch
Effect: Special alert for non-Twitch followers
```

### Platform Condition

Conditional logic based on detected platform.

**How to Use:**

1. Add a Conditional Effects effect
2. Add "Platform" condition
3. Configure:
   - **Comparison**: "Is" or "Is Not"
   - **Platform**: Select platform to match

**Examples:**

**Example 1: Different Rewards by Platform**
```
IF Platform Is Kick
  THEN Give 100 currency
ELSE IF Platform Is YouTube
  THEN Give 150 currency
ELSE
  THEN Give 50 currency
```

**Example 2: Platform-Specific Commands**
```
Command: !subscribe
IF Platform Is Twitch
  THEN Send "Subscribe at twitch.tv/..."
ELSE IF Platform Is Kick
  THEN Send "Subscribe at kick.com/..."
```

### Platform Restriction

Restrict when triggers can activate based on platform.

**How to Use:**

1. Add a restriction to your command/event/button
2. Select "Platform" restriction type
3. Configure:
   - **Comparison**: "Is" or "Is Not"
   - **Platform**: Select platform

**Examples:**

**Example 1: Twitch-Only Command**
```
Command: !twitchsub
Restriction: Platform Is Twitch
(Command only works when triggered from Twitch)
```

**Example 2: Multi-Platform Command**
```
Command: !hello
Restriction: Platform Is Not Unknown
(Command works on Kick, Twitch, or YouTube, but not when platform is unknown)
```

## Common Workflows

### Multi-Platform Welcome Message

```
Trigger: Chat Message event
Filter: First-time chatter
Effect 1: Chat (Platform) effect
  - Twitch: "Welcome to the Twitch stream, $user!"
  - Kick: "Welcome to the Kick stream, $user!"
  - YouTube: "Welcome to the YouTube stream, $user!"
  - All set to "On Trigger"
```

### Cross-Platform Currency

```
Trigger: !points command
Effect: Conditional Effects
  IF Platform Is Kick
    Show Custom Variable $kickPoints
  ELSE IF Platform Is YouTube  
    Show Custom Variable $youtubePoints
  ELSE
    Show Custom Variable $twitchPoints
```

### Platform-Specific Alerts

```
Trigger: Follow event
Effect 1: Conditional Effects
  IF Platform Is Kick
    Play Sound: kick-follow.mp3
    Show Image: kick-alert.png
  ELSE IF Platform Is YouTube
    Play Sound: youtube-sub.mp3
    Show Image: youtube-alert.png
  ELSE
    Play Sound: twitch-follow.mp3
    Show Image: twitch-alert.png
```

## Troubleshooting

### Platform Always Shows "unknown"

**Possible Causes:**
- Trigger doesn't have platform metadata (manual triggers, timers, etc.)
- Integration not registered with Platform Library
- Event format doesn't match detection patterns

**Solutions:**
1. Check that platform integrations are installed and running
2. Enable debug mode in Platform Library to see detection logs
3. Verify event has username/userId in expected format

### Platform-Aware Chat Not Sending

**Possible Causes:**
- Integration not installed for target platform
- "Send" option set to "Never"
- Message field is blank

**Solutions:**
1. Verify required integration is installed (Kick/YouTube)
2. Check "Send" dropdown is set to "On Trigger" or "Always"
3. Enter a message for the platform
4. Check Firebot logs for dispatch errors

### Display Name Returns Null

**Possible Causes:**
- User doesn't exist on the platform
- Integration not connected/authenticated
- Username format incorrect

**Solutions:**
1. Verify integration is connected (check integration settings)
2. Check username format (use `@kick` or `@youtube` suffix if needed)
3. Enable debug logging to see query details

### Effect Doesn't Trigger

**Possible Causes:**
- Platform restriction blocking trigger
- Platform filter removing event
- Integration not detecting platform correctly

**Solutions:**
1. Temporarily remove platform restrictions/filters to test
2. Check logs to see what platform was detected
3. Verify trigger metadata includes platform information

## Debug Mode

Enable debug mode for detailed logging:

1. Go to Settings > Scripts
2. Find "Platform Library" in the list
3. Click the settings icon
4. Enable "Debug Mode"
5. Save and restart Firebot
6. Check logs for detailed platform detection and dispatch information

Debug logs show:
- Platform detection results
- Integration registration status
- Operation dispatch calls
- Available platforms query results

## Best Practices

1. **Test Each Platform**: Verify features work on all platforms you support
2. **Provide Fallbacks**: Use "Unknown" platform handling for edge cases
3. **Clear Messaging**: Make platform-specific messages distinct and appropriate
4. **Use Restrictions Wisely**: Prefer filters/conditions over restrictions when possible
5. **Monitor Logs**: Check for errors when setting up platform features

## Getting Help

If you encounter issues:

1. Enable debug mode and check logs
2. Verify all integrations are up to date
3. Check the [GitHub Issues](https://github.com/TheStaticMage/firebot-mage-platform-lib/issues)
4. Review the [API Documentation](api.md) for advanced usage
