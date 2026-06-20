# JPE Wrestling GM

Single-file, retro wrestling management browser game. The entire app lives in `index.html` (inline HTML, CSS, and JS). There is no build system, package manager, dependencies, lint config, or automated tests.

## Cursor Cloud specific instructions

- This is a static, dependency-free single-file app (`index.html`). There is nothing to install, build, lint, or test. The update script is intentionally a no-op.
- To run it in development, serve the repo root over HTTP and open `index.html` (do not rely on `file://`, since the game uses `localStorage` and the README mentions PWA install — both behave best over `http://`):
  - `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/index.html`.
- Game state persists in the browser's `localStorage`. To start fresh, clear site data or run `JPE.reset()` in the browser console. See the README "Dev Console Commands" for the `JPE.*` debug helpers.
- Booking gotcha: the show simulator requires at least 3 matches booked on the Segments screen before "SIMULATE SHOW" will run.
- A `404` for `/favicon.ico` in the console is expected and harmless.
