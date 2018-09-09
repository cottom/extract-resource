const webpack = require('webpack')
const path = require('path')
const fileSystem = require('fs')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')


const env = require('./utils/env')

const isDev = env.NODE_ENV === 'development'

// load the secrets
var alias = {
};

const productPlugins = [
  new UglifyJsPlugin({
    cache: true,
    parallel: true
  })
]

var secretsPath = path.join(__dirname, ('secrets.' + env.NODE_ENV + '.js'));

var fileExtensions = ['jpg', 'jpeg', 'png', 'gif', 'eot', 'otf', 'svg', 'ttf', 'woff', 'woff2'];

if (fileSystem.existsSync(secretsPath)) {
  alias['secrets'] = secretsPath;
}

var options = {
  entry: {
    popup: path.join(__dirname, 'src', 'js', 'popup.js'),
    background: path.join(__dirname, 'src', 'js', 'background.js'),
    devtool: path.join(__dirname, 'src', 'js', 'devtool.js'),
    content: path.join(__dirname, 'src', 'js', 'content.js'),
    background: path.join(__dirname, 'src', 'js', 'background.js'),
    worker: path.join(__dirname, 'src', 'js', 'worker.js'),
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js'
  },
  module: {
    // noParse: function(content) {
    //   return /vue|lodash/.test(content);
    // },
    rules: [
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: new RegExp('\.(' + fileExtensions.join('|') + ')$'),
        loader: 'file-loader?name=[name].[ext]'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [path.join(__dirname, './src')],
        options: {}
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    alias: alias
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin(['build']),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV)
    }),
    new VueLoaderPlugin(),
    new CopyWebpackPlugin([{
      from: 'src/manifest.json',
      transform: function (content, path) {
        // generates the manifest file using the package.json informations
        return Buffer.from(JSON.stringify({
          description: process.env.npm_package_description,
          version: process.env.npm_package_version,
          ...JSON.parse(content.toString())
        }))
      }
    },
  {
    from: 'img/*',
    to: '.'
  }]),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'popup.html'),
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'devtool.html'),
      filename: 'devtool.html',
      chunks: ['devtool']
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'content.html'),
      filename: 'content.html',
      chunks: ['content']
    }),
    new WriteFilePlugin(),
    ...(isDev ? [] : productPlugins)
  ]
};

if (isDev) {
  options.devtool = 'source-map';
}

module.exports = options;
