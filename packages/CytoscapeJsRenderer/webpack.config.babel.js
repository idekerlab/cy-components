const webpack = require('webpack');
const path = require('path');

export default () => ({
  // devtool: 'inline-source-map',
  devtool: "source-map",
  context: path.join(__dirname, './src'),

  entry: {
    app: './index.js'
  },

  output: {
    path: path.join(__dirname, "build"),
    library: "CytoscapeJsRenderer",
    libraryTarget: "umd",
    filename: "CytoscapeJsRenderer.js"
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

  externals: {
    'react': {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'react',
      root: 'React'
    },
    'prop-types': {
      commonjs: 'prop-types',
      commonjs2: 'prop-types',
      amd: 'prop-types',
      root: 'PropTypes'
    }
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },

  plugins: [
    new webpack.NamedModulesPlugin()
  ]
});
