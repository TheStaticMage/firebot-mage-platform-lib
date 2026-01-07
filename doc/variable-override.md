# Variable Override

:warning: **This is an experimental feature.** Use with caution.

## Overview

The Variable Override feature allows the Mage Platform Library to override Firebot's built-in replacement variables with platform-aware versions. This enables variables that normally only work with Twitch to work seamlessly across Twitch, Kick, and YouTube.

## How It Works

This feature leverages a race condition during Firebot's initialization.

In some circumstances:

- Firebot loads the built-in variable
- The Platform Library unregisters the built-in variable
- The Platform Library registers the platform-aware variable with the same handle

In other circumstances:

- The Platform Library registers the platform-aware variable with the same handle
- Firebot encounters an error attempting to register the built-in variable
- Firebot logs a TypeError (expected behavior) and continues

## Expected Behavior

When Variable Override is enabled, you may see TypeError messages in Firebot logs during startup:

```text
TypeError: Cannot register variable 'userDisplayName', it already exists
TypeError: Cannot register variable 'userAvatarUrl', it already exists
...
```

These errors are **expected and do not indicate a problem**. Firebot catches these errors and continues starting normally.

## Overridden Variables

The following Firebot built-in variables are overridden:

| Variable | Original Behavior | Override Behavior |
| --- | --- | --- |
| `$chatMessages` | Twitch-only message count | Platform-aware message count (Twitch, Kick, YouTube) |
| `$currency` | Twitch-only currency | Platform-aware currency (Twitch, Kick, YouTube) |
| `$lastSeen` | Twitch-only last seen date | Platform-aware last seen date (Twitch, Kick, YouTube) |
| `$userAvatarUrl` | Twitch-only avatar URL | Platform-aware avatar URL (Twitch, Kick, YouTube) |
| `$userDisplayName` | Twitch-only display name | Platform-aware display name (Twitch, Kick, YouTube) |
| `$userMetadata` | Twitch-only metadata | Platform-aware metadata (Twitch, Kick, YouTube) |
| `$userProfileImageUrl` | Alias for `$userAvatarUrl` | Alias for `$userAvatarUrl` override |

## Usage

### Backward Compatibility

All existing uses of built-in variables continue to work unchanged:

```text
$chatMessages
$currency[points]
$lastSeen
$userAvatarUrl
$userDisplayName
$userMetadata[username, key]
```

### Platform-Specific Usage

You can optionally specify a platform as the last parameter:

```text
$chatMessages[testuser, kick]
$currency[points, testuser, twitch]
$lastSeen[testuser, kick]
$userAvatarUrl[testuser, youtube]
$userDisplayName[testuser, kick]
$userMetadata[testuser, key, null, null, youtube]
```

### Platform Suffix

You can also specify the platform using a suffix on the username:

```text
$chatMessages[testuser@kick]
$currency[points, testuser@twitch]
$lastSeen[testuser@youtube]
$userAvatarUrl[testuser@youtube]
$userDisplayName[testuser@kick]
$userMetadata[testuser@kick, key]
```

## Enabling Variable Override

1. Go to Settings > Scripts > Manage Startup Scripts in Firebot
2. Find "firebot-mage-platform-lib" in your script list
3. Click Edit button
4. Check **Debug Mode** if needed
5. Check  **Override Built-in Variables** to enable experimental variable override feature
6. Save and restart Firebot

## Disabling Variable Override

Follow steps under [Enabling Variable Override](#enabling-variable-override), except uncheck the **Override Built-in Variables** box. Restart Firebot after selecting options.

## Limitations and Risks

- **Experimental**: This feature is experimental and may change or be removed in future versions.
- **Startup Errors**: TypeError messages in logs during startup are expected but may be confusing.
- **Firebot Updates**: Changes to Firebot's variable registration system or variable implementation could break this feature.
- **Conflicts**: Other plugins that attempt to override built-in variables may conflict.

## Platform-Specific Variables

When Variable Override is enabled, you have access to both:

- **Built-in handles** (e.g., `$userDisplayName`) - Work across all platforms
- **Platform-specific handles** (e.g., `$platformAwareUserDisplayName`) - Explicitly platform-aware

The platform-specific handles provide additional flexibility and are always available regardless of the Variable Override setting.

## Troubleshooting

### Variables Not Working

If variables are not working as expected:

1. Check Firebot logs for the expected TypeError messages during startup
2. Ensure that you have toggled on **Override Built-In Variables** as [documented above](#enabling-variable-override)
3. Ensure that you have restarted Firebot after toggling on **Override Built-In Variables**
4. Enable Debug Mode in Platform Library settings for detailed logging

### TypeError Messages

If you see TypeError messages about variable registration during startup:

- This is **expected behavior** when Variable Override is enabled
- The errors do not indicate a problem
- Firebot continues starting normally after these errors
