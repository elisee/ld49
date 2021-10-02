export const $ = document.querySelector.bind(document);
export function $show(elt, visible) { elt.hidden = !(visible ?? true); }
export function $hide(elt) { elt.hidden = true; }

export function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function randomFloat(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

export function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

export function lerp(a, b, v) {
  return a + (b - a) * v;
}
