/**
 * KONBINI product card: the size-keeping title cut and row alignment.
 * Ticket 11, ported from Wayfinder/assets/11-product-card-build.py (FIT_JS).
 *
 * Line breaks are only known after layout, so no CSS can do this. The script
 * only corrects a finished page. Without it the titles stay as CSS leaves them.
 *
 * Two rules, in this order:
 *
 * 1. Over the clamp. A title that needs more lines than the card allows is cut
 *    to the allowed number, with the ellipsis in front of the size, so the size
 *    is never the part that falls off. (The ticket's specimen never exceeds
 *    the clamp, but real catalogue titles do. Same cut, applied there.)
 *
 * 2. Row alignment. In a row of two or more cards, when exactly one card is
 *    the tallest, by exactly one line, and its last line is short (under 25%
 *    of the title width), that card loses that line. Never more than one line,
 *    never more than one card per row. The size survives the cut.
 *
 * A cut title keeps its full text in the `title` attribute. Its last line is a
 * one-line window; on hover the hidden part slides through it (CSS).
 */

const TITLE = '.product-card__content > a.contents > .text-block p';
const GRID = '.product-grid, .resource-list, .lab__subject--grid';
const SHORT_LAST_LINE = 0.25;

/* The size at the end of a catalogue title: "40 g", "1,47 l", "3 x 5 g",
   "250 ml", "10 szt.", "74 g (1 l)". Titles with no size simply have none to protect. */
const SIZE = /(\d+(?:[.,]\d+)?\s?(?:[x×]\s?\d+(?:[.,]\d+)?\s?)?(?:kg|g|ml|l|cm|mm|m|szt\.?|sztuk|tabl\.?|kaps\.?|saszetek|torebek|oz)(?:\s?\(\d[^)]*\))?)$/i;

/** @param {HTMLElement} title */
function clampOf(title) {
  const value = parseInt(getComputedStyle(title).webkitLineClamp, 10);
  return Number.isFinite(value) && value > 0 ? value : Infinity;
}

/**
 * Lines the title takes before the clamp, and the width of its last line as a
 * share of the title box.
 * @param {HTMLElement} title
 */
function measure(title) {
  const range = document.createRange();
  range.selectNodeContents(title);
  const lineHeight = parseFloat(getComputedStyle(title).lineHeight) || 16;
  /** @type {{top: number, right: number}[]} */
  const lines = [];

  for (const rect of range.getClientRects()) {
    if (rect.width === 0) continue;
    const hit = lines.find((line) => Math.abs(line.top - rect.top) < lineHeight / 2);
    if (hit) hit.right = Math.max(hit.right, rect.right);
    else lines.push({ top: rect.top, right: rect.right });
  }
  lines.sort((a, b) => a.top - b.top);

  const clamp = clampOf(title);
  const natural = lines.length;
  const shown = Math.min(natural, clamp);
  const box = title.getBoundingClientRect();
  const last = lines[shown - 1];
  const tail = natural > clamp || !last || box.width === 0 ? 1 : (last.right - box.left) / box.width;

  return { shown, natural, tail };
}

/** @param {HTMLElement} title */
function restore(title) {
  const original = title.dataset.konbiniTitle;
  if (original === undefined) return;
  title.textContent = original;
  title.removeAttribute('title');
  delete title.dataset.konbiniTitle;
}

/** @param {string} size */
function sizeElement(size) {
  const element = document.createElement('b');
  element.className = 'konbini-title__size';
  element.textContent = size;
  return element;
}

/**
 * Rebuilds the title to take `target` lines. The lines above the last hold the
 * words that fit there. The last line is a one-line window ending in an
 * ellipsis, then the size.
 * @param {HTMLElement} title
 * @param {number} target
 */
function fit(title, target) {
  const full = (title.textContent || '').trim().replace(/\s+/g, ' ');
  // Read while the title still holds its text: an emptied title has no width.
  const lineWidth = title.getBoundingClientRect().width;
  title.dataset.konbiniTitle = full;
  title.setAttribute('title', full);

  const match = full.match(SIZE);
  const size = match ? match[1] : '';
  const head = (size ? full.slice(0, full.length - size.length) : full).trim();

  let words = head.split(' ');
  let join = ' ';
  if (words.length < 3) {
    words = Array.from(head);
    join = '';
  }

  // How many words fill the lines above the window.
  let kept = 0;
  if (target > 1) {
    while (kept < words.length) {
      title.textContent = words.slice(0, kept + 1).join(join);
      if (measure(title).natural > target - 1) break;
      kept++;
    }
  }

  // The window is the line less the size and one space.
  title.textContent = '';
  let sizeWidth = 0;
  if (size) {
    const probe = sizeElement(size);
    title.append(probe);
    sizeWidth = probe.getBoundingClientRect().width + 4;
    title.textContent = '';
  }
  if (kept > 0) title.append(words.slice(0, kept).join(join) + join);

  const windowElement = document.createElement('span');
  windowElement.className = 'konbini-title__window';
  windowElement.style.maxWidth = `${Math.floor(lineWidth - sizeWidth - 1)}px`;
  const inner = document.createElement('span');
  inner.className = 'konbini-title__rest';
  inner.textContent = words.slice(kept).join(join);
  windowElement.append(inner);
  title.append(windowElement);

  if (size) title.append(' ', sizeElement(size));

  // A slow, even pace, like a prompter: 30px a second, never under 2s.
  const shift = windowElement.scrollWidth - windowElement.clientWidth;
  windowElement.style.setProperty('--konbini-title-shift', `${-shift}px`);
  windowElement.style.setProperty('--konbini-title-duration', `${Math.max(2, shift / 30 + 1.2).toFixed(2)}s`);
}

/**
 * Cards grouped into visual rows by their top edge.
 * @param {Element} grid
 */
function rowsOf(grid) {
  /** @type {Map<number, HTMLElement[]>} */
  const rows = new Map();
  for (const card of grid.querySelectorAll('product-card')) {
    if (!(card instanceof HTMLElement) || card.offsetParent === null) continue;
    const top = Math.round(card.getBoundingClientRect().top + window.scrollY);
    const row = rows.get(top) ?? [];
    row.push(card);
    rows.set(top, row);
  }
  return [...rows.values()];
}

function run() {
  for (const title of document.querySelectorAll(`product-card ${TITLE}`)) {
    if (title instanceof HTMLElement) restore(title);
  }

  // The workbench can switch both rules off, to compare against plain CSS.
  if (document.documentElement.dataset.konbiniFit === 'off') return;

  // Rule 1: titles over the clamp, anywhere a card appears.
  for (const title of document.querySelectorAll(`product-card ${TITLE}`)) {
    if (!(title instanceof HTMLElement) || title.offsetParent === null) continue;
    const clamp = clampOf(title);
    if (clamp !== Infinity && measure(title).natural > clamp) fit(title, clamp);
  }

  // Rule 2: one short line making one card taller than its row.
  for (const grid of document.querySelectorAll(GRID)) {
    for (const row of rowsOf(grid)) {
      if (row.length < 2) continue;

      const measured = row.flatMap((card) => {
        const title = card.querySelector(TITLE);
        return title instanceof HTMLElement ? [{ title, lines: measure(title) }] : [];
      });
      if (measured.length < 2) continue;

      const max = Math.max(...measured.map((item) => item.lines.shown));
      const tallest = measured.filter((item) => item.lines.shown === max);
      const next = Math.max(0, ...measured.filter((item) => item.lines.shown < max).map((item) => item.lines.shown));
      const only = tallest[0];

      if (tallest.length !== 1 || !only || max - next !== 1 || next < 1) continue;
      if (only.title.dataset.konbiniTitle !== undefined) continue;
      if (only.lines.tail >= SHORT_LAST_LINE) continue;

      fit(only.title, next);
    }
  }
}

let queued = false;
function soon() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    run();
  });
}

// Width changes re-wrap titles. Height-only changes (mobile browser bars) do not.
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  soon();
});

// Filtering, sorting and paging replace cards inside the grid.
const observer = new MutationObserver((mutations) => {
  const cardsChanged = mutations.some((mutation) =>
    [...mutation.addedNodes].some(
      (node) => node instanceof Element && (node.matches('product-card, li') || node.querySelector('product-card') !== null)
    )
  );
  if (cardsChanged) soon();
});
observer.observe(document.body, { childList: true, subtree: true });

// The workbench swaps titles and switches without touching the grid.
window.addEventListener('konbini:cards-changed', soon);

document.fonts?.ready.then(soon);
soon();
