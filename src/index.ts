import { Http } from './http.js';
import { HttpOptions } from './types.js';

export * from './http.js';
export * from './exception.js';
export { isException } from './helpers.js';

export default function (options?: HttpOptions) {
    return new Http(options);
}
