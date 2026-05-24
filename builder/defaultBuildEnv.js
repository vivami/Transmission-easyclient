const path = require('path');

// BROWSER / MODE are provided via environment variables (set by the npm
// scripts through cross-env). webpack-cli 5 rejects unknown CLI flags, so we
// no longer pass --BROWSER on the command line.
const mode = process.env.MODE || 'development';
const browser = process.env.BROWSER || 'chrome';

const version = require('../src/manifest').version;

let targets;
if (browser === 'firefox') {
  targets = {
    firefox: '88',
  };
} else {
  targets = {
    chrome: '88',
  };
}

const babelEnvOptions = {
  targets,
};

global.BUILD_ENV = {
  distName: `transmissionEasyClient-${browser}-${version}`,
  outputPath: path.join(__dirname, `../dist/${browser}`),
  mode,
  devtool: mode === 'development' ? 'inline-source-map' : false,
  version,
  browser,
  babelEnvOptions,
  FLAG_ENABLE_LOGGER: true,
};
