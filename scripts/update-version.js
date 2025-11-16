/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/**
 *  Updates PLATFORM_LIB_VERSION to match package.json version
 */
const fs = require('fs').promises;
const path = require('path');

const main = async () => {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const version = packageJson.version;

    console.log(`Current version: ${version}`);

    const versionFilePath = path.resolve('./packages/client/src/version.ts');

    const updatePlatformVersion = async (filePath, version) => {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const updatedContent = fileContent.replace(
            /export const PLATFORM_LIB_VERSION = ".*?";/,
            `export const PLATFORM_LIB_VERSION = "${version}";`
        );
        await fs.writeFile(filePath, updatedContent, 'utf8');
    };

    await updatePlatformVersion(versionFilePath, version);
    console.log(`Successfully updated PLATFORM_LIB_VERSION in ${versionFilePath}.`);
};

main();
