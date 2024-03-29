// const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
  mode: "production",
  devtool: false,
  plugins: [
    // Specify production API URL
    // new webpack.DefinePlugin({
    //   'process.env': {
    //     NODE_ENV: JSON.stringify('development'),
    //   },
    // }),
    new BundleAnalyzerPlugin()
  ],
};
