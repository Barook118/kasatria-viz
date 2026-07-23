/**
 * transitions.js — TWEEN-based animated transitions between layouts.
 *
 * Each tile is tweened from its current position/rotation to the
 * target provided by the active layout function.
 *
 * We use @tweenjs/tween.js (ES module build), which is the same
 * library used in the original Three.js periodic table demo.
 */

import TWEEN from '@tweenjs/tween.js';

/** Duration of a single tile's tween (ms). */
const TWEEN_DURATION = 1000;

/** Stagger delay between consecutive tiles (ms). */
const STAGGER_DELAY  = 0; // set to ~5 for a ripple effect if desired

/**
 * Animates all CSS3DObjects from their current transforms to the
 * targets produced by a layout function.
 *
 * @param {import('three').CSS3DObject[]} objects - the tile CSS3DObjects
 * @param {Array<{position: THREE.Vector3, rotation: THREE.Euler}>} targets
 */
export function transitionTo(objects, targets) {
  // Remove all existing tweens so we don't fight a previous transition
  TWEEN.removeAll();

  objects.forEach((obj, i) => {
    const target = targets[i];
    if (!target) return;

    const delay = i * STAGGER_DELAY;

    // ── Position tween ───────────────────────────────────────
    new TWEEN.Tween(obj.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z,
        },
        TWEEN_DURATION
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .delay(delay)
      .start();

    // ── Rotation tween ───────────────────────────────────────
    new TWEEN.Tween(obj.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z,
        },
        TWEEN_DURATION
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .delay(delay)
      .start();
  });
}

/**
 * Must be called on every animation frame (inside the render loop).
 * Advances all active tweens by the elapsed time.
 */
export function updateTweens() {
  TWEEN.update();
}
