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
// TETRAHEDRON  (4-face pyramid)
// ---------------------------------------------------------------------------

/**
 * Distributes tiles evenly across the 4 triangular faces of a regular
 * tetrahedron (a 4-face pyramid where every face is an equilateral triangle).
 *
 * Each face gets Math.ceil(count / 4) tiles arranged in a triangular grid.
 * Tiles are placed on the face surface and rotated to face outward.
 *
 * @param {number} count
 * @param {number} [radius=700] - circumradius of the tetrahedron
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function tetrahedronLayout(count, radius = 700) {
  const results = [];
  const dummy   = new THREE.Object3D();

  // ── Define the 4 vertices of a regular tetrahedron ──────────────────────
  // Placed so the base is near the bottom and apex points up.
  const r = radius;
  const vertices = [
    new THREE.Vector3(0,                r,                 0),                         // apex (top)
    new THREE.Vector3( r * 0.9428,     -r * 0.3333,        0),                         // base front-right
    new THREE.Vector3(-r * 0.4714,     -r * 0.3333,        r * 0.8165),                // base back-left
    new THREE.Vector3(-r * 0.4714,     -r * 0.3333,       -r * 0.8165),                // base back-right
  ];

  // ── Define the 4 faces (each = 3 vertex indices) ────────────────────────
  const faces = [
    [0, 1, 2], // front-left face
    [0, 2, 3], // back face
    [0, 3, 1], // front-right face
    [1, 3, 2], // bottom base
  ];

  // Tiles per face (distribute as evenly as possible)
  const tilesPerFace = Math.ceil(count / 4);

  // ── For each face, compute a grid of points on its surface ──────────────
  for (let f = 0; f < 4; f++) {
    const [iA, iB, iC] = faces[f];
    const A = vertices[iA];
    const B = vertices[iB];
    const C = vertices[iC];

    // Outward-facing normal of this face
    const AB     = new THREE.Vector3().subVectors(B, A);
    const AC     = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(AB, AC).normalize();

    // Centre of this face
    const faceCentre = new THREE.Vector3()
      .addVectors(A, B)
      .add(C)
      .divideScalar(3);

    // Ensure normal points outward (away from tetrahedron centroid at origin)
    if (normal.dot(faceCentre) < 0) normal.negate();

    // Generate a triangular grid of barycentric sample points on this face.
    // For N tiles, use a triangular number grid of side = ceil(sqrt(2N)).
    const side   = Math.ceil(Math.sqrt(2 * tilesPerFace)) + 1;
    const points = [];

    for (let i = 0; i <= side; i++) {
      for (let j = 0; j <= side - i; j++) {
        const u = i / side;
        const v = j / side;
        const w = 1 - u - v;
        if (w < 0) continue;

        // Barycentric → Cartesian, slightly offset inward from vertex edges
        const scale = 0.75; // keeps tiles away from sharp edges
        const uu = u * scale + (1 - scale) / 3;
        const vv = v * scale + (1 - scale) / 3;
        const ww = 1 - uu - vv;

        const point = new THREE.Vector3()
          .addScaledVector(A, uu)
          .addScaledVector(B, vv)
          .addScaledVector(C, ww);

        points.push(point);
        if (points.length >= tilesPerFace) break;
      }
      if (points.length >= tilesPerFace) break;
    }

    // Place a tile at each sample point on this face
    for (let p = 0; p < points.length; p++) {
      const globalIndex = f * tilesPerFace + p;
      if (globalIndex >= count) break;

      const pos = points[p];

      // Rotate tile to face outward (align with face normal)
      dummy.position.copy(pos);
      dummy.lookAt(pos.clone().add(normal));

      results.push({
        position: pos.clone(),
        rotation: dummy.rotation.clone(),
      });
    }
  }

  // Safety: if rounding left us short, duplicate last entry
  while (results.length < count) {
    results.push(results[results.length - 1]);
  }

  return results;
}
