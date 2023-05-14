const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    entry: './src/scripts.js',
    output:  {
        filename: './public/js/build.js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            hash: true,
            title: 'My Awesome application',
            myPageHeader: 'Hello World',
            template: './src/index.html',
            filename: './public/index.html'
        })
    ],
    //watch: true,
}