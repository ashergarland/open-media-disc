# OMD Studio Font Guidance

## Decision

OMD Studio should use open-source fonts for the live user interface.

This avoids proprietary app-embedding licenses, allows the fonts to be bundled with the application, keeps the project compatible with open-source distribution, and ensures consistent rendering across Windows, macOS, Linux, Raspberry Pi, and web-based prototypes.

## Recommended Font Pairing

### Primary UI font

**Nunito Sans**

Use for:

- Buttons
- Navigation
- Labels
- Metadata
- Track lists
- Forms
- Tooltips
- Status text
- Body copy

Recommended weights:

- 400: body copy
- 500: secondary interface text
- 600: controls and metadata
- 700: buttons and selected navigation
- 800: compact labels used sparingly

### Display font

**Manrope**

Use for:

- Screen titles
- Section headings
- Album titles
- Large numeric readouts
- Prominent status messages

Recommended weights:

- 600: standard headings
- 700: major headings
- 800: branding emphasis used sparingly

## Do Not Use Generic Heavy Fallbacks for the Logo

Do not render the OMD wordmark using fonts such as:

- Arial Black
- Impact
- Trebuchet MS
- Generic system bold text

The OMD logo should be original SVG artwork rather than live text. This preserves the custom proportions, spacing, chrome treatment, and recognizable brand shape without creating a font licensing dependency.

## Prototype CDN Setup

For browser prototypes and AI-agent reference files, load the fonts from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Nunito+Sans:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
>
```

Then define shared font tokens:

```css
:root {
  --font-ui:
    "Nunito Sans",
    "Segoe UI Variable",
    "Segoe UI",
    sans-serif;

  --font-display:
    "Manrope",
    "Segoe UI Variable Display",
    "Segoe UI",
    sans-serif;
}

body {
  font-family: var(--font-ui);
}

h1,
h2,
h3,
.display-text {
  font-family: var(--font-display);
}
```

## Production Application Setup

For the final desktop or embedded application, bundle the open-source `.woff2` files with the app instead of relying on a CDN.

Suggested structure:

```text
app/
  assets/
    fonts/
      NunitoSans-VariableFont.woff2
      Manrope-VariableFont.woff2
      OFL-NunitoSans.txt
      OFL-Manrope.txt
```

Use local `@font-face` declarations:

```css
@font-face {
  font-family: "OMD UI";
  src: url("./assets/fonts/NunitoSans-VariableFont.woff2")
       format("woff2");
  font-style: normal;
  font-weight: 200 1000;
  font-display: swap;
}

@font-face {
  font-family: "OMD Display";
  src: url("./assets/fonts/Manrope-VariableFont.woff2")
       format("woff2");
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
}

:root {
  --font-ui: "OMD UI", "Segoe UI Variable", "Segoe UI", sans-serif;
  --font-display: "OMD Display", "Segoe UI Variable Display", "Segoe UI", sans-serif;
}
```

## Typography Rules

### Weight

Avoid making every label bold.

Use:

- 400–500 for supporting information
- 600 for normal controls
- 700 for primary actions and selected navigation
- 800 only for small emphasis labels or major branding moments

### Tracking

Use tight or neutral tracking for large display text:

```css
.heading {
  letter-spacing: -0.025em;
}
```

Use slight positive tracking for compact uppercase labels:

```css
.eyebrow,
.section-label {
  letter-spacing: 0.10em;
  text-transform: uppercase;
}
```

Do not add wide tracking to ordinary body text or buttons.

### Line Height

Recommended defaults:

```css
body {
  line-height: 1.45;
}

button,
.nav-item,
.badge {
  line-height: 1;
}

.body-copy {
  line-height: 1.55;
}
```

### Numeric Data

Use tabular numerals for:

- Track durations
- Playback timers
- Percentages
- Capacity readouts
- Sample rates
- Bit depths
- VU labels

```css
.duration,
.timer,
.percentage,
.capacity {
  font-variant-numeric: tabular-nums;
}
```

### Rendering

Use:

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

Do not rely on text shadows to compensate for poor type selection. Text shadows should be subtle and support the glossy interface rather than blur the letterforms.

## Button Typography

Primary buttons should generally use:

```css
.aero-button {
  font-family: var(--font-ui);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
}
```

Large touch-oriented buttons may use 17–19 px.

Avoid excessive boldness. The button's visual strength should come primarily from the glass volume, lighting, border glow, and color—not oversized or overly heavy text.

## Suggested Type Scale

```css
:root {
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 42px;
}
```

Typical use:

- 12 px: metadata labels, compact status text
- 14 px: secondary controls and descriptions
- 16 px: normal UI and buttons
- 18 px: large touch controls
- 24 px: section headings
- 32 px: album or screen titles
- 42 px: hero titles and major playback displays

## Licensing Notes

Nunito Sans and Manrope are open-source fonts available through Google Fonts and are suitable for commercial use and redistribution under their respective open-font licenses.

When bundling fonts:

- Keep the license text in the repository and application notices
- Preserve copyright and license information
- Do not redistribute unrelated proprietary font files
- Do not rename or modify a font in conflict with a reserved font name in its license

## Final Recommendation

Use:

```css
--font-ui: "Nunito Sans";
--font-display: "Manrope";
```

Use the CDN only for prototypes.

Bundle local `.woff2` files for production.

Use an original SVG for the OMD logo.
