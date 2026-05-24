require('./builder/defaultBuildEnv');
const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const outputPath = BUILD_ENV.outputPath;
const mode = BUILD_ENV.mode;
const devtool = BUILD_ENV.devtool;
const babelEnvOptions = BUILD_ENV.babelEnvOptions;
const browser = BUILD_ENV.browser;

const config = {
  entry: {
    bg: './src/bg/bg',
    index: './src/pages/Index',
    options: './src/pages/Options',
    tabUrlFetch: './src/tabUrlFetch',
  },
  output: {
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    path: path.join(outputPath, 'src'),
    // Explicit (was webpack 4's default). The webpack 5 'auto' default emits a
    // runtime that reads document.currentScript, which throws in an MV3 service
    // worker (no document). Assets resolve relative to the extension root.
    publicPath: '',
    clean: true,
  },
  mode: mode,
  devtool: devtool,
  optimization: {
    minimizer: [
      '...',
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      cacheGroups: {
        // `bg` is intentionally excluded: an MV3 service worker is a single
        // file, so the background entry must bundle all of its dependencies.
        // Only the two UI pages share a common chunk.
        commons_ui: {
          name: "commons-ui",
          chunks: chunk => ['index', 'options'].includes(chunk.name),
          minChunks: 2,
          priority: 5,
        },
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              ['@babel/plugin-proposal-decorators', {'legacy': true}],
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties'
            ],
            presets: [
              '@babel/preset-react',
              ['@babel/preset-env', babelEnvOptions]
            ]
          }
        }
      },
      {
        test: /\.(css|less)$/,
        use: [{
          loader: MiniCssExtractPlugin.loader
        }, {
          loader: "css-loader"
        }, {
          loader: "less-loader"
        }]
      },
      {
        test: /\.(gif|png|svg)$/,
        oneOf: [
          {
            // Icons referenced from JS that must be real files (e.g. notification
            // iconUrls); imported with a `?resource` query.
            resourceQuery: /resource/,
            type: 'asset/resource',
          },
          {
            // Default: inline small images (matches the old url-loader limit).
            type: 'asset',
            parser: {
              dataUrlCondition: {
                maxSize: 8192
              }
            }
          },
        ]
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/manifest.json',
          transform(content) {
            const manifest = JSON.parse(content);
            if (browser === 'firefox') {
              // Firefox MV3 uses a non-persistent event page (background.scripts),
              // not a service worker.
              manifest.background = {
                scripts: ['bg.js']
              };
              manifest.browser_specific_settings = {
                gecko: {
                  // Required for MV3 on Firefox. Change this if you publish to
                  // AMO under an existing add-on ID.
                  id: 'transmission-easyclient@vincentvm',
                  strict_min_version: '109.0'
                }
              };
              delete manifest.minimum_chrome_version;
            }
            return JSON.stringify(manifest, null, 4);
          }
        },
        {from: './src/assets/icons', to: './assets/icons'},
        {from: './src/_locales', to: './_locales'},
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[name].chunk.css'
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/templates/index.html',
      chunks: ['commons-ui', 'index'],
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
    }),
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: './src/templates/options.html',
      chunks: ['commons-ui', 'options'],
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
      },
    }),
    new DefinePlugin({
      'BUILD_ENV': Object.entries(BUILD_ENV).reduce((obj, [key, value]) => {
        obj[key] = JSON.stringify(value);
        return obj;
      }, {}),
    }),
  ]
};

module.exports = config;
