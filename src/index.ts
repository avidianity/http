import { Http } from './http';
import { HttpOptions } from './types';

export * from './http';
export { isException } from './helpers';

export default function (options?: HttpOptions) {
    return new Http(options);
}
