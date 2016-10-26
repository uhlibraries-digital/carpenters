const argv = require('minimist')(process.argv.slice(2), { boolean: ['v'] });
const pkg = require('../package.json');
const packager = require('electron-packager');
const denodeify = require('denodeify');
const path = require('path'), join = path.join;
const lodash = require('lodash'), escapeRegExp = lodash.escapeRegExp;
const fs = require('fs'), readdirSync = fs.readdirSync, unlinkSync = fs.unlinkSync;
const renameSync = fs.renameSync;
const rimraf = require('rimraf');

const ROOT_PATH = join(__dirname, '..');
const BUILD_PATH = join(ROOT_PATH, 'bin');
const TMP_PATH = join(ROOT_PATH, '.tmp');
const CACHE_PATH = join(TMP_PATH, 'cache');
const RESOURCES_PATH = join(ROOT_PATH, 'resources');

/**
 * Ignore files for packager.
 */
function ignoreBuildFiles() {
  const include = [
    'node_modules',
    'package.json'
  ];

  const exclude = [
    'node_modules/.bin($|/)',
    'electron-prebuild($|/)',
    'bin($|/)',
    '\.tmp($|/)',
    'typings($|/)',
    'tsconfig.json',
    'webpack.config.js'
  ];

  const autoExcluded = readdirSync(ROOT_PATH)
    .filter(function(filename) {
      return !~include.indexOf(filename);
    }).map(function(filename) {
      return '^' + escapeRegExp(filename) + '($|/)';
    });

  const devExcluded = Object.keys(pkg.devDependencies).map(function(item){
    return '^' + escapeRegExp('node_modules/' + item) + '($|/)';
  });

  return exclude.concat(autoExcluded, devExcluded);
}

/**
 * Cross platform options for electron-packager
 */
const ELECTRON_PACKAGER_OPTS = {
  name: pkg.productName,
  'app-version': pkg.version,
  'app-bundle-id': pkg.appBundleId,
  'helper-bundle-id': pkg.helperBundleId,
  //version: pkg.devDependencies['electron-prebuilt'].replace('^', ''),
  asar: true,
  prune: true,
  overwrite: true,
  dir: '.',
  out: BUILD_PATH,
  'download.cache': CACHE_PATH,
  ignore: ignoreBuildFiles()
};

/**
 * Supported platforms and platform specific options
 */
const TASKS = [
  { platform: 'darwin', arch: 'x64', icon: 'app-icon.icns' },
  { platform: 'linux', arch: 'x64', icon: 'app-icon.png' },
  { platform: 'win32', arch: 'x64', icon: 'app-icon.ico' },
].map(function(item) {
  return Object.assign(
    item,
    ELECTRON_PACKAGER_OPTS,
    { icon: join(RESOURCES_PATH, item.icon) }
  );
}).filter(function(task) {
  return ( argv.platform && ( argv.platform === 'all' || argv.platform === task.platform ) );
});

/**
 * Package electron app through electron-packager
 */
async function packElectronApp(opts) {
  return denodeify(packager).call(packager, opts).then(postPack);
}

function postPack(appPaths) {
  var appPath = appPaths.toString();
  var dir = appPath.split('/').slice(-1);
  var binDir = appPath.split('/').slice(0,-1).join('/');
  var platform = dir.toString().split('-')[1];

  if( platform === 'darwin' ) {
    platform = 'macos';
  }
  if ( platform === 'win32' ) {
    platform = 'win';
  }

  unlinkSync(appPath + '/LICENSE');
  unlinkSync(appPath + '/LICENSES.chromium.html');
  unlinkSync(appPath + '/version');

  var newName = binDir + '/' + pkg.productName + '-' + platform + '-' + pkg.version;

  rimraf(newName, function(err){
    if (err) {
      throw err;
    }
    renameSync(appPath, newName);
  });
}

/**
 * Start the build process
 */
(async function startPack() {
  try{
    for (var task of TASKS) {
      await packElectronApp(task);
    }
  } catch (err) {
    console.log("ERROR ", err.stack || err);
    process.exit();
  }
})();
