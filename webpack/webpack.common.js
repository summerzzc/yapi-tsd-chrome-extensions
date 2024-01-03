const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

module.exports = {
  // ...
  plugins: [
    new NodePolyfillPlugin()
  ]
  // ...
}
module.exports = {
  entry: {
    popup: path.join(srcDir, "index.tsx")
    // options: path.join(srcDir, "options.tsx"),
    // background: path.join(srcDir, "background.ts"),
    // content_script: path.join(srcDir, "content_script.tsx")
  },
  output: {
    path: path.join(__dirname, "../dist/scripts"),
    filename: "[name].js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": require.resolve("browserify-fs"),
    }
  },

  module: {
    rules: [
      // Loader for ts, tsx, js and jsx files
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      },

      // Loader for css files
      {
        exclude: /node_modules/,
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },

      // Loader for image files
      {
        test: /\.(?:ico|png|jpg|jpeg|gif)$/i,
        type: "asset/resource"
      },

      // Loader for font & svg files
      {
        test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
        type: "asset/inline"
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: __dirname + "/src/assets/images",
          to: "dist/assets/images",
          noErrorOnMissing: true
        }
      ]
    }),
    new NodePolyfillPlugin()
  ],
  experiments: {
    asyncWebAssembly: true
  }
};
