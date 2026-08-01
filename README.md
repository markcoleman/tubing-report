# Riverwise

Riverwise is a static location-based weather and water report designed for GitHub Pages. It combines a worldwide seven-day forecast from Open-Meteo with recent observations from nearby active USGS stream gauges.

## What it does

- Searches by city, state, or ZIP code
- Uses browser location when permitted
- Shows current weather and a seven-day outlook
- Finds the four nearest active USGS stream gauges in an approximately 50-mile search area
- Displays discharge, gauge height, water temperature, and a 24-hour discharge trend when reported
- Links every gauge back to its official USGS monitoring page

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Run `npm run build` to create the static site in `dist/`.

## Publish on GitHub Pages

The included workflow builds and deploys the site whenever `main` is pushed. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

No API keys are required. The app makes browser-side requests to the public Open-Meteo and USGS services. USGS stream-gauge coverage is limited to the United States and territories.

## Data and safety

Weather data is provided by [Open-Meteo](https://open-meteo.com/). Water observations are provided by the [U.S. Geological Survey](https://waterdata.usgs.gov/).

Riverwise is a planning aid, not a flood-warning or emergency service. A gauge reading alone does not indicate that a route is safe.
