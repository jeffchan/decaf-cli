require('babel-core/register')();

require('./cli')(process.argv.slice(2));
