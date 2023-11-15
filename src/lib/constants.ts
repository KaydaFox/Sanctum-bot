import { URL } from 'node:url';

export const rootDir = new URL('../../', import.meta.url);
export const srcDir = new URL('src/', rootDir);
