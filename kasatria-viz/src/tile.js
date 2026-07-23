/**
 * tile.js — CSS3D tile DOM factory
 *
 * Creates one <div class="tile"> per Person, which is then wrapped
 * in a Three.js CSS3DObject for use in the CSS3DRenderer scene.
 *
 * Tile anatomy (mirrors the original periodic-table element cards):
 *
 *   ┌──────────────┐
 *   │ CC       25  │  ← country code (top-left), age (top-right)
 *   │    [photo]   │  ← circular photo
 *   │  Full Name   │  ← name (bold, 2 lines max)
 *   │   Interest   │  ← interest (small, muted)
 *   │  $xxx,xxx    │  ← net worth (tiny, very muted)
 *   └──────────────┘
 *
 * Background color is determined by net worth:
 *   red    < $100K
 *   orange > $100K
 *   green  > $200K
 */

import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/**
 * Builds an array of CSS3DObjects from the people dataset.
 * Each object carries a `.element` property pointing to its DOM node.
 *
 * @param {import('./data.js').Person[]} people
 * @returns {CSS3DObject[]}
 */
export function buildTiles(people) {
  return people.map((person, index) => createTile(person, index));
}

/**
 * Creates a single CSS3DObject tile for one person.
 *
 * @param {import('./data.js').Person} person
 * @param {number} index - zero-based position in the dataset
 * @returns {CSS3DObject}
 */
function createTile(person, index) {
  const div = document.createElement('div');
  div.className = `tile ${person.colorClass}`;
  div.dataset.index = index;

  // ── Country badge ──────────────────────────────────────────
  const country = document.createElement('div');
  country.className = 'tile-country';
  country.textContent = person.country;

  // ── Age badge ──────────────────────────────────────────────
  const age = document.createElement('div');
  age.className = 'tile-age';
  age.textContent = person.age;

  // ── Photo ──────────────────────────────────────────────────
  const photo = document.createElement('img');
  photo.className = 'tile-photo';
  photo.alt = person.name;
  // Lazy-load: set src only (browser handles deferred loading)
  photo.src = person.photo;
  // Graceful fallback: show a plain coloured circle if image 404s
  photo.onerror = () => {
    photo.style.display = 'none';
  };

  // ── Name ────────────────────────────────────────────────────
  const name = document.createElement('div');
  name.className = 'tile-name';
  name.textContent = person.name;

  // ── Interest ────────────────────────────────────────────────
  const interest = document.createElement('div');
  interest.className = 'tile-interest';
  interest.textContent = person.interest;

  // ── Net worth (small label) ─────────────────────────────────
  const worth = document.createElement('div');
  worth.className = 'tile-worth';
  worth.textContent = person.netWorthRaw;

  // Assemble
  div.appendChild(country);
  div.appendChild(age);
  div.appendChild(photo);
  div.appendChild(name);
  div.appendChild(interest);
  div.appendChild(worth);

  // Wrap in CSS3DObject
  const obj = new CSS3DObject(div);
  // Store person reference on the object for later use (e.g. filtering)
  obj.userData = { person, index };

  return obj;
}
