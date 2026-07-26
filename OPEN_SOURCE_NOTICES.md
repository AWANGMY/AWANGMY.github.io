# Open-source notices

This portfolio is built for static GitHub Pages hosting and does not depend on
paid or proprietary design platforms.

## Runtime dependency

- [Three.js](https://github.com/mrdoob/three.js), version 0.180.0 — MIT License
  - Vendored module: `assets/vendor/three.module.min.js`
  - Vendored core: `assets/vendor/three.core.min.js`
  - License text: `assets/vendor/THREE-LICENSE.txt`

The page layout, animation logic, procedural 3D avatar, and canvas graphics are
implemented directly in this repository with HTML, CSS, JavaScript, WebGL, and
browser APIs.

## Asset-production tools

- [rembg](https://github.com/danielgatis/rembg), version 2.0.77 — MIT License
- [U²-Net](https://github.com/xuebinqin/U-2-Net) human segmentation model — Apache-2.0 License

These tools were used locally to produce the transparent football-player PNG.
Neither the inference runtime nor model weights are shipped with the website.

## Character-design references

No third-party character mesh is shipped with this site. The procedural avatar
uses original Three.js geometry, with anatomy and proportion studies informed by
these CC0 reference libraries:

- [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) — CC0
- [Quaternius Farm Animal Pack](https://quaternius.com/packs/farmanimal.html) — CC0
- [OpenGameArt Simple Cat](https://opengameart.org/content/simple-cat) by drummyfish — CC0
