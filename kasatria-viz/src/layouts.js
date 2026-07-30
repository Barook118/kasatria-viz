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
// TETRAHEDRON  (regular tetrahedron — 4 equilateral triangular faces)
// ---------------------------------------------------------------------------

/**
 * Regular tetrahedron: 4 vertices, 6 edges, 4 equilateral triangular faces.
 * - 1 apex at the top
 * - 3 base vertices forming an equilateral triangle at the bottom
 * - All 4 faces are equilateral triangles (true tetrahedron)
 *
 * Tiles are distributed evenly across all 4 faces (~50 per face).
 * Within each face, tiles fill in triangular rows: 1 tile at apex-corner,
 * growing wider toward the opposite edge — matching the reference image.
 *
 * @param {number} count
 * @param {number} [radius=900] - circumradius (centre to vertex distance)
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function tetrahedronLayout(count, radius = 900) {
  const results = [];
  const dummy   = new THREE.Object3D();

  // ── 4 vertices of a regular tetrahedron ──────────────────────────────────
  // Oriented with one vertex (apex) at the top.
  // Using standard unit tetrahedron scaled by radius:
  //   Apex:   (0, 1, 0)
  //   Base 3: evenly spread 120° apart at y = -1/3, radius = 2√2/3

  const s = radius;
  const baseY    = -s * (1 / 3);          // y of base vertices
  const baseR    =  s * (2 * Math.sqrt(2) / 3); // radial distance of base verts

  const v = [
    new THREE.Vector3(0, s, 0),                                         // v0: apex (top)
    new THREE.Vector3(baseR, baseY, 0),                                  // v1: base front-right
    new THREE.Vector3(-baseR * 0.5, baseY,  baseR * Math.sqrt(3) / 2),  // v2: base back-left
    new THREE.Vector3(-baseR * 0.5, baseY, -baseR * Math.sqrt(3) / 2),  // v3: base back-right
  ];

  // ── 4 faces of the tetrahedron ────────────────────────────────────────────
  // Each face = 3 vertex indices, wound counter-clockwise from outside
  const faces = [
    [0, 1, 2], // front-left face  (apex + v1 + v2)
    [0, 2, 3], // back face        (apex + v2 + v3)
    [0, 3, 1], // front-right face (apex + v3 + v1)
    [1, 3, 2], // base face        (v1 + v3 + v2)
  ];

  // Tetrahedron centroid (geometric centre) — used to ensure normals point outward
  const centroid = new THREE.Vector3(0, (s + 3 * baseY) / 4, 0);

  const tilesPerFace = Math.ceil(count / 4);

  // ── Fill each face with tiles in triangular rows ──────────────────────────
  for (let f = 0; f < 4; f++) {
    const [iA, iB, iC] = faces[f];
    const A = v[iA]; // "apex" corner of this face (row origin)
    const B = v[iB]; // base-left corner
    const C = v[iC]; // base-right corner

    // Outward-pointing normal
    const AB     = new THREE.Vector3().subVectors(B, A);
    const AC     = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(AB, AC).normalize();
    const faceCentre = new THREE.Vector3().addVectors(A, B).add(C).divideScalar(3);
    // Flip if pointing inward
    if (normal.dot(new THREE.Vector3().subVectors(faceCentre, centroid)) < 0) {
      normal.negate();
    }

    // How many rows R needed so that 1+2+…+R >= tilesPerFace
    // R*(R+1)/2 >= tilesPerFace  →  R = ceil((-1 + sqrt(1+8*N)) / 2)
    const R   = Math.ceil((-1 + Math.sqrt(1 + 8 * tilesPerFace)) / 2);
    const pad = 0.0; // no inset — tiles go right to the edges

    let placed = 0;

    for (let row = 1; row <= R && placed < tilesPerFace; row++) {
      const tilesInRow = row;

      // t: 0 = near corner A (apex of face), 1 = near base edge BC
      const t = (row - 0.5) / R;

      for (let col = 0; col < tilesInRow && placed < tilesPerFace; col++) {
        // s: 0 = toward B, 1 = toward C along the row
        const s = tilesInRow === 1
          ? 0.5
          : col / (tilesInRow - 1);

        // Barycentric:  P = A*(1-t) + B*t*(1-s) + C*t*s
        const wA = 1 - t;
        const wB = t * (1 - s);
        const wC = t * s;

        const pos = new THREE.Vector3()
          .addScaledVector(A, wA)
          .addScaledVector(B, wB)
          .addScaledVector(C, wC);

        // Tile faces outward from the face surface
        dummy.position.copy(pos);
        dummy.lookAt(pos.clone().add(normal));

        results.push({
          position: pos.clone(),
          rotation: dummy.rotation.clone(),
        });

        placed++;
      }
    }
  }

  // Safety: pad to count if rounding left gaps
  while (results.length < count) {
    results.push(results[results.length - 1]);
  }

  return results;
}



