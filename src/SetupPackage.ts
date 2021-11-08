import simpleGit, { SimpleGit } from 'simple-git';

import fs from 'fs';
import path from 'path';
import { inc as semverInc } from 'semver';

const git: SimpleGit = simpleGit();

// DO NOT DELETE THIS FILE
// This file is used by build system to build a clean npm package with the compiled js files in the root of the package.
// It will not be included in the npm package.

async function calculateVersionNumber() {
    const gitDescribeVersion = await git.raw('describe', '--tags', '--always');
    const split = gitDescribeVersion.split('-');
    if (split.length === 1) {
        return split[0];
    }

    const betaCount = Number(split[1]);
    if (betaCount === undefined) {
        throw new Error(`Cannot convert '${split[1]}' to a number`);
    }
    return `${semverInc(split[0], 'patch')}-beta.${betaCount}`;
}

async function main() {
    console.log('preparing build by cleaning package.json');

    const source = fs.readFileSync(path.join(__dirname, '../package.json')).toString('utf-8');
    const sourceObj = JSON.parse(source);
    sourceObj.scripts = {};
    sourceObj.devDependencies = {};
    if (sourceObj.main.startsWith('dist/')) {
        sourceObj.main = sourceObj.main.slice(5);
    }
    if (sourceObj.types.startsWith('dist/')) {
        sourceObj.types = sourceObj.types.slice(5);
    }

    const version = (await calculateVersionNumber()).trim();
    console.log(`setting version number:${version}`);
    sourceObj.version = version;

    fs.writeFileSync(path.join(__dirname, 'package.json'), Buffer.from(JSON.stringify(sourceObj, null, 2), 'utf-8'));

    fs.copyFileSync(path.join(__dirname, '../.npmignore'), path.join(__dirname, '.npmignore'));
    fs.copyFileSync(path.join(__dirname, '../README.md'), path.join(__dirname, 'README.md'));
}

main();
