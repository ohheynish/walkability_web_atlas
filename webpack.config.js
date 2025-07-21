// webpack.config.js
const path = require("path");

module.exports = {
  mode: "development", // or "production"
  entry: "./index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      // Optionally add rules if you need to handle other file types.
    ]
  },
  resolve: {
    fallback: {
      // If needed, add fallbacks for Node modules.
    }
  },
};
