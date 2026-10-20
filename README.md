# 16-bit PLC Data Register Visualizer

An interactive tool for the 16-bit pattern stored in a PLC data register. Signed INT16, unsigned UINT16, and hexadecimal are readings of that same pattern. Changing the reading does not change the bits. The home page is a menu of programs. The 16-bit data register is the first entry.

## Technology stack

The page is static HTML, CSS, and JavaScript ES modules. There is no framework, backend, database, or package install.

A framework would not simplify this screen. The whole model is one integer in the range 0 to 65535, and every control derives its display from that integer. The conversion rules live in `js/register.js`. The page and the automated tests both import that module, so the classroom tool and the tests cannot drift apart.

Python 3 serves the files locally. It is already available on this machine, and the application itself still runs entirely in the browser. Node.js is used only as a test runner, through the built-in `node:test` module, so the tests add no dependencies.

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

The tests cover the edge patterns below, a round-trip of all 65536 patterns, bit toggles, slider reinterpretation, presets, rejected out-of-range input, hex prefixes, leading zeros, bit weights, nibble grouping, and two's complement including -32768.

| Raw HEX | INT16 | UINT16 |
|---|---:|---:|
| 0x0000 | 0 | 0 |
| 0x0001 | 1 | 1 |
| 0x7FFF | 32767 | 32767 |
| 0x8000 | -32768 | 32768 |
| 0xFFFF | -1 | 65535 |
| 0xFF9C | -100 | 65436 |

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
