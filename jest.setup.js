global.Blob = require('blob-polyfill').Blob;
require('formdata-polyfill/FormData');

const streams = require('web-streams-polyfill');

global.ReadableStream = streams.ReadableStream;
global.WritableStream = streams.WritableStream;
