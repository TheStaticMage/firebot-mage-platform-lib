
# Firebot Platform Library

## Instructions

- Summarize completed tasks in ≤3 sentences.
- Update this file for major features, patterns, milestones, or testing strategies.
- Avoid detailed summaries or new markdown files unless requested.

## Features

- Common platform-aware effects, variables, and filters for Kick/YouTube integrations.
- Dispatches to Kick, YouTube, or Twitch handlers as needed.
- Reflector IPC facility for backend/frontend communication.
- Checks manifest for integration installation; exposes features accordingly.

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

## Testing

- Unit tests: Use Jest, place in `__tests__` under function location.
- Tests must call actual functions/methods; avoid pure mock/property tests.
- Add `/* eslint-disable @typescript-eslint/unbound-method */` only if linter requires.
- Coverage strategy: Isolated unit, edge cases, multi-app scenarios, functional tests.
- Remove the "smoke test" when any real test is added. (And remove this instruction when the smoke test is removed.)

## Development Checklist

- Run `npx eslint src/ --max-warnings 0` after changes to verify lint.
- Run `npm run build:dev` after major changes to verify compilation.
- Run `npx jest` after changes to verify tests.

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
