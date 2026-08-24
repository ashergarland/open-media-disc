/**
 * Open Media Disc (OMD) Core
 *
 * Platform-independent SDK to create, validate, inspect, and image OMD audio
 * packages. Building a burn-ready UDF disc image is supported; writing that image
 * to a physical disc is a separate step. See the `spec/` folder for the format
 * contract this library implements.
 */

export * from './constants.js';
export * from './manifest.js';
export * from './discTitle.js';
export * from './checksums.js';
export * from './flac.js';
export * from './audioMeta.js';
export * from './audioConvert.js';
export * from './filenames.js';
export * from './discSize.js';
export * from './validationTypes.js';
export * from './package.js';
export * from './rip.js';
export * from './discImage.js';
export * from './discImageWindows.js';
export * from './burn.js';
export * from './burnWindows.js';
export * from './mediaKind.js';
