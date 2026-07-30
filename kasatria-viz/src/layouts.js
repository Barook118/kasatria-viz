/**
 * layouts.js — Pure position/rotation math for each view mode.
 *
 * Each exported function returns an array of { position, rotation } objects
 * (one per tile, same order as the tiles array) using Three.js Vector3 / Euler.
 *
 * None of these functions touch the DOM or the scene — that's the
 * transition layer's job.
 *
 * Layout specs from the assignment:
 *   TABLE  — 20 columns × 10 rows, flat grid (z = 0)
 *   SPHERE — standard spherical distribution for N points
 *   HELIX  — DOUBLE helix (two interleaved strands)
 *   GRID   — 3-D grid of 5 (depth) × 4 (rows) × 10 (cols)
 */

import * as THREE from 'three';

// Tile dimensions (must match CSS .tile width/height)
const TILE_W = 110; // px — includes a small gap
const TILE_H = 130; // px — includes a small gap

// ---------------------------------------------------------------------------
// TABLE   20 × 10
// ---------------------------------------------------------------------------

/**
 * Flat 20-column × 10-row grid centred at the origin.
 *
 * @param {number} count - number of tiles (200)
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function tableLayout(count) {
  const COLS = 20;
  const ROWS = Math.ceil(count / COLS); // 10

  const offsetX = ((COLS - 1) * TILE_W) / 2;
  const offsetY = ((ROWS - 1) * TILE_H) / 2;

  return Array.from({ length: count }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    return {
      position: new THREE.Vector3(
        col * TILE_W - offsetX,
        -(row * TILE_H - offsetY), // negative Y → rows go downward in 3-D space
        0
      ),
      rotation: new THREE.Euler(0, 0, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// SPHERE
// ---------------------------------------------------------------------------

/**
 * Distributes N points approximately uniformly on a sphere surface using the
 * golden-angle spiral (sunflower) algorithm — same approach as the original demo.
 *
 * @param {number} count
 * @param {number} [radius=800]
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function sphereLayout(count, radius = 800) {
  const results = [];
  const vector  = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Golden-angle spiral gives even distribution
    const phi   = Math.acos(-1 + (2 * i) / count);          // polar angle
    const theta = Math.sqrt(count * Math.PI) * phi;          // azimuthal angle

    // Point on the sphere surface
    vector.setFromSphericalCoords(radius, phi, theta);

    // The tile should face outward from the sphere centre
    // We use a lookAt helper to compute the rotation
    const dummy = new THREE.Object3D();
    dummy.position.copy(vector);
    dummy.lookAt(new THREE.Vector3(0, 0, 0)); // face inward
    // Flip 180° so the tile face points outward toward the camera
    dummy.rotation.y += Math.PI;

    results.push({
      position: vector.clone(),
      rotation: dummy.rotation.clone(),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// HELIX  (double)
// ---------------------------------------------------------------------------

/**
 * Double-helix: two interleaved strands, each carrying half the tiles.
 * Strand A uses even indices, strand B uses odd indices.
 *
 * The two strands are offset by π radians (half a full turn) so they
 * interleave exactly like DNA.
 *
 * @param {number} count
 * @param {number} [radius=400]   - helix radius
 * @param {number} [yStep=50]     - vertical distance between consecutive tiles
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function helixLayout(count, radius = 400, yStep = 50) {
  const results  = [];
  const vector   = new THREE.Vector3();
  const dummy    = new THREE.Object3D();

  // Total height of the helix — centre it vertically
  const totalHeight = count * yStep * 0.5; // halved because 2 strands share height

  for (let i = 0; i < count; i++) {
    // Determine which strand (0 = A, 1 = B)
    const strand      = i % 2;              // 0 or 1
    const strandIndex = Math.floor(i / 2);  // position within the strand

    // Angle along the helix — strand B is offset by π
    const angle = strandIndex * 0.35 + strand * Math.PI;
    const y     = strandIndex * yStep - totalHeight / 2;

    vector.set(
      radius * Math.sin(angle),
      y,
      radius * Math.cos(angle)
    );

    // Tile faces outward from the helix axis
    dummy.position.copy(vector);
    dummy.lookAt(new THREE.Vector3(0, vector.y, 0)); // look toward the axis
    dummy.rotation.y += Math.PI; // flip to face outward

    results.push({
      position: vector.clone(),
      rotation: dummy.rotation.clone(),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// GRID   5 (depth/Z) × 4 (rows/Y) × 10 (cols/X)
// ---------------------------------------------------------------------------

/**
 * 3-D grid: 10 columns (X) × 4 rows (Y) × 5 layers deep (Z).
 * Total = 200 tiles. Tiles face the viewer (rotation = 0).
 *
 * The depth layers are staggered in Z and slightly in Y to produce
 * the cascading "staircase" look shown in Image C.
 *
 * @param {number} count
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function gridLayout(count) {
  const COLS   = 10;
  const ROWS   = 4;
  const LAYERS = 5; // depth

  // Gaps between tiles
  const GAP_X = TILE_W + 10;
  const GAP_Y = TILE_H + 10;
  const GAP_Z = 220; // depth separation between layers

  // Stagger each layer: move back in Z and down/right so they peek out
  const STAGGER_X = 30;  // X shift per layer (creates the diagonal cascade)
  const STAGGER_Y = -25; // Y shift per layer

  // Centre the whole structure
  const offsetX = ((COLS  - 1) * GAP_X) / 2;
  const offsetY = ((ROWS  - 1) * GAP_Y) / 2;
  const offsetZ = ((LAYERS - 1) * GAP_Z) / 2;

  const results = [];

  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / (COLS * ROWS));           // 0-4
    const rem   = i % (COLS * ROWS);
    const row   = Math.floor(rem / COLS);                  // 0-3
    const col   = rem % COLS;                              // 0-9

    const x = col * GAP_X - offsetX + layer * STAGGER_X;
    const y = -(row * GAP_Y - offsetY) + layer * STAGGER_Y;
    const z = layer * GAP_Z - offsetZ;

    results.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(0, 0, 0),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// PYRAMID  (square-base pyramid — 4 triangular side faces)
// ---------------------------------------------------------------------------

/**
 * Square-base pyramid: 1 apex at the top, 4 base corners forming a square.
 * Tiles are distributed across the 4 triangular SIDE faces only
 * (50 tiles per face), each tile facing outward from the pyramid surface.
 *
 * Shape matches the reference image: tall apex, wide square base.
 *
 * @param {number} count
 * @param {number} [baseSize=900]  - half-width of the square base
 * @param {number} [height=1100]   - height from base to apex
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function tetrahedronLayout(count, baseSize = 900, height = 1100) {
  const results = [];
  const dummy   = new THREE.Object3D();

  // ── Pyramid vertices ─────────────────────────────────────────────────────
  const apex = new THREE.Vector3(0,  height * 0.5,  0);  // top point
  const baseY = -height * 0.5;                             // base Y level
  const b = baseSize;

  // 4 base corners (square), ordered: front-left, front-right, back-right, back-left
  const baseCorners = [
    new THREE.Vector3(-b, baseY,  b),  // front-left
    new THREE.Vector3( b, baseY,  b),  // front-right
    new THREE.Vector3( b, baseY, -b),  // back-right
    new THREE.Vector3(-b, baseY, -b),  // back-left
  ];

  // ── 4 triangular side faces ───────────────────────────────────────────────
  // Each face = apex + two adjacent base corners
  const faces = [
    [apex, baseCorners[0], baseCorners[1]],  // front face
    [apex, baseCorners[1], baseCorners[2]],  // right face
    [apex, baseCorners[2], baseCorners[3]],  // back face
    [apex, baseCorners[3], baseCorners[0]],  // left face
  ];

  const tilesPerFace = Math.ceil(count / 4);

  for (let f = 0; f < 4; f++) {
    const [A, B, C] = faces[f];

    // ── Outward normal ──────────────────────────────────────────────────
    const AB     = new THREE.Vector3().subVectors(B, A);
    const AC     = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(AB, AC).normalize();

    // Face centre — make sure normal points away from the pyramid centre (origin)
    const faceCentre = new THREE.Vector3()
      .addVectors(A, B).add(C).divideScalar(3);
    if (normal.dot(faceCentre) < 0) normal.negate();

    // ── Sample a triangular grid on this face using barycentric coords ──
    // Use a row-based triangular grid: row 0 = 1 tile (near apex),
    // row N = N+1 tiles (near base). This naturally respects the triangle shape.
    const rows   = Math.ceil(Math.sqrt(2 * tilesPerFace));
    const points = [];

    for (let row = 0; row < rows && points.length < tilesPerFace; row++) {
      // Number of sample points in this row
      const cols = row + 1;
      for (let col = 0; col < cols && points.length < tilesPerFace; col++) {
        // Barycentric coordinates (u=apex weight, v+w=base edge weights)
        // Map so row 0 = near apex, row (rows-1) = near base
        const t = rows === 1 ? 0.5 : row / (rows - 1);

        // u: weight toward apex (decreases as we go down)
        const u = 1 - t * 0.85; // keep slightly away from exact apex

        // Spread along the base edge
        const baseT = cols === 1 ? 0.5 : col / (cols - 1);
        const v = (1 - u) * (1 - baseT * 0.85);
        const w = 1 - u - v;

        // Slightly inset from edges
        const inset = 0.08;
        const uu = u * (1 - inset * 3) + inset;
        const vv = v * (1 - inset * 3) + inset;
        const ww = Math.max(0, 1 - uu - vv);

        const point = new THREE.Vector3()
          .addScaledVector(A, uu)
          .addScaledVector(B, vv)
          .addScaledVector(C, ww);

        points.push(point);
      }
    }

    // ── Place tiles ──────────────────────────────────────────────────────
    for (let p = 0; p < points.length; p++) {
      const globalIndex = f * tilesPerFace + p;
      if (globalIndex >= count) break;

      const pos = points[p];

      // Orient tile to face outward from the pyramid surface
      dummy.position.copy(pos);
      dummy.lookAt(pos.clone().add(normal));

      results.push({
        position: pos.clone(),
        rotation: dummy.rotation.clone(),
      });
    }
  }

  // Safety padding if rounding left gaps
  while (results.length < count) {
    results.push(results[results.length - 1]);
  }

  return results;
}

