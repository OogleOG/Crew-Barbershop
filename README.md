<div align="center">

# Crew Barbershop

**Cinematic 3D-scroll website for a barbershop in Normanton, West Yorkshire.**

Zero dependencies · Zero build step · One HTML file, one stylesheet, one script

[![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=000)](js/app.js)
[![No build step](https://img.shields.io/badge/build%20step-none-08080a?style=flat-square)](#quick-start)
[![Dependencies](https://img.shields.io/badge/dependencies-0-08080a?style=flat-square)](#quick-start)
[![Structured data](https://img.shields.io/badge/schema.org-HairSalon-4a4a54?style=flat-square)](#getting-found)
[![a11y](https://img.shields.io/badge/prefers--reduced--motion-supported-4a4a54?style=flat-square)](#accessibility)

<img src="docs/preview/hero.jpg" alt="Crew Barbershop hero — the CREW wordmark set large in a Didone serif over a dark barbershop plate" width="100%">

</div>

---

## Contents

- [Quick start](#quick-start)
- [Preview](#preview)
- [Before you go live](#before-you-go-live)
- [Project structure](#project-structure)
- [The scroll engine](#the-scroll-engine)
- [Video pipeline](#video-pipeline)
- [Customising](#customising)
- [Getting found](#getting-found)
- [Accessibility](#accessibility)
- [Deploying](#deploying)
- [Browser support](#browser-support)
- [Licence](#licence)

---

## Quick start

No install, no bundler, no package manager. Clone it and open the file:

```bash
git clone <your-repo-url>
cd Crew
```

Then either double-click `index.html`, or serve the folder (recommended — some
browsers restrict video and font loading over `file://`):

```bash
python -m http.server 8000
# or
npx serve .
```

Open <http://localhost:8000>.

---

## Preview

| The Cuts — 3D corridor | The Menu |
|---|---|
| <img src="docs/preview/cuts.jpg" alt="Six haircut cards flying past the camera in 3D space with depth-of-field blur" width="100%"> | <img src="docs/preview/menu.jpg" alt="Services and prices set in large Didone type on a white ground" width="100%"> |

| The Crew | Visit |
|---|---|
| <img src="docs/preview/crew.jpg" alt="Two barber cards with 3D pointer tilt" width="100%"> | <img src="docs/preview/visit.jpg" alt="Address, opening hours and booking call to action" width="100%"> |

<details>
<summary><b>More screens</b> — word tunnel, footer, mobile</summary>
<br>

| Manifesto word tunnel | Footer |
|---|---|
| <img src="docs/preview/tunnel.jpg" alt="The word PRECISION flying toward the camera with PATIENCE faint behind it" width="100%"> | <img src="docs/preview/footer.jpg" alt="Large CREW BARBERSHOP wordmark set as live type" width="100%"> |

<div align="center">
<img src="docs/preview/mobile.jpg" alt="Mobile hero" width="270">
&nbsp;&nbsp;
<img src="docs/preview/mobile-visit.jpg" alt="Mobile visit section with sticky booking bar" width="270">
</div>

</details>

> [!NOTE]
> Screens show the **procedural fallback artwork**, not final footage. See
> [Video pipeline](#video-pipeline) — the site is designed to look finished
> with an empty `asset/video/` folder.

---

## Before you go live

> [!WARNING]
> **Opening hours are placeholders.** Booksy does not publish the weekly schedule,
> so the hours table is filled with plausible times and flagged on-page with a
> visible `verify before launch` badge. Replace them in **two** places or Google
> will serve the wrong times:
>
> 1. the `<ul class="hours">` block in `index.html` (Visit section)
> 2. the `openingHoursSpecification` array in the JSON-LD at the bottom of `index.html`
>
> Then delete the `<span class="tbc">` badge.

| | Task |
|---|---|
| ☐ | Replace the placeholder opening hours (both places above) |
| ☐ | Find-and-replace `https://crewbarbershop.co.uk/` with the real domain in `index.html`, `robots.txt`, `sitemap.xml` |
| ☐ | Replace the illustrative review quotes with real ones — see note below |
| ☐ | Confirm the JSON-LD map coordinates (`53.6975, -1.4119` is approximate for Market Place) |
| ☐ | Add a phone number to the Visit section and as `"telephone"` in the JSON-LD |
| ☐ | Render and compress the 13 video clips ([`SEEDANCE-PROMPTS.md`](SEEDANCE-PROMPTS.md)) |
| ☐ | Read the copy aloud — make sure it sounds like Crew |

> [!IMPORTANT]
> The quotes in the Reviews section are **illustrative**, written in the style of
> the Booksy reviews. They are not verbatim customer quotes. Replace them with
> real ones, or leave the section pointing at Booksy as it already does. Do not
> present invented quotes as genuine reviews.
>
> The 5.0 rating and 99 review count **are** real, taken from the live Booksy profile.

---

## Project structure

```
.
├── index.html               # the entire page, incl. JSON-LD structured data
├── css/style.css            # styling, 3D scenes, procedural fallback artwork
├── js/app.js                # scroll engine, lazy video, reveals, drawer
├── asset/
│   ├── logo.webp            # original supplied logo (untouched)
│   ├── logo-light.png       # wordmark, white on transparent   ← generated
│   ├── logo-dark.png        # wordmark, black on transparent   ← generated
│   ├── favicon-180.png      # favicon / apple-touch-icon       ← generated
│   ├── img/og.jpg           # 1200×630 social share card       ← generated
│   └── video/               # ← drop the 13 Seedance clips here
├── docs/preview/            # README screenshots only, not used by the site
├── SEEDANCE-PROMPTS.md      # shot list + prompts, 1080p / no audio
├── robots.txt
└── sitemap.xml
```

**On the logo:** the supplied `logo.webp` has a solid grey background, which cannot
sit on a black page. The two transparent PNGs were derived from it by mapping
luminance to alpha, then cropping to the wordmark. The original is untouched.

The footer wordmark is set as **live type**, not the bitmap — the supplied logo is
only 319px wide and goes visibly soft at full-bleed. Supply an SVG or high-res
version and you can swap the real asset back in there.

---

## The scroll engine

Native scroll with `position: sticky` pinning — **not** a transform-hijacked
smooth-scroll wrapper. That keeps anchor links, keyboard navigation, browser
find-in-page and mobile momentum all working normally. The cinematic feel comes
from lerping the *animated values* inside a single `requestAnimationFrame` loop,
never from moving the page itself.

```
scrollY  ──►  smoothY (lerp 0.115)  ──►  per-scene progress 0…1  ──►  transforms
```

Three scenes share a **virtual-camera model**: elements sit at fixed world-Z
positions and a camera flies through them, so `translateZ` is *derived* from
scroll rather than keyframed by hand.

| Scene | Height | What happens |
|---|---|---|
| **Hero** | `230vh` | Camera pushes into the plate, letterbox bars open then close, title dissolves |
| **Manifesto** | `260vh` | Four words fly past the lens; copy owns the final 28% (`T_PHASE`) |
| **The Cuts** | `520vh` | Six cards fly from Z −3200 → +780 with depth-of-field blur |

Tuning constants sit at the top of each render function in [`js/app.js`](js/app.js):

```js
const T_GAP = 2200, T_START = -2800, T_END = 520;   // word tunnel
const C_GAP = 620,  C_START = -3200, C_END = 780;   // cuts corridor
```

- **`_GAP`** — world-space distance between elements. Larger = more separation,
  fewer things on screen at once.
- **`_START` / `_END`** — where the camera begins and ends relative to the first
  element. `_END` controls how far past the lens things fly before culling.
- **Scene pace** — change the section `height` in `css/style.css`. Taller = slower.

---

## Video pipeline

Every `<video>` uses `data-src`, **not** `src`. [`js/app.js`](js/app.js) loads each
clip when it comes within 320px of the viewport, and **removes the element entirely
if the file 404s** — the procedural CSS artwork underneath then shows instead.

```
IntersectionObserver ─► set src ─┬─► canplay ─► fade in, play, loop
                                 └─► error   ─► remove element, keep CSS artwork
```

That is why the site looks finished with an empty `asset/video/` folder, and why
you can ship clips **one at a time** without touching any code.

All footage is graded in CSS (`filter: grayscale(1) contrast(1.12)`), so rendering
in colour just wastes tokens.

See [`SEEDANCE-PROMPTS.md`](SEEDANCE-PROMPTS.md) for all 13 shots with prompts,
locked to 1080p / no audio / seamless loop — plus the compression step:

```bash
ffmpeg -i in.mp4 -an -c:v libx264 -crf 26 -preset slow \
       -pix_fmt yuv420p -movflags +faststart out.mp4
```

That step is **not optional** if you care about mobile. Target under 3 MB per clip,
5 MB for the hero.

---

## Customising

**Palette** — every colour is a custom property at the top of `css/style.css`.
The design is deliberately two-colour; there is no accent.

```css
--ink:   #08080a;   /* black  */
--paper: #f6f5f2;   /* white  */
--ash:   #8a8a8e;   /* muted  */
```

**Type** — Bodoni Moda (Didone, echoing the wordmark) + Archivo, loaded from
Google Fonts with a graceful offline fallback to Didot / Georgia.

```css
--display: "Bodoni Moda", "Didot", "Bodoni MT", "Times New Roman", serif;
--ui:      "Archivo", "Helvetica Neue", Inter, system-ui, sans-serif;
```

**Services** — the six `.card` blocks in `index.html`. If you change a price,
update the matching `hasOfferCatalog` entry in the JSON-LD too.

**Booking link** — the Booksy URL appears in eight places. Find-and-replace it.

---

## Getting found

Already in place:

- `HairSalon` JSON-LD — address, geo, all six services with prices, both barbers,
  the 5.0 / 99 rating, and a `ReserveAction` pointing at Booksy
- Open Graph + Twitter cards with a generated 1200×630 share image
- Semantic headings, real `<address>`, descriptive alt text
- `sitemap.xml` and `robots.txt`
- Booksy call-to-action in eight places, including every service card

Highest-leverage work left, roughly in order:

1. **Google Business Profile.** A bigger local-search win than the site itself.
   Identical name / address / phone to the site. Post photos weekly.
2. **Real photography.** Swap generated clips for actual cuts from the shop.
   Original imagery outperforms anything generated, and it is what customers
   actually want to see.
3. **Add a phone number.** Booksy does not list one, so there is currently no way
   to call the shop.
4. **Get some of those 99 Booksy reviews onto Google too.**

---

## Accessibility

- `prefers-reduced-motion: reduce` collapses all three 3D scenes into a plain
  stacked grid. Verified: document height drops from 15469px → 8990px, all six
  cut cards render static and visible, the word tunnel is hidden, and every
  reveal is forced to its final state.
- Native scroll means keyboard navigation, browser find-in-page and anchor links
  all behave normally.
- Mobile drawer manages `aria-expanded` / `aria-hidden`, locks body scroll, and
  closes on <kbd>Esc</kbd>.
- Visible `:focus-visible` rings throughout. Decorative layers are `aria-hidden`.

---

## Deploying

Any static host. No build command, no output directory.

<details>
<summary><b>GitHub Pages</b></summary>

Settings → Pages → Source: `main` branch, `/ (root)`. Done.
</details>

<details>
<summary><b>Netlify / Vercel</b></summary>

Drag the folder onto the dashboard, or connect the repo. Leave the build command
empty and set the publish directory to the repo root.
</details>

<details>
<summary><b>Traditional hosting</b></summary>

Upload the folder contents to `public_html`. Make sure `.mp4` is served with
`Content-Type: video/mp4` and enable gzip/brotli for `.css` / `.js`.
</details>

---

## Browser support

Chrome, Edge, Safari and Firefox — current versions. Uses `IntersectionObserver`,
CSS 3D transforms, `position: sticky`, `aspect-ratio` and `clamp()`. No polyfills,
no transpilation.

---

## Licence

The **code** in this repository is free for the site owner to use, modify and
deploy without restriction.

The **brand assets** — the Crew Barbershop name, the wordmark in `asset/`, and all
derived logo files — belong to Crew Barbershop and are not covered by any open
licence. Do not reuse them.

No licence file is included; add one that matches how you intend to publish this
repo before making it public.
