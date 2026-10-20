[Home](../README.md) / Getting Started
## Run locally

From this directory:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

Use a local server. Opening `index.html` directly can block ES module imports.

If npm is installed, `npm start` runs the same server.

## Tests

Install Node.js 20 or newer, then:

```bash
node --test
```

Or, with npm:

```bash
npm test
```

## Production

There is no compile step. `index.html`, `register.html`, `css/styles.css`, `js/register.js`, and `js/app.js` are the production application.

Copy those files to any static host and preserve the paths. To preview the production files locally, use the same Python server as above.

## Project layout

- `index.html` — program menu
- `register.html` — 16-bit data register
- `css/styles.css` — industrial dark theme
- `js/register.js` — 16-bit conversions and explanations
- `js/app.js` — register interaction
- `tests/register.test.js` — conversion tests

This version is the 16-bit visualizer only. The conversion module is the place to extend later for wider integers, floating point, or adjacent registers.
