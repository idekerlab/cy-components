const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'source-map',

  context: path.join(__dirname, './src'),

  entry: {
    app: './app.jsx'
  },

  output: {
    path: path.join(__dirname, "build"),
    filename: "app.js"
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'CyNetworkViewer Sample',
      template: 'index.html'
    })
  ]
}
