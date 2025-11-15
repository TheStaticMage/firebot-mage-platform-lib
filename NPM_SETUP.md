# NPM Package Publishing Setup

This document explains how to set up and use the automated NPM package publishing for the `@mage-platform-lib/client` package.

## Overview

The repository is configured to automatically publish the `@mage-platform-lib/client` package to **GitHub Packages** (not npmjs.com). This means:

- No NPM account required
- Uses your existing GitHub credentials
- Package is hosted on GitHub alongside the code

## Publishing Workflows

### 1. Automatic Publishing on Push (Development Versions)

**When:** Every push to the `main` branch
**Version Format:** `<version>-sha.<git-sha>` (e.g., `1.0.0-sha.abc1234`)
**Workflow:** `.github/workflows/publish-npm-push.yml`

This creates development/pre-release versions with the git commit SHA appended to help track which commit a package came from.

### 2. Publishing on Release (Stable Versions)

**When:** A GitHub release is created
**Version Format:** Same as package.json version (e.g., `1.0.0`)
**Workflow:** `.github/workflows/publish-npm-release.yml`

This publishes stable versions that match your package.json version. The workflow verifies that the release tag matches the version in `packages/client/package.json`.

## GitHub Repository Configuration

### Required: Enable GitHub Packages Write Permissions

The workflows use the default `GITHUB_TOKEN` which should have the necessary permissions. To verify:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Actions** > **General**
3. Scroll to **Workflow permissions**
4. Ensure **Read and write permissions** is selected
5. Save if you made any changes

### That's It!

No additional configuration or secrets are needed. The workflows will automatically publish to GitHub Packages using the `GITHUB_TOKEN`.

## Using the Published Package

### Installing from GitHub Packages

To install the package in another project, users need to:

1. **Generate a GitHub Personal Access Token (PAT)**:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "NPM Package Access")
   - Select the `read:packages` scope
   - Click "Generate token"
   - Copy the token and save it securely

2. **Set the token as an environment variable**:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export GITHUB_TOKEN=your_github_personal_access_token

# Or for the current session only
export GITHUB_TOKEN=your_github_personal_access_token
```

3. **Create a `.npmrc` file** in the project root (or user home directory):

```
@mage-platform-lib:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Note:** The `.npmrc` file references the environment variable using `${GITHUB_TOKEN}`. Never hardcode your token directly in `.npmrc` as this is a security risk if the file is committed to version control.

4. **Install the package**:

```bash
# Install a specific stable version
npm install @mage-platform-lib/client@1.0.0

# Install the latest stable version
npm install @mage-platform-lib/client

# Install a development version with git SHA
npm install @mage-platform-lib/client@1.0.0-sha.abc1234
```

### Alternative: Using .npmrc in CI/CD

For CI/CD environments (like GitHub Actions), you can create the `.npmrc` file dynamically:

```yaml
- name: Setup .npmrc
  run: |
    echo "@mage-platform-lib:registry=https://npm.pkg.github.com" >> .npmrc
    echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> .npmrc
```

## Viewing Published Packages

To see all published versions:

1. Go to your GitHub repository
2. Click on **Packages** in the right sidebar
3. Select `@mage-platform-lib/client`
4. View all published versions and download statistics

## Creating a Release

To publish a stable version:

1. Update the version in `packages/client/package.json` (e.g., to `1.0.1`)
2. Update the version constant in `packages/client/src/version.ts` to match
3. Commit and push to `main`
4. Go to GitHub > Releases > "Draft a new release"
5. Create a tag matching the version (e.g., `v1.0.1`)
6. Fill in release notes
7. Click "Publish release"

The workflow will automatically:
- Verify the tag matches the package version
- Build the client package
- Publish to GitHub Packages with the stable version number

## Troubleshooting

### "Permission denied" or "403 Forbidden" errors

Check that:
- Workflow permissions are set to "Read and write" (see above)
- The package name in `packages/client/package.json` matches the GitHub org/user (@mage-platform-lib)
- The repository URL in `packages/client/package.json` is correct

### Version already exists

GitHub Packages does not allow overwriting published versions. You must:
- Increment the version number in `packages/client/package.json`
- Create a new release with the new version tag

### Installation fails for users

Ensure they have:
- Created a `.npmrc` file with the GitHub Packages registry
- Generated a GitHub Personal Access Token with `read:packages` scope
- Added the token to their `.npmrc` or environment variables

## Optional: Publishing to npmjs.com

If you want to publish to the public NPM registry instead of GitHub Packages:

1. Create an account at https://www.npmjs.com/
2. Generate an NPM access token (Account Settings > Access Tokens)
3. Add the token as a repository secret: `Settings > Secrets > Actions > New repository secret`
   - Name: `NPM_TOKEN`
   - Value: Your NPM access token
4. Update the workflows to use `registry-url: 'https://registry.npmjs.org'`
5. Remove the `publishConfig` from `packages/client/package.json` or change it to npmjs.org
6. Update the `NODE_AUTH_TOKEN` to use `${{ secrets.NPM_TOKEN }}`

## Package Name Note

The package has been renamed from `@mage-platform-lib/types` to `@mage-platform-lib/client` to better reflect that it's a client library containing types and utilities for integrations.
