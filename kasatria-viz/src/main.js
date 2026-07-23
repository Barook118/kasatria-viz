/**
 * main.js — Application entry point.
 *
 * Orchestration order:
 *   1. Check for an existing Google session (page refresh case)
 *   2. If none → show login screen, wait for auth callback
 *   3. On auth success → show app shell, fetch sheet data
 *   4. On data ready → build tiles, init scene, start render loop
 *   5. Wire layout buttons
 */

import './style.css';
import { initAuth, getStoredUser, signOut } from './auth.js';
import { fetchPeople }                      from './data.js';
import { buildTiles }                       from './tile.js';
import { initScene, addObjectsToScene, startRenderLoop } from './scene.js';
import { transitionTo }                     from './transitions.js';
import {
  tableLayout,
  sphereLayout,
  helixLayout,
  gridLayout,
} from './layouts.js';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const loginScreen    = document.getElementById('login-screen');
const app            = document.getElementById('app');
const loadingOverlay = document.getElementById('loading-overlay');
const userAvatar     = document.getElementById('user-avatar');
const userName       = document.getElementById('user-name');
const logoutBtn      = document.getElementById('logout-btn');
const ctrlBtns       = document.querySelectorAll('.ctrl-btn');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let tileObjects    = []; // CSS3DObject[]
let layoutTargets  = {}; // precomputed layout positions

// ---------------------------------------------------------------------------
// 1. Bootstrapping
// ---------------------------------------------------------------------------

/**
 * Entry point — called immediately on module load.
 */
function bootstrap() {
  // Check for an existing session first (avoids redundant login on refresh)
  const storedUser = getStoredUser();

  if (storedUser) {
    // Already authenticated — skip login screen
    onAuthSuccess(storedUser);
  } else {
    // Show login screen and wait for the user to sign in
    initAuth(onAuthSuccess);
  }

  // Wire the logout button
  logoutBtn.addEventListener('click', signOut);
}

// ---------------------------------------------------------------------------
// 2. Auth success handler
// ---------------------------------------------------------------------------

/**
 * Called after a successful Google sign-in.
 * Hides the login screen, populates the user info bar, then loads data.
 *
 * @param {{ name: string, picture: string }} user
 */
async function onAuthSuccess(user) {
  // Update UI
  loginScreen.style.display = 'none';
  app.style.display         = 'block';

  userAvatar.src     = user.picture || '';
  userName.textContent = user.name  || user.email || '';

  // Load data
  await loadData();
}

// ---------------------------------------------------------------------------
// 3. Data loading
// ---------------------------------------------------------------------------

async function loadData() {
  loadingOverlay.style.display = 'flex';

  let people;
  try {
    people = await fetchPeople();
  } catch (err) {
    console.error('[main] Data fetch failed:', err);
    loadingOverlay.innerHTML = `
      <p style="color:#e94560;text-align:center;padding:20px;">
        ⚠️ Could not load data.<br>
        <small>${err.message}</small><br><br>
        <small>Make sure VITE_SHEET_CSV_URL is set in your .env file.</small>
      </p>`;
    return;
  }

  loadingOverlay.style.display = 'none';
  initVisualization(people);
}

// ---------------------------------------------------------------------------
// 4. Visualization init
// ---------------------------------------------------------------------------

/**
 * Builds tiles, initialises the Three.js scene, precomputes all layout
 * targets, and switches to the default (table) layout.
 *
 * @param {import('./data.js').Person[]} people
 */
function initVisualization(people) {
  // Build CSS3DObjects
  tileObjects = buildTiles(people);

  // Init scene + add objects
  initScene();
  addObjectsToScene(tileObjects);

  // Precompute all layout target arrays once (avoids recalculating on every click)
  const count = tileObjects.length;
  layoutTargets = {
    table:  tableLayout(count),
    sphere: sphereLayout(count),
    helix:  helixLayout(count),
    grid:   gridLayout(count),
  };

  // Start with table layout (no animation — just set positions directly)
  applyLayoutInstant('table');

  // Start render loop
  startRenderLoop();

  // Wire layout buttons
  wireButtons();
}

// ---------------------------------------------------------------------------
// 5. Layout helpers
// ---------------------------------------------------------------------------

/**
 * Instantly snaps all tiles to a layout (no tween — used for initial placement).
 *
 * @param {'table'|'sphere'|'helix'|'grid'} layoutName
 */
function applyLayoutInstant(layoutName) {
  const targets = layoutTargets[layoutName];
  tileObjects.forEach((obj, i) => {
    const t = targets[i];
    if (!t) return;
    obj.position.copy(t.position);
    obj.rotation.copy(t.rotation);
  });
}

/**
 * Animates all tiles to a new layout.
 *
 * @param {'table'|'sphere'|'helix'|'grid'} layoutName
 */
function applyLayoutAnimated(layoutName) {
  transitionTo(tileObjects, layoutTargets[layoutName]);
}

// ---------------------------------------------------------------------------
// 6. Button wiring
// ---------------------------------------------------------------------------

function wireButtons() {
  ctrlBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      ctrlBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Trigger animated transition
      applyLayoutAnimated(btn.dataset.layout);
    });
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
bootstrap();
