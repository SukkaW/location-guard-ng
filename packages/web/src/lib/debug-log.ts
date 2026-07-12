/* eslint-disable no-console -- debug logging */
// Always-on diagnostic logging for the userscript bridge integration (distinct prefix
// from the userscript's own `[Location Guard NG]` debugLog, since both can appear in the

import { noop } from 'foxact/noop';

// same devtools console when this page is opened under the userscript).
const PREFIX = '[LocationGuard:web]';

export const debugLog = process.env.NODE_ENV === 'development' ? console.log.bind(console, PREFIX) : noop;
export const debugError = process.env.NODE_ENV === 'development' ? console.error.bind(console, PREFIX) : noop;
