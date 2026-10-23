# A standalone host

Run from the brandkit checkout:

```sh
npm run example:printer
```

This is a plain JavaScript page, with no dependency on brandkit's app, its brand
menu, its manual library or React. It uses the public `brandkit/printer`,
`brandkit/printer/bridge` and `brandkit/printer/vite` entry points, imports the
OTE example or an uploaded package, and opens the full printer using the same
protocol as brandkit.

For a static build:

```sh
node scripts/build-template-printer.mjs --dev
npx vite build --config examples/template-printer-host/vite.config.js
```

The resulting `dist/` in this example contains the host, the example package
and the entire printer. Set `BASE_PATH` for both build commands to change the
deployment prefix. The build plugin accepts the upstream frontend directory,
output directory and mount; no OTE or brandkit path is required by the library.

Other repositories can install brandkit from Git or include it as a submodule
and alias these public entry points to `src/printer/{package,bridge,vite}.js`.
See [the integration guide](../../docs/template-printer.md) for the API.
