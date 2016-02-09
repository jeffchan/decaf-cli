import { createReadStream, createWriteStream, unlink } from 'fs';
import { join, dirname, basename, extname } from 'path';

import { convert as convertCoffee } from 'decaffeinate';
import { convert as convertEsnext } from 'esnext';

module.exports = function cli(args) {
  const { paths } = parseArguments(args);
  runWithPaths(paths, (errors) => {

  });
};

function parseArguments(args) {
  const paths = [];

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        usage();
        process.exit(0);
        break;

      default:
        paths.push(arg);
        break;
    }
  }

  return { paths };
}

/**
 * Run decaffeinate on the given paths, changing them in place.
 *
 * @param {string[]} paths
 * @param {?function(Error[])=} callback
 */
function runWithPaths(paths, callback) {
  const errors = [];
  var index = 0;

  function processPath(path) {
    console.log();
    console.log(path);
    let outputPath = join(dirname(path), basename(path, extname(path)));
    const fileName = basename(path, extname(path));
    if (fileName.slice(fileName.length - 3, fileName.length) !== 'jsx') {
      outputPath += '.js';
    }

    runWithStream(
      createReadStream(path, { encoding: 'utf8' }),
      createWriteStream(outputPath, { encoding: 'utf8' }),
      function(err) {
        if (err) {
          errors.push(err);
          unlink(outputPath, () => {
            console.log('Removing', outputPath);
          });
        } else {
          unlink(path, () => {
            console.log('Removing', path);
          });
        }
        processNext();
      }
    );
  }

  function processNext() {
    if (index < paths.length) {
      processPath(paths[index++]);
    } else if (callback) {
      callback(errors);
    }
  }

  processNext();
}

/**
 * Run decaffeinate reading from input and writing to corresponding output.
 *
 * @param {ReadableStream} input
 * @param {WritableStream} output
 * @param {function(?Error)=} callback
 */
function runWithStream(input, output, callback) {
  var error;
  var data = '';

  input.setEncoding('utf8');

  input.on('data', function(chunk) {
    data += chunk;
  });

  input.on('end', function() {
    let converted = '';
    try {
      converted = convertCoffee(data);
      converted = convertEsnext(converted, { ecmaFeatures: { jsx: true, experimentalObjectRestSpread: true } }).code;
    } catch (err) {
      error = err;
      converted = '';
      console.error(err.stack);
    }

    output.end(converted, function() {
      if (callback) {
        callback(error);
      }
    });
  });

  output.on('error', function(err) {
    error = err;
  });
}
