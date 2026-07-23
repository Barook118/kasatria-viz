/**
 * scene.js — Three.js scene, camera, renderers, orbit controls, and render loop.
 *
 * Uses TWO renderers stacked on top of each other (same technique as the
 * original periodic table demo):
 *   1. WebGLRenderer     — renders a plain black background / depth pass
 *   2. CSS3DRenderer     — renders the CSS3DObjects (the tiles)
 *
 * The CSS3DRenderer canvas is transparent so the WebGL background shows through.
 */

import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls }  from 'three/addons/controls/OrbitControls.js';
import { updateTweens }   from './transitions.js';

// ---------------------------------------------------------------------------
// Module-level handles (set by initScene, used by addTiles / render loop)
// ---------------------------------------------------------------------------
let camera;
let scene;
let webglRenderer;
let cssRenderer;
let controls;
let animationId;

/**
 * Initialises the Three.js scene and attaches both renderers to #scene-container.
 * Must be called once after the app element is visible.
 *
 * @returns {{ scene: THREE.Scene, camera: THREE.PerspectiveCamera }}
 */
export function initScene() {
  const container = document.getElementById('scene-container');
  const w = container.clientWidth;
  const h = container.clientHeight;

  // ── Scene ────────────────────────────────────────────────────
  scene = new THREE.Scene();

  // ── Camera ───────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(40, w / h, 1, 10_000);
  camera.position.set(0, 0, 3000);

  // ── WebGL renderer (background) ──────────────────────────────
  webglRenderer = new THREE.WebGLRenderer({ antialias: true });
  webglRenderer.setPixelRatio(window.devicePixelRatio);
  webglRenderer.setSize(w, h);
  // Position absolute so the CSS renderer sits on top
  webglRenderer.domElement.style.position = 'absolute';
  webglRenderer.domElement.style.top  = '0';
  webglRenderer.domElement.style.left = '0';
  container.appendChild(webglRenderer.domElement);

  // ── CSS3D renderer (tiles) ────────────────────────────────────
  cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(w, h);
  cssRenderer.domElement.style.position = 'absolute';
  cssRenderer.domElement.style.top  = '0';
  cssRenderer.domElement.style.left = '0';
  container.appendChild(cssRenderer.domElement);

  // ── Orbit controls ────────────────────────────────────────────
  // Attach to the CSS renderer's element so mouse events on tiles are captured
  controls = new OrbitControls(camera, cssRenderer.domElement);
  controls.minDistance    = 500;
  controls.maxDistance    = 6000;
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.rotateSpeed    = 0.6;
  controls.zoomSpeed      = 1.2;

  // ── Resize handler ────────────────────────────────────────────
  window.addEventListener('resize', onResize);

  return { scene, camera };
}

/**
 * Adds an array of CSS3DObjects to the scene.
 *
 * @param {import('three').CSS3DObject[]} objects
 */
export function addObjectsToScene(objects) {
  objects.forEach(obj => scene.add(obj));
}

/**
 * Starts the render loop.
 * Safe to call multiple times — won't double-start.
 */
export function startRenderLoop() {
  if (animationId !== undefined) return; // already running

  function animate() {
    animationId = requestAnimationFrame(animate);
    updateTweens();           // advance TWEEN animations
    controls.update();        // damping needs per-frame update
    webglRenderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }

  animate();
}

/**
 * Stops the render loop (useful for cleanup / testing).
 */
export function stopRenderLoop() {
  if (animationId !== undefined) {
    cancelAnimationFrame(animationId);
    animationId = undefined;
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function onResize() {
  const container = document.getElementById('scene-container');
  if (!container) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  webglRenderer.setSize(w, h);
  cssRenderer.setSize(w, h);
}
