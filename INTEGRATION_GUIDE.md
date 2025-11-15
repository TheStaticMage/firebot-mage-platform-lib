# Reusable Utilities for Platform Integrations

This guide documents the reusable utilities available in `@thestaticmage/mage-platform-lib-client` that simplify platform integration development.

## Overview

The client library provides four main utilities to reduce boilerplate code in your integrations:

1. **Script Version Loader** - Determines the version of installed startup scripts
2. **Reflector Factory** - Creates a custom reflector for IPC communication between backend and frontend
3. **Error Modal Factory** - Creates custom error dialogs for displaying messages to users
4. **Startup Scripts Loader** - Retrieves the list of Firebot startup scripts (manages its own reflector singleton)

## Script Version Loader

### Purpose

The script version loader extracts version information from bundled Firebot scripts. This is useful when your integration needs to detect which version of another script (like the Platform Library) is installed.

### API

```typescript
function loadScriptVersion(
    scriptName: string,
    scriptDataDir: string | undefined,
    modules: ScriptModules | undefined,
    debugLogger?: { debug: (msg: string) => void }
): string | undefined
```

### Parameters

- **scriptName** - Name of the script file to load (e.g., `firebot-mage-platform-lib.js`)
- **scriptDataDir** - Path to script data directory from `RunRequest.scriptDataDir`
- **modules** - ScriptModules from `RunRequest.modules`
- **debugLogger** - Optional logger for debug output

### Returns

Version string if found, `undefined` otherwise.

### Example

```typescript
import { loadScriptVersion } from '@thestaticmage/mage-platform-lib-client';

export default {
    run: async (runRequest) => {
        const { modules, scriptDataDir } = runRequest;

        const platformLibVersion = loadScriptVersion(
            'firebot-mage-platform-lib.js',
            scriptDataDir,
            modules,
            { debug: (msg) => console.log(`[MyIntegration] ${msg}`) }
        );

        if (!platformLibVersion) {
            console.error('Platform Library not found');
            return;
        }

        console.log(`Platform Library version: ${platformLibVersion}`);
    }
};
```

### How It Works

The function reads bundled webpack script files from disk and uses `eval()` to execute them, extracting the `getScriptManifest()` function to get version information. This workaround is necessary because Firebot doesn't expose version information through its public APIs.

## Error Modal Factory

### Purpose

The error modal factory creates custom error dialogs that your integration can display to users. This is useful for showing initialization errors, configuration problems, or other issues that require user attention.

### API

```typescript
function createErrorModal(config: ErrorModalConfig): {
    extension: UIExtension;
    waitForErrorModal: (modules: ScriptModules, timeoutMs?: number) => Promise<void>;
    showErrorModal: (title: string, message: string) => Promise<void>;
}
```

```typescript
async function initializeErrorModal(
    modalName: string,
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<void>
```

### Configuration

```typescript
interface ErrorModalConfig {
    modalName: string;  // Prefix for all IPC events (e.g., "my-integration")
    logger?: {
        debug: (msg: string) => void;
        error: (msg: string) => void;
    };
}
```

### Basic Example

```typescript
import { initializeErrorModal, createErrorModal } from '@thestaticmage/mage-platform-lib-client';

export default {
    run: async (runRequest) => {
        const { modules } = runRequest;

        // Initialize error modal
        await initializeErrorModal('my-integration', modules);

        // Show an error
        const { showErrorModal } = createErrorModal({ modalName: 'my-integration' });
        await showErrorModal('Configuration Error', 'Missing required settings');
    }
};
```

### Features

- **HTML Support**: Messages can include HTML formatting and tags
- **Custom Titles**: Each modal can have a custom title
- **Modal Dialog**: Displays as a centered modal dialog with OK button
- **Async Safe**: Works safely with async operations
- **Error Recovery**: Gracefully handles frontend initialization timeouts

### Important: Listener Accumulation

Each call to `createErrorModal()` registers event listeners in the frontend. If you call `createErrorModal()` multiple times, these listeners will accumulate, which can cause memory leaks.

**Best Practice**: Initialize the error modal once during startup and reuse the `showErrorModal` function:

```typescript
import { initializeErrorModal, createErrorModal } from '@thestaticmage/mage-platform-lib-client';

export default {
    run: async (runRequest) => {
        const { modules } = runRequest;

        // Initialize once
        await initializeErrorModal('my-integration', modules);

        // Create once and store for reuse
        const errorModalFactory = createErrorModal({ modalName: 'my-integration' });
        const { showErrorModal } = errorModalFactory;

        // Reuse the same showErrorModal function throughout your script
        await showErrorModal('Error 1', 'First error');
        await showErrorModal('Error 2', 'Second error');
    }
};
```

Do NOT call `createErrorModal()` in loops or repeatedly within event handlers, as this will accumulate listeners over time.

### How It Works

The error modal factory:

1. Creates an Angular factory that registers a custom modal template
2. Registers the template with AngularJS $templateCache
3. Listens for backend events to trigger modal display
4. Signals when ready through a frontend event
5. Displays modals when backend requests them

The modal template includes:
- Header with icon and title
- Body for HTML content
- Footer with OK button

## Reflector Factory

### Purpose

The reflector factory creates a reusable IPC communication pattern that allows your backend script to call frontend handlers and receive responses. This is the foundation for cross-platform communication.

### API

```typescript
function createReflector(config: ReflectorConfig): {
    extension: UIExtension;
    waitForReflector: (modules: ScriptModules, timeoutMs?: number) => Promise<void>;
    reflectEvent: <T>(eventName: string, eventData: any, isAsync?: boolean) => Promise<T>;
}
```

```typescript
async function initializeReflector(
    reflectorName: string,
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<void>
```

### Configuration

```typescript
interface ReflectorConfig {
    reflectorName: string;  // Prefix for all IPC events (e.g., "my-integration")
    logger?: {
        debug: (msg: string) => void;
        error: (msg: string) => void;
    };
}
```

### Returns from createReflector

- **extension** - UIExtension to register with `uiExtensionManager`
- **waitForReflector** - Wait for the reflector frontend component to initialize
- **reflectEvent** - Send a reflected event to the frontend and get a response

### Basic Example

```typescript
import { createReflector } from '@thestaticmage/mage-platform-lib-client';

const { extension, waitForReflector, reflectEvent } = createReflector({
    reflectorName: 'my-integration',
    logger: { debug: (msg) => console.log(`[MyIntegration] ${msg}`) }
});

export default {
    run: async (runRequest) => {
        const { modules } = runRequest;

        // 1. Register the reflector UI extension
        modules.uiExtensionManager.registerUIExtension(extension);

        // 2. Wait for the reflector to initialize
        await waitForReflector(modules, 5000); // 5 second timeout

        // 3. Use reflectEvent to call frontend handlers
        const result = await reflectEvent('my-backend-event', { data: 'test' });
        console.log('Response:', result);
    }
};
```

### Convenience Function Example

For most use cases, use `initializeReflector` which combines the three steps:

```typescript
import { initializeReflector } from '@thestaticmage/mage-platform-lib-client';

export default {
    run: async (runRequest) => {
        const { modules } = runRequest;
        const logger = createLogger();

        // Initialize reflector (registers extension and waits for ready)
        await initializeReflector('my-integration', modules, logger);

        // Now you can use reflectEvent...
    }
};
```

### How It Works

The reflector creates a bidirectional communication channel:

1. **Backend** sends events through `frontendCommunicator.send()`
2. **Frontend** (registered as a UI extension) receives events through `backendCommunicator.onAsync()`
3. **Frontend** forwards the event to `backendCommunicator.fireEventAsync()` to reach the actual backend handler
4. **Response** is sent back to backend through a response event with a unique ID
5. **Timeout** (10 seconds) prevents hanging if frontend doesn't respond

### Event Naming Convention

When you create a reflector with name `"my-integration"`, the following event names are used internally:

- `my-integration:reflect-sync` - Main event channel (used internally)
- `my-integration:reflect-response:{id}` - Response from frontend (used internally)
- `my-integration:reflect-error:{id}` - Error from frontend (used internally)
- `my-integration:reflector-ready` - Signaled when reflector initializes

### IPC Handler Registration

On the backend (in Firebot's main process), you register handlers that the reflector forwards to:

```typescript
// Backend (main Firebot)
backendCommunicator.onAsync('my-event-name', async (data) => {
    // Handle the event
    return { success: true, result: data };
});
```

Then from your integration script, you call it:

```typescript
// Integration script (backend)
const response = await reflectEvent('my-event-name', { /* data */ });
```

### Full Integration Example

```typescript
import {
    initializeReflector,
    loadScriptVersion
} from '@thestaticmage/mage-platform-lib-client';

class Logger {
    constructor(private name: string) {}
    debug(msg: string) { console.log(`[${this.name}] ${msg}`); }
    error(msg: string) { console.error(`[${this.name}] ${msg}`); }
}

const script = {
    getScriptManifest: () => ({
        name: 'My Integration',
        version: '1.0.0',
        author: 'Your Name'
    }),

    run: async (runRequest) => {
        const { modules, scriptDataDir } = runRequest;
        const logger = new Logger('MyIntegration');

        // Check Platform Library version
        const platformLibVersion = loadScriptVersion(
            'firebot-mage-platform-lib.js',
            scriptDataDir,
            modules,
            logger
        );

        if (!platformLibVersion) {
            logger.error('Platform Library is required!');
            return;
        }

        logger.debug(`Platform Library v${platformLibVersion} detected`);

        // Initialize custom reflector for this integration
        await initializeReflector('my-integration', modules, logger, 5000);

        logger.debug('Integration initialized successfully');
    }
};

export default script;
```

## Reflector Event Pattern

When you emit a reflected event, the sequence is:

1. **Backend script** calls `reflectEvent('some-event-name', data)`
2. **Reflector** generates unique ID and sends to frontend with `frontendCommunicator.send()`
3. **Frontend reflector service** receives event via `backendCommunicator.onAsync()`
4. **Frontend** calls `backendCommunicator.fireEventAsync('some-event-name', data)`
5. **Backend handler** (registered elsewhere) processes the request
6. **Response** is sent back through frontend via `backendCommunicator.fireEventAsync('my-integration:reflect-response:{id}', result)`
7. **Backend** receives response and resolves the promise

## Error Handling

Errors from frontend handlers are propagated back to the calling code:

```typescript
try {
    const response = await reflectEvent('my-event', data);
    console.log('Success:', response);
} catch (error) {
    console.error('Failed:', error.message);
}
```

Possible errors:
- **Timeout**: If frontend doesn't respond within 10 seconds
- **Handler error**: If the backend handler throws an exception
- **Not initialized**: If reflector was never initialized with `waitForReflector()`

## Best Practices

1. **Always initialize first** - Call `initializeReflector()` before using `reflectEvent()`
2. **Use reasonable timeouts** - Set `waitForReflector()` timeout based on your needs (default 5s)
3. **Add logging** - Pass a logger to help debug issues
4. **Check versions** - Use `loadScriptVersion()` to verify dependencies
5. **Handle errors** - Always wrap `reflectEvent()` calls in try/catch
6. **Use descriptive names** - Choose reflector names that identify your integration uniquely

## Startup Scripts Loader

### Purpose

The startup scripts loader provides a simple function to retrieve the list of Firebot startup scripts. It manages its own reflector singleton internally, so you don't need to manually create or manage the reflector.

This is useful when your integration needs to discover other installed scripts and their versions.

### API

```typescript
async function getStartupScripts(
    modules: ScriptModules,
    logger?: { debug: (msg: string) => void; error: (msg: string) => void },
    timeoutMs?: number
): Promise<ScriptManifest[]>
```

### Basic Example

```typescript
import { getStartupScripts } from '@thestaticmage/mage-platform-lib-client';

export default {
    run: async (runRequest) => {
        const { modules } = runRequest;

        // Get list of startup scripts
        const scripts = await getStartupScripts(modules);

        for (const script of scripts) {
            console.log(`Script: ${script.name} v${script.version}`);
        }
    }
};
```

### How It Works

The function:

1. **Singleton Reflector**: Creates a reflector on first call, reuses it for all subsequent calls
2. **Automatic Registration**: Automatically registers the reflector UI extension with Firebot
3. **Clean Interface**: Hides all the reflector complexity behind a simple async function
4. **Type Safe**: Returns array of `ScriptManifest` objects with `name`, `version`, `id`, and `scriptName` properties

### Multiple Calls

When you call `getStartupScripts()` multiple times, the same reflector is reused:

```typescript
// First call creates reflector, waits for initialization
const scripts1 = await getStartupScripts(modules);

// Second call reuses the reflector - no extra initialization
const scripts2 = await getStartupScripts(modules);

// Same scripts, faster
```

### Integration Manifest

```typescript
interface ScriptManifest {
    name: string;          // Display name of the script
    version?: string;      // Version from getScriptManifest()
    id?: string;           // Unique script ID
    scriptName?: string;   // Filename of the bundled script
}
```

### Testing

For testing, there's a `resetStartupScriptsReflector()` function that clears the singleton state:

```typescript
import { resetStartupScriptsReflector } from '@thestaticmage/mage-platform-lib-client';

afterEach(() => {
    resetStartupScriptsReflector(); // Clear singleton for next test
});
```

## Migration Guide

If you have existing reflector code, you can migrate to the factory:

### Before

```typescript
// Old reflector code in your integration
const reflectorExtension = { /* ... */ };
const waitForReflector = () => { /* ... */ };
const reflectEvent = async (eventName, data) => { /* ... */ };
```

### After

```typescript
import { createReflector } from '@thestaticmage/mage-platform-lib-client';

const { extension, waitForReflector, reflectEvent } = createReflector({
    reflectorName: 'my-integration'
});

// Use the same way as before, but with less code!
```

## Troubleshooting

### "Reflector did not initialize"

- Ensure `initializeReflector()` is called before `reflectEvent()`
- Check that `uiExtensionManager` is available in modules
- Increase the timeout if Firebot is slow to initialize

### "Reflect event timeout"

- Frontend reflector isn't responding
- Backend handler isn't registered for the event name
- Check browser console (F12) for frontend errors
- Increase the 10-second timeout if needed (edit reflector-factory.ts)

### "Cannot find module '@thestaticmage/mage-platform-lib-client'"

- Ensure you have the package installed: `npm install @thestaticmage/mage-platform-lib-client`
- Check that your integration's package.json includes it as a dependency

## See Also

- [Platform Library README](README.md) - Overview of the Platform Library
- [Firebot Custom Scripts Documentation](https://github.com/crowbartools/firebot/wiki/Custom-Scripts)
