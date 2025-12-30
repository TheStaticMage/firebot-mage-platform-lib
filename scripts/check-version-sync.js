/**
 * Validates that all version sources match the root package.json version.
 */
const fs = require('fs').promises;
const path = require('path');

const readJson = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to parse JSON in ${filePath}: ${error.message}`);
    }
};

const readPlatformLibVersion = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/export const PLATFORM_LIB_VERSION = "([^"]+)";/);

    if (!match) {
        throw new Error(`Could not find PLATFORM_LIB_VERSION in ${filePath}.`);
    }

    return match[1];
};

const main = async () => {
    const rootPackagePath = path.resolve(__dirname, '../package.json');
    const clientPackagePath = path.resolve(__dirname, '../packages/client/package.json');
    const clientLockPath = path.resolve(__dirname, '../packages/client/package-lock.json');
    const versionFilePath = path.resolve(__dirname, '../packages/client/src/version.ts');

    const rootPackage = await readJson(rootPackagePath);
    const clientPackage = await readJson(clientPackagePath);
    const clientLock = await readJson(clientLockPath);
    const platformLibVersion = await readPlatformLibVersion(versionFilePath);

    const rootVersion = rootPackage.version;
    if (!rootVersion) {
        throw new Error(`Missing version in ${rootPackagePath}.`);
    }

    const clientPackageVersion = clientPackage.version;
    if (!clientPackageVersion) {
        throw new Error(`Missing version in ${clientPackagePath}.`);
    }

    const clientLockVersion = clientLock.version;
    const clientLockRootVersion = clientLock?.packages?.['']?.version;
    if (!clientLockVersion || !clientLockRootVersion) {
        throw new Error(`Missing version data in ${clientLockPath}.`);
    }

    const mismatches = [];

    if (clientPackageVersion !== rootVersion) {
        mismatches.push(
            `packages/client/package.json version ${clientPackageVersion} does not match root version ${rootVersion}.`
        );
    }

    if (clientLockVersion !== rootVersion) {
        mismatches.push(
            `packages/client/package-lock.json top-level version ${clientLockVersion} does not match root version ${rootVersion}.`
        );
    }

    if (clientLockRootVersion !== rootVersion) {
        mismatches.push(
            `packages/client/package-lock.json packages[\"\"] version ${clientLockRootVersion} does not match root version ${rootVersion}.`
        );
    }

    if (platformLibVersion !== rootVersion) {
        mismatches.push(
            `packages/client/src/version.ts PLATFORM_LIB_VERSION ${platformLibVersion} does not match root version ${rootVersion}.`
        );
    }

    if (mismatches.length > 0) {
        console.error('Version sync check failed:');
        mismatches.forEach((message) => console.error(message));
        process.exit(1);
    }

    console.log(`Version sync check passed for ${rootVersion}.`);
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
