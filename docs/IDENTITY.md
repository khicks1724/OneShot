# One Shot identity

The visual direction is a printed game-show poster: broad margins, flat ink, a cream stock, condensed headlines and a friendly illustrated sidekick. Cards use restrained corners and rules instead of luminous gradients.

## Palette

| Role             | Light               | Dark                |
| ---------------- | ------------------- | ------------------- |
| Background       | Cream `#F0EADF`     | Charcoal `#171B20`  |
| Surface          | Paper `#FAF7EF`     | Slate `#21262D`     |
| Text             | Ink `#232B36`       | White `#F2F4F6`     |
| Blue accent      | Cobalt `#245BB7`    | Pale blue `#91B7F3` |
| Primary action   | Brick red `#B53E35` | Blue `#426EC0`      |
| Secondary signal | Red `#AD3B32`       | White `#E2E8F0`     |

Dark mode removes cream and red from both the interface and mascot accents. Functional errors and destructive actions retain explicit wording and icons so they do not depend solely on color.

## Typography

[Barlow Condensed](https://fontsource.org/fonts/barlow-condensed/use) supplies the wordmark and display headlines. [IBM Plex Sans](https://www.ibm.com/design/language/typography/typeface/) supplies body text, controls and navigation. Fonts are locally bundled, including in the standalone ChatGPT widget; no Google Fonts requests are necessary. Five Latin font weights are included. Original font licenses are included in `docs/licenses` and copied into `dist/licenses` with every build.

## Two playable character concepts

**Slugger:** a blue trivia slug with inquisitive eye stalks, expressive eyebrows, two little arms, a single tooth and a number-one jersey patch. The joke is the contrast between a slow creature and quick knowledge. Default selection.

**Stubbs:** a walking admission ticket with arms, sneakers, perforated edges, a number 01 and a cap. The admission ticket ties directly to the daily show’s one-entry rule.

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
