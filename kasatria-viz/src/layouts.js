/**
 * layouts.js — Pure position/rotation math for each view mode.
 */

import * as THREE from 'three';

const TILE_W = 110;
const TILE_H = 130;

// ---------------------------------------------------------------------------
// TABLE   20 × 10
// ---------------------------------------------------------------------------
export function tableLayout(count) {
  const COLS = 20;
  const ROWS = Math.ceil(count / COLS);
  const offsetX = ((COLS - 1) * TILE_W) / 2;
  const offsetY = ((ROWS - 1) * TILE_H) / 2;

  return Array.from({ length: count }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      position: new THREE.Vector3(col * TILE_W - offsetX, -(row * TILE_H - offsetY), 0),
      rotation: new THREE.Euler(0, 0, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// SPHERE
// ---------------------------------------------------------------------------
export function sphereLayout(count, radius = 800) {
  const results = [];
  const vector  = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const phi   = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    vector.setFromSphericalCoords(radius, phi, theta);
    const dummy = new THREE.Object3D();
    dummy.position.copy(vector);
    dummy.lookAt(new THREE.Vector3(0, 0, 0));
    dummy.rotation.y += Math.PI;
    results.push({ position: vector.clone(), rotation: dummy.rotation.clone() });
  }
  return results;
}

// ---------------------------------------------------------------------------
// HELIX  (double)
// ---------------------------------------------------------------------------
export function helixLayout(count, radius = 400, yStep = 50) {
  const results     = [];
  const vector      = new THREE.Vector3();
  const dummy       = new THREE.Object3D();
  const totalHeight = count * yStep * 0.5;

  for (let i = 0; i < count; i++) {
    const strand      = i % 2;
    const strandIndex = Math.floor(i / 2);
    const angle = strandIndex * 0.35 + strand * Math.PI;
    const y     = strandIndex * yStep - totalHeight / 2;
    vector.set(radius * Math.sin(angle), y, radius * Math.cos(angle));
    dummy.position.copy(vector);
    dummy.lookAt(new THREE.Vector3(0, vector.y, 0));
    dummy.rotation.y += Math.PI;
    results.push({ position: vector.clone(), rotation: dummy.rotation.clone() });
  }
  return results;
}

// ---------------------------------------------------------------------------
// GRID   5 × 4 × 10
// ---------------------------------------------------------------------------
export function gridLayout(count) {
  const COLS   = 10;
  const ROWS   = 4;
  const LAYERS = 5;
  const GAP_X  = TILE_W + 10;
  const GAP_Y  = TILE_H + 10;
  const GAP_Z  = 220;
  const STAGGER_X = 30;
  const STAGGER_Y = -25;
  const offsetX = ((COLS  - 1) * GAP_X) / 2;
  const offsetY = ((ROWS  - 1) * GAP_Y) / 2;
  const offsetZ = ((LAYERS - 1) * GAP_Z) / 2;
  const results = [];

  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / (COLS * ROWS));
    const rem   = i % (COLS * ROWS);
    const row   = Math.floor(rem / COLS);
    const col   = rem % COLS;
    results.push({
      position: new THREE.Vector3(
        col * GAP_X - offsetX + layer * STAGGER_X,
        -(row * GAP_Y - offsetY) + layer * STAGGER_Y,
        layer * GAP_Z - offsetZ
      ),
      rotation: new THREE.Euler(0, 0, 0),
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// TETRAHEDRON  (regular — 4 equilateral triangular faces)
// ---------------------------------------------------------------------------
/**
 * Regular tetrahedron: apex at top, 3 base vertices forming equilateral triangle.
 * ALL tiles on the same face share ONE rotation (flat on face surface).
 * Tiles fill each face in triangular rows: 1 at apex corner, widening to base.
 */
export function tetrahedronLayout(count, radius = 900) {
  const results = [];

  const baseY = -radius / 3;
  const baseR =  radius * (2 * Math.sqrt(2) / 3);

  const v = [
    new THREE.Vector3(0,           radius, 0),                              // v0: apex
    new THREE.Vector3( baseR,      baseY,  0),                              // v1
    new THREE.Vector3(-baseR*0.5,  baseY,  baseR * (Math.sqrt(3)/2)),       // v2
    new THREE.Vector3(-baseR*0.5,  baseY, -baseR * (Math.sqrt(3)/2)),       // v3
  ];

  const centroid = new THREE.Vector3(0, (radius + 3 * baseY) / 4, 0);

  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2],
  ];

  const tilesPerFace = Math.ceil(count / 4);
  const R   = Math.ceil((-1 + Math.sqrt(1 + 8 * tilesPerFace)) / 2);
  const pad = 0.05;

  for (let f = 0; f < 4; f++) {
    const [iA, iB, iC] = faces[f];
    const A = v[iA];
    const B = v[iB];
    const C = v[iC];

    // Outward face normal
    const AB     = new THREE.Vector3().subVectors(B, A);
    const ACv    = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(AB, ACv).normalize();
    const fc     = new THREE.Vector3().addVectors(A, B).add(C).divideScalar(3);
    if (normal.dot(new THREE.Vector3().subVectors(fc, centroid)) < 0) normal.negate();

    // Shared rotation for ALL tiles on this face
    const baseMid   = new THREE.Vector3().addVectors(B, C).multiplyScalar(0.5);
    const faceUp    = new THREE.Vector3().subVectors(A, baseMid).normalize();
    const faceRight = new THREE.Vector3().crossVectors(normal, faceUp).normalize();
    const rotMat    = new THREE.Matrix4().makeBasis(faceRight, faceUp, normal);
    const sharedEuler = new THREE.Euler().setFromRotationMatrix(rotMat);

    let placed = 0;
    for (let row = 1; row <= R && placed < tilesPerFace; row++) {
      const tilesInRow = row;
      const t = pad + ((row - 0.5) / R) * (1 - 2 * pad);
      for (let col = 0; col < tilesInRow && placed < tilesPerFace; col++) {
        const s = tilesInRow === 1
          ? 0.5
          : pad + (col / (tilesInRow - 1)) * (1 - 2 * pad);
        const pos = new THREE.Vector3()
          .addScaledVector(A, 1 - t)
          .addScaledVector(B, t * (1 - s))
          .addScaledVector(C, t * s);
        results.push({ position: pos.clone(), rotation: sharedEuler.clone() });
        placed++;
      }
    }
  }

  while (results.length < count) results.push(results[results.length - 1]);
  return results;
}
