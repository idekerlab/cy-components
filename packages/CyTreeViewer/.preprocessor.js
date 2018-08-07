const babelJest = require('babel-jest')
const webpackAlias = require('jest-webpack-alias')

module.exports = {
  process: function(src, filename, ...rest) {
    if (filename.indexOf('node_modules') === -1) {
      src = babelJest.process(src, filename, ...rest)
      src = webpackAlias.process(src, filename, ...rest)
    }
    return src
  }
}
