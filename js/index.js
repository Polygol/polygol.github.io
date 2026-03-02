// https://github.com/Polygol/polygol.github.io
// Polygol
// index.js

/**
 * Linearly interpolates between two RGB colors.
 * @param {Array<number>} color1 - The starting [R, G, B] color.
 * @param {Array<number>} color2 - The ending [R, G, B] color.
 * @param {number} factor - The interpolation factor (0.0 to 1.0).
 * @returns {Array<number>} The interpolated [R, G, B] color.
 */
function lerpColor(color1, color2, factor) {
    const result = color1.slice();
    for (let i = 0; i < 3; i++) {
        result[i] = Math.round(color1[i] + factor * (color2[i] - color1[i]));
    }
    return result;
}

setInterval(ensureVideoLoaded, 60000);