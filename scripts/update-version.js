/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/**
 * Updates platform library version artifacts to match root package.json.
 */
const fs = require('fs').promises;
const path = require('path');

const replaceInFile = async (filePath, replaceFn) => {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const result = replaceFn(fileContent);

    if (!result.replaced) {
        throw new Error(`No matching version fields found in ${filePath}.`);
    }

    if (result.content !== fileContent) {
        await fs.writeFile(filePath, result.content, 'utf8');
    }
};

const updatePlatformVersion = async (filePath, version) => {
    await replaceInFile(filePath, (content) => {
        const versionRegex = /export const PLATFORM_LIB_VERSION = ".*?";/;
        const replaced = versionRegex.test(content);
        const updatedContent = content.replace(
            versionRegex,
            `export const PLATFORM_LIB_VERSION = "${version}";`
        );

        return { content: updatedContent, replaced };
    });

    console.log(`Updated PLATFORM_LIB_VERSION in ${filePath}.`);
};

const updatePackageJsonVersion = async (filePath, version) => {
    await replaceInFile(filePath, (content) => {
        const versionRegex = /"version"\s*:\s*".*?"/;
        const replaced = versionRegex.test(content);
        const updatedContent = content.replace(
            versionRegex,
            `"version": "${version}"`
        );

        return { content: updatedContent, replaced };
    });

    console.log(`Updated version in ${filePath}.`);
};

const updatePackageLockVersion = async (filePath, version) => {
    await replaceInFile(filePath, (content) => {
        let updatedContent = content;
        const topLevelRegex = /"version"\s*:\s*".*?"/;
        const rootPackageRegex =
            /("packages"\s*:\s*{\s*""\s*:\s*{[\s\S]*?)"version"\s*:\s*".*?"/;

        const hasTopLevel = topLevelRegex.test(updatedContent);
        if (hasTopLevel) {
            updatedContent = updatedContent.replace(
                topLevelRegex,
                `"version": "${version}"`
            );
        }

        const hasRootPackage = rootPackageRegex.test(updatedContent);
        if (hasRootPackage) {
            updatedContent = updatedContent.replace(
                rootPackageRegex,
                `$1"version": "${version}"`
            );
        }

        return { content: updatedContent, replaced: hasTopLevel && hasRootPackage };
    });

    console.log(`Updated version in ${filePath}.`);
};

const main = async () => {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const version = packageJson.version;

    console.log(`Current version: ${version}`);

    const versionFilePath = path.resolve('./packages/client/src/version.ts');
    const clientPackageJsonPath = path.resolve('./packages/client/package.json');
    const clientPackageLockPath = path.resolve('./packages/client/package-lock.json');

    await updatePlatformVersion(versionFilePath, version);
    await updatePackageJsonVersion(clientPackageJsonPath, version);
    await updatePackageLockVersion(clientPackageLockPath, version);

    console.log('Successfully updated version sync targets.');
};

main();
