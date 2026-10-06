# One Shot identity

The visual direction is a vintage baseball club: cream flannel, fine navy pinstripes, sweeping script lettering, red piping, stitched badges and condensed scoreboard numbers. One Shot has an original team wordmark with an underline tail and a baseball-shaped number-one crest. Cards use restrained corners and double rules.

Reference direction: [Milwaukee's cream and pinstripe uniform story](https://view.ceros.com/mlb/brewers-glove-story) and [St. Louis's vintage powder-blue uniforms](https://www.mlb.com/cardinals/news/cardinals-bring-back-powder-blue-uniforms-c300910936). These inform the material and palette; the app uses original artwork and lettering rather than copied team logos.

## Palette

| Role             | Light               | Dark                  |
| ---------------- | ------------------- | --------------------- |
| Background       | Cream `#ECE5D5`     | Midnight `#151E29`    |
| Surface          | Flannel `#FAF4E6`   | Navy `#1D2A39`        |
| Text             | Ink `#20334C`       | White `#F2F4F6`       |
| Blue accent      | Navy `#24486E`      | Powder blue `#A3BFDC` |
| Primary action   | Faded red `#A43E36` | Blue `#446C98`        |
| Secondary signal | Red `#A43E36`       | White `#E2E8F0`       |

Dark mode removes cream and red from both the interface and mascot accents. Functional errors and destructive actions retain explicit wording and icons so they do not depend solely on color.

## Typography

[Yesteryear](https://fontsource.org/fonts/yesteryear/about) supplies the connected jersey-style script in the original One Shot wordmark and mascot cap monograms. [Barlow Condensed](https://fontsource.org/fonts/barlow-condensed/use) supplies section headlines and scoreboard numbers. [IBM Plex Sans](https://www.ibm.com/design/language/typography/typeface/) supplies body text, controls and navigation. Fonts are locally bundled, including in the standalone ChatGPT widget; no Google Fonts requests are necessary. Six Latin font weights across the three families are included. Original font licenses are included in `docs/licenses` and copied into `dist/licenses` with every build.

## Two playable character concepts

**Slugger:** a blue trivia slug with inquisitive eye stalks, expressive eyebrows, two little arms, a single tooth, a baseball cap and a pinstriped number-01 jersey. The joke is the contrast between a slow creature and quick knowledge. Default selection.

**Stubbs:** a walking admission ticket with arms, sneakers, perforated edges, a number 01 and a monogrammed baseball cap. The admission ticket ties directly to the daily show’s one-entry rule.

These are original vector characters built as separate SVG parts, not raster puppets or a ChatGPT Work pet. Switch between them under “Meet the home team.” Selection is saved on the current browser/device.

## Reactions

- Pointer motion: pupils look toward the pointer; the body leans subtly. Motion is bounded, driven by animation frames, and idle listeners are removed on unmount.
- Hover/tap/keyboard activation: a short wave.
- Theme switch: a greeting, plus automatic ink/paper/cap recoloring.
- Answer locked: a waiting/thinking pose.
- Correct answer or completed game: a finite celebratory hop and accent marks.
- Miss: a small shake and a disappointed mouth, followed by encouraging copy.
- Last six seconds: a restrained urgent bounce.
- Reduced-motion preference: no blinking, leaning, waves, hops or shakes; static expressions and copy still communicate state.

Mascot responses follow already revealed game state and cannot expose a pending ranked answer. Character interactions do not call the AI service or spend API credits.
