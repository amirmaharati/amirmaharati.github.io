# amirmaharati.github.io — rebuild notes

Replace `index.html`, `styles.css` and `main.js` in the repo root, and add
`assets/favicon.svg`. Keep your existing `assets/header.jpg` and
`assets/CV-Main.pdf` — the new markup still points at both. `assets/bg.png`
and `assets/about.jpg` are no longer referenced; you can delete them or leave
them in place.

Also add an empty file named `.nojekyll` in the repo root so GitHub Pages
serves the files as-is.

---

## Verify before you publish

**Publication years were inferred from the DOI strings** (e.g. `10.1016/j.prp.2023.154538` → 2023).
That convention is reliable for Elsevier and Springer but is not guaranteed.
Check every year against your own records — a wrong year on a CV site is worse
than no year at all.

Other content changes to confirm:

- "Post-doctoral Research Fellow" → **"Research Fellow"**. International
  reviewers read "post-doctoral" as requiring a completed doctorate, and the
  April 2025 start date sits before your MD completion.
- "Undergraduate Research Assistant" → **"Research Assistant"** (you had already
  started your MD).
- Author lists standardised to `Surname Initial` throughout, with your own name
  in bold red.
- Typo fixed: "Esophageal Squampus" → "oesophageal squamous".
- "Endoscopic & Minimally Invasive Research Center" expanded to
  "…Surgery Research Center" — correct this if the official name differs.
- Add your **ORCID iD**. There's a `TODO` comment in the contact section
  marking where it goes. Journals and funders use it as your primary identifier.

## Impact factors

Every IF is still shown, as a small chip. If you apply somewhere that follows
DORA (most Western institutions), add `class="no-if"` to the `<body>` tag and
all 30 IF chips disappear without touching any other markup:

```html
<body class="no-if">
```

---

## What changed technically

### Bugs fixed
- Unclosed `<div>`s and nested `<p>` tags in the About section.
- `<strong></strong>…</strong>` malformed tags in the Research Experience card.
- `grid-area: 1/3/2/6` on a four-column grid, which created a phantom fifth
  column and pushed the portrait past the viewport.
- `.exp__group__title` was declared four times with conflicting `left: 50%` and
  `transform` rules — a horizontal-overflow risk on narrow screens.
- Heading hierarchy no longer jumps `h2 → h4`.
- `img { display: flex }` → `display: block`.
- ~120 lines of dead CSS removed (`.portfolio__*` had no matching HTML).

### Dependencies
Both CDNs are gone. No ScrollReveal, no Remix Icon. That removes the failure
mode where a blocked or slow CDN left your name invisible, and it removes an
unpinned `unpkg` import that could change under you at any time.

### Accessibility
- Hamburger is a real `<button>` with `aria-expanded`, Escape to close, and a
  focus-visible ring.
- Skip link, `role="status"` announcements on the publication filter, and
  descriptive `aria-label`s on every icon-only control.
- All tap targets ≥ 44px.
- `prefers-reduced-motion` fully respected; a print stylesheet is included.

### Motion
Written to the principles of the `oil-motion` skill, without its video
pipeline (see the chat for why that pipeline doesn't apply here):

- The rest state is the **visible** state. The hidden state only exists once JS
  confirms it is running, so a script error can never blank the page.
- Scroll is normalised to a 0–1 parameter, damped toward a target, and written
  to the DOM at most once per `requestAnimationFrame` — and only when the
  rounded value actually changed.
- Pointer parallax is a clamped 2D parameter, disabled on touch and under
  reduced motion, with dead-centre as its rest position.

### The coverage track
The strip under the hero is generated from the publication list itself: one bar
per paper, grouped by year, bar height scaled to journal impact factor, each
year labelled with its own count. If you add a publication to the HTML, the
track updates automatically — there is no hard-coded data anywhere.
