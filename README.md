# Mingyang Wang — Personal portfolio

A static, scroll-driven research portfolio for GitHub Pages. The fixed
procedural Three.js character changes pose, orientation, and accent color as the
reader moves through the research story; project cards add lightweight canvas
and CSS interactions.

## Local preview

From this directory, run:

```powershell
python -m http.server 8765
```

Then open <http://localhost:8765>. A local server is required because the 3D
scene is loaded as an ES module.

## Stack

- Semantic HTML and responsive CSS
- Native JavaScript, Canvas 2D, Intersection Observer, and reduced-motion support
- Vendored Three.js 0.180.0 modules under the MIT License
- Static assets already owned by this portfolio

See [OPEN_SOURCE_NOTICES.md](./OPEN_SOURCE_NOTICES.md) for dependency details.
