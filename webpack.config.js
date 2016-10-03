var path = require('path');
var webpack = require('webpack');
var CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;

module.exports = {
  devtool: 'source-map',
  debug: true,

  entry: {
    'angular2': [
      'rxjs',
      'reflect-metadata',
      '@angular/core'
    ],
    'app': './app/app'
  },

  output: {
    path: __dirname + '/build/',
    publicPath: 'build/',
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    chunkFilename: '[id].chunk.js'
  },

  resolve: {
    extensions: ['','.ts','.js','.json', '.css', '.scss', '.html']
  },

  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'ts',
        exclude: [ /node_modules/ ]
      },
      {
        test: /\.scss$/,
        loaders: [ "raw-loader", "sass-loader" ],
        exclude: [ /node_modules/ ]
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ],
    noParse: [
      /jszip.js$/
    ]
  },

  node: {
    fs: 'empty'
  },

  externals: [
    {
      './cptable': 'var cptable'
    }
  ],

  plugins: [
    new CommonsChunkPlugin({ name: 'angular2', filename: 'angular2.js', minChunks: Infinity }),
    new CommonsChunkPlugin({ name: 'common',   filename: 'common.js' }),
  ],
  target:'electron-renderer'
};
