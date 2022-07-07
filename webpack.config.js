const path = require('path');

module.exports = {
  mode: 'development',
  entry: [
        __dirname + '/src/index.js',
        __dirname + '/scss/index.scss'
    ],
  output: {
    path: path.resolve(__dirname),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [],
      }, {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
            options: { outputPath: '/', name: '[name].min.css'}
          },
          'sass-loader'
        ]
      }
    ]
  },
  devServer: {
    port: 9000,
    allowedHosts: "all",
    static: {
      directory: path.resolve(__dirname)
    }
  }
}
