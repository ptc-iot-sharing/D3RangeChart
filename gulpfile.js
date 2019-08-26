const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');
const del = require('del');
const deleteEmpty = require('delete-empty');

const { series, src, dest } = require('gulp');
const zip = require('gulp-zip');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const babel = require('gulp-babel')

const request = require('request');

const packageJson = require('./package.json');

/**
 * Files to remove from the build.
 */
const removeFiles = [];

/**
 * Files from which the typescript definitions are created.
 */
const DTSFiles = [];

/**
 * Command line arguments; the following are supported:
 * * __--p__: Creates a production build that is combined and minified
 * * __--l__: Implies `--p`; builds a library version that can be used outside of thingworx. Incompatible with the upload task. Currently unsupported.
 */
const args = (argList => {
    let arg = {}, a, opt, thisOpt, curOpt;
    for (a = 0; a < argList.length; a++) {
        thisOpt = argList[a].trim();
        opt = thisOpt.replace(/^\-+/, '');
        
        if (opt === thisOpt) {
            // argument value
            if (curOpt) arg[curOpt] = opt;
            curOpt = null;
        }
        else {
            // argument name
            curOpt = opt;
            arg[curOpt] = true;
        }
    }
    return arg;
})(process.argv);

if (args.l) throw new Error('Argument --l is unsupported for this project.');

const outPath = args.l ? 'build' : `build/ui/${packageJson.packageName}`;
const libPath = 'lib';
const packageKind = args.p ? 'min' : 'dev';
const zipName = `${packageJson.packageName}-${packageKind}-${packageJson.version}.zip`;

/**
 * Cleans the build directory.
 */
async function cleanBuildDir(cb) {
    await del('build');
    await del('zip');
    await del('lib');
    
    const paths = outPath.split('/');
    for (let i = 1; i < paths.length; i++) {
        paths[i] = paths[i - 1] + '/' + paths[i];
    }

    for (const path of paths) {
        fs.mkdirSync(path);
    }

    // When building the extension, recreate the zip folder
    await del('zip/**');
    fs.mkdirSync('zip');

    cb();
}

/**
 * Copies files into the build directory.
 */
function copy(cb) {
    src('src/**')
        .pipe(dest(`${outPath}/`))
        .on('end', () => {
            fs.copyFileSync('metadata.xml', 'build/metadata.xml');
            cb();
        });
}

async function prepareBuild(cb) {

    // Remove unneeded files
    if (removeFiles.length) await del(removeFiles.map(f => `${outPath}/${f}`));

    // Copy required dependencies
    for (const dependency in packageJson.dependencies) {
        const dependencyPackageJson = require(`./node_modules/${dependency}/package.json`);
        await new Promise(resolve => src(`node_modules/${dependency}/${dependencyPackageJson.main}`).pipe(dest(outPath)).on('end', resolve));
    }

    await new Promise(resolve => {
        src(`${outPath}/**/*.js`)
            .pipe(babel({plugins: ['remove-import-export']}))
            .pipe(dest(`${outPath}`))
            .on('end', resolve);
    })

    // In production mode, it is needed to minify the files, based on how they are defined in the metadata file
    if (args.p) {
        // When building the extensions, files are to be minimized based on their declaration in the metadata xml
        const metadataFile = await new Promise(resolve => fs.readFile('build/metadata.xml', 'utf8', (err, data) => resolve(data)));

        const metadataXML = await new Promise(resolve => xml2js.parseString(metadataFile, (err, result) => resolve(result)));

        const fileResources = metadataXML.Entities.Widgets[0].Widget[0].UIResources[0].FileResource;

        // Separate the files into groups depending on how they are to be minified
        const fileGroups = [
            {isDevelopment: true, isRuntime: true, extension: 'min'},
            {isDevelopment: false, isRuntime: true, extension: 'runtime'},
            {isDevelopment: true, isRuntime: false, extension: 'ide'}
        ];
        for (const group of fileGroups) {
            group.files = fileResources.filter(resource => {
                const include = (group.isDevelopment ? resource.$.isDevelopment == 'true' : resource.$.isDevelopment != 'true') &&
                    (group.isRuntime ? resource.$.isRuntime == 'true' : resource.$.isRuntime != 'true') && resource.$.type == 'JS' && !!resource.$.file;

                // Ensure that the file exists
                if (include && !fs.existsSync(`${outPath}/${resource.$.file}`)) {
                    console.warn(`Skipping file ${outPath}/${resource.$.file} which does not exist.`);
                    return false;
                }

                return include;
            }).map(r => r.$.file);
        }

        // Rebuild the metadata file with the correct file structure, adding back all URL references and non-JS files
        metadataXML.Entities.Widgets[0].Widget[0].UIResources[0].FileResource = fileResources.filter(resource => {
            return resource.$.type != 'JS' || !resource.$.file;
        });

        // Combine each of the file groups
        for (const group of fileGroups) {
            if (group.files.length) {
                const name = `${packageJson.packageName}.${group.extension}`;
                // If any files belong to this group, combine them
                await new Promise(async resolve => {
                    let stream = src(group.files.map(f => `${outPath}/${f}`));

                    stream.pipe(concat(`${name}.js`))
                        .pipe(terser({compress: true, mangle: {reserved: ['$w','$b','$j','self']}}))
                        .pipe(dest(outPath))
                        .on('end', resolve);
                });

                // Destroy the individual files when building the widget
                await del(group.files.filter(f => f != `${name}.js`).map(f => `${outPath}/${f}`));

                // Reference the file in metadata
                metadataXML.Entities.Widgets[0].Widget[0].UIResources[0].FileResource.push({
                    $: {
                        type: 'JS',
                        file: `${name}.js`,
                        description: '',
                        isDevelopment: group.isDevelopment.toString(),
                        isRuntime: group.isRuntime.toString()
                    }
                });
            }
        }

        // Update the version and update info
        metadataXML.Entities.ExtensionPackages[0].ExtensionPackage[0].$.packageVersion = packageJson.version;
        metadataXML.Entities.ExtensionPackages[0].ExtensionPackage[0].$.buildNumber = JSON.stringify(packageJson.autoUpdate);

        // Write out the updated metadata
        const builder = new xml2js.Builder();
        const outXML = builder.buildObject(metadataXML);

        await new Promise(resolve => fs.writeFile('build/metadata.xml', outXML, resolve));

        // Clean out the empty folder structure
        await deleteEmpty(`${outPath}/`);
    }

    // Create a zip of the build directory
    const zipStream = src('build/**')
        .pipe(zip(zipName))
        .pipe(dest('zip'));

    await new Promise(resolve => zipStream.on('end', resolve));

    cb();
}

async function upload(cb) {
    const host = packageJson.thingworxServer;
    const user = packageJson.thingworxUser;
    const password = packageJson.thingworxPassword;

    return new Promise((resolve, reject) => {
        request.post({
            url: `${host}/Thingworx/Subsystems/PlatformSubsystem/Services/DeleteExtensionPackage`,
            headers: {
                'X-XSRF-TOKEN': 'TWX-XSRF-TOKEN-VALUE',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-THINGWORX-SESSION': 'true'
            },
            body: {packageName: packageJson.packageName},
            json: true
        },
        function (err, httpResponse, body) {
            // load the file from the zip folder
            let formData = {
                file: fs.createReadStream(
                    path.join('zip', zipName)
                )
            };
            // POST request to the ExtensionPackageUploader servlet
            request
                .post(
                    {
                        url: `${host}/Thingworx/ExtensionPackageUploader?purpose=import`,
                        headers: {
                            'X-XSRF-TOKEN': 'TWX-XSRF-TOKEN-VALUE'
                        },
                        formData: formData
                    },
                    function (err, httpResponse, body) {
                        if (err) {
                            console.error("Failed to upload widget to thingworx");
                            reject(err);
                            return;
                        }
                        if (httpResponse.statusCode != 200) {
                            reject(`Failed to upload widget to thingworx. We got status code ${httpResponse.statusCode} (${httpResponse.statusMessage})
                            body:
                            ${httpResponse.body}`);
                        } else {
                            console.log(`Uploaded widget version ${packageJson.version} to Thingworx!`);
                            resolve();
                        }
                    }
                )
                .auth(user, password);

            if (err) {
                console.error("Failed to delete widget from thingworx");
                return;
            }
            if (httpResponse.statusCode != 200) {
                console.log(`Failed to delete widget from thingworx. We got status code ${httpResponse.statusCode} (${httpResponse.statusMessage})
                body:
                ${httpResponse.body}`);
            } else {
                console.log(`Deleted previous version of ${packageJson.packageName} from Thingworx!`);
            }
        })
        .auth(user, password);
    })
}

exports.default = series(cleanBuildDir, copy, prepareBuild);
exports.upload = series(cleanBuildDir, copy, prepareBuild, upload);
