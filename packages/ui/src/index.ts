/**
 * Open Media Disc (OMD) shared UI kit.
 *
 * Framework-agnostic building blocks shared by OMD Studio and the future Pi
 * player: the token-based theme engine (JSON tokens to CSS variables, with the
 * default Aqua theme) and a pure player transport model. No DOM or framework
 * dependency, so both surfaces can reuse the same logic.
 */

export * from './theme.js';
export * from './player.js';
