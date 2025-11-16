
# Firebot Platform Library

## Instructions

- Summarize completed tasks in ≤3 sentences.
- Update this file for major features, patterns, milestones, or testing strategies.
- Avoid detailed summaries or new markdown files unless requested.
- **Git commits**: Do NOT create commits when running locally. (OK for Claude Code Web.)

## Features

- Common platform-aware effects, variables, and filters for Kick/YouTube integrations.
- Dispatches to Kick, YouTube, or Twitch handlers as needed.
- Reflector IPC facility for backend/frontend communication.
- Checks manifest for integration installation; exposes features accordingly.
- Reusable utilities in client library: script version loader, reflector factory.

## Reusable Utilities

The client library (`@thestaticmage/mage-platform-lib-client`) exports reusable functions for integrations:

- **`loadScriptVersion()`**: Extract version info from bundled Firebot scripts
- **`createReflector()`**: Factory for creating custom IPC reflectors with configurable names
- **`initializeReflector()`**: Convenience function combining reflector registration and initialization
- **`createErrorModal()`**: Factory for creating custom error dialogs
- **`initializeErrorModal()`**: Convenience function for error modal setup
- **`getStartupScripts()`**: Retrieve list of Firebot startup scripts (manages own reflector singleton)

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for full documentation and examples.

## Tech Stack

- TypeScript
- Jest

## Conventions

- TypeScript: camelCase, PascalCase classes, follow package eslint rules.
- "YouTube": Capitalize as "YouTube" (or "youTube" in variable names/functions).
- Logging: Use `logger.debug` for observability.
- Documentation: Markdown in `docs/`, referenced from `README.md`, follows markdownlint.
- No emojis in code/logs; use GitHub markdown emojis in docs only.
- No emdashes anywhere.
- Comments: Explain "why" or section headers; avoid obvious/removed-only comments.
- Remove code completely when instructed; ignore backward compatibility unless specified.
- Effects: Test only `onTrigger` method.
- Events: Use enums for event constants.
- Variables: Test only `evaluator` method; priority: argument → event metadata → integration state. Include examples array.

## IPC Architecture

**CRITICAL**: The platform library runs as a backend script and only has access to `frontendCommunicator`, NOT `backendCommunicator`.

- Backend scripts (like platform library): Use `modules.frontendCommunicator` to set up handlers with `.on()` and communicate with frontend.
- Frontend (Angular UI): Use `backendCommunicator` to call backend handlers.
- Frontend reflector: Uses `frontendCommunicator.on()` to listen in the frontend and `frontendCommunicator.fireEventAsync()` to forward to backend.
- Backend-to-backend: Must be reflected through frontend using the reflector pattern.
- Effect option controllers: Run in Angular frontend, so they DO have access to `backendCommunicator`.

**When to Use IPC vs Direct Access:**

- Use IPC only if necessary: communicating with Firebot methods not exposed via `RunRequest` or communicating with other integrations.
- Prefer direct access: When data is available through `RunRequest` (e.g., `scriptDataDir`), use it directly instead of IPC round-trips.
- Example: `IntegrationDetector.loadScriptVersion()` uses direct `require()` loading via `scriptDataDir` instead of IPC to `frontendCommunicator.fireEventAsync()`.

**Firebot Modifications:**

- NEVER modify Firebot code unless explicitly discussed and approved. Platform library must work with Firebot as-is.
- Exception: If Firebot changes are necessary, document the change and PR requirement in this file.

## Testing

- Unit tests: Use Jest, place in `__tests__` under function location.
- Tests must call actual functions/methods; avoid pure mock/property tests.
- Add `/* eslint-disable @typescript-eslint/unbound-method */` only if linter requires.
- Coverage strategy: Isolated unit, edge cases, multi-app scenarios, functional tests.
- Remove the "smoke test" when any real test is added. (And remove this instruction when the smoke test is removed.)

## Development Checklist

- Run `npx eslint src/ --max-warnings 0` after changes to verify lint.
- Run `npm run build:dev` after major changes to verify compilation.
- Run `npx jest` after changes to verify main tests.
- Run `npm test` in `packages/client` directory after changes to verify client library tests.

## Integration Locations

- Kick:
  - Local: `../firebot-mage-kick-integration`
  - Repo: <https://github.com/TheStaticMage/firebot-mage-kick-integration>
- YouTube:
  - Local: `../firebot-mage-youtube-integration`
  - Repo: <https://github.com/TheStaticMage/firebot-mage-youtube-integration>
- Firebot:
  - Local: `../Firebot`
  - Repo: <https://github.com/crowbartools/firebot>
  - Note: ALWAYS use the 'v5' branch of the Firebot repo
