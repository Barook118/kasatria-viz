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
 * Tiles fill each face in tight triangular rows, all facing outward.
 * Tile spacing is computed from the actual face dimensions so tiles
 * pack edge-to-edge with no blank areas.
 *
 * @param {number} count
 * @param {number} [radius=950] - circumradius (centre to vertex)
 * @returns {Array<{position: THREE.Vector3, rotation: THREE.Euler}>}
 */
export function tetrahedronLayout(count, radius = 950) {
  const results = [];

  // ── 4 vertices of a regular tetrahedron, apex pointing up ────────────────
  const baseY =  -radius / 3;
  const baseR =   radius * (2 * Math.sqrt(2) / 3);

  const v = [
    new THREE.Vector3(0,      radius, 0),                                         // v0: apex
    new THREE.Vector3( baseR, baseY,  0),                                          // v1
    new THREE.Vector3(-baseR * 0.5, baseY,  baseR * Math.sqrt(3) / 2),            // v2
    new THREE.Vector3(-baseR * 0.5, baseY, -baseR * Math.sqrt(3) / 2),            // v3
  ];

  // Centroid at origin — used to orient normals outward
  const centroid = new THREE.Vector3(0, (radius + 3 * baseY) / 4, 0);

  // 4 faces
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2],
  ];

  const tilesPerFace = Math.ceil(count / 4);

  // Number of rows R so that R*(R+1)/2 >= tilesPerFace
  const R = Math.ceil((-1 + Math.sqrt(1 + 8 * tilesPerFace)) / 2);

  for (let f = 0; f < 4; f++) {
    const [iA, iB, iC] = faces[f];
    const A = v[iA]; // top corner of this face
    const B = v[iB]; // bottom-left
    const C = v[iC]; // bottom-right

    // ── Outward face normal ─────────────────────────────────────────────
    const AB     = new THREE.Vector3().subVectors(B, A);
    const AC     = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(AB, AC).normalize();
    const faceCenter = new THREE.Vector3().addVectors(A, B).add(C).divideScalar(3);
    if (normal.dot(new THREE.Vector3().subVectors(faceCenter, centroid)) < 0) {
      normal.negate();
    }

    // ── Face local axes (for correct tile rotation) ─────────────────────
    // "up" in face space = direction from base-midpoint toward apex corner A
    const baseMid = new THREE.Vector3().addVectors(B, C).multiplyScalar(0.5);
    const faceUp  = new THREE.Vector3().subVectors(A, baseMid).normalize();
    // "right" in face space = perpendicular to both normal and faceUp
    const faceRight = new THREE.Vector3().crossVectors(faceUp, normal).normalize();

    // Build a quaternion that rotates world-Z to face normal, world-Y to faceUp
    const rotMatrix = new THREE.Matrix4().makeBasis(faceRight, faceUp, normal);
    const faceQuat  = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
    const faceEuler = new THREE.Euler().setFromQuaternion(faceQuat);

    // ── Tile spacing — pack tiles to fill the face with no gaps ─────────
    // Face edge length of this equilateral triangle
    const edgeLen = A.distanceTo(B);
    // Each row r (1-indexed) has r tiles. Space them so R rows fill the face.
    // Row spacing = (face height) / R
    // Tile width  = (row width at row r) / r = edgeLen * (r/R) / r = edgeLen/R
    // We scale tile so its width matches edgeLen/R (no gap, no overlap)
    // The actual spacing step in 3-D = edgeLen / R along the face-down direction

    // Vertical step (apex to base) per row
    const faceHeight  = A.distanceTo(baseMid);
    const rowStep     = faceHeight / R;

    let placed = 0;

    for (let row = 1; row <= R && placed < tilesPerFace; row++) {
      // t: 0=apex corner, 1=base edge, centre of this row
      const t = (row - 0.5) / R;

      const tilesInRow = row;
      // Horizontal spread for this row (fraction of base edge)
      const rowWidth = edgeLen * t;

      for (let col = 0; col < tilesInRow && placed < tilesPerFace; col++) {
        // s: 0=left, 1=right within this row
        const s = tilesInRow === 1 ? 0.5 : col / (tilesInRow - 1);

        // Barycentric: P = A*(1-t) + B*t*(1-s) + C*t*s
        const pos = new THREE.Vector3()
          .addScaledVector(A, 1 - t)
          .addScaledVector(B, t * (1 - s))
          .addScaledVector(C, t * s);

        results.push({
          position: pos.clone(),
          rotation: faceEuler.clone(),
        });

        placed++;
      }
    }
  }

  // Safety pad
  while (results.length < count) {
    results.push(results[results.length - 1]);
  }

  return results;
}




