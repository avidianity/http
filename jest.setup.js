global.Blob = require('blob-polyfill').Blob;
require('formdata-polyfill/FormData');

const streams = require('web-streams-polyfill/ponyfill');

global.ReadableStream = streams.ReadableStream;
