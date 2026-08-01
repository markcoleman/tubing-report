import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Location = {
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type CurrentWeather = {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
};

type Weather = {
  current: CurrentWeather;
  current_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

type WaterValue = { value: string; dateTime: string; qualifiers?: string[] };

type UsgsSeries = {
  sourceInfo: {
    siteName: string;
    siteCode: Array<{ value: string }>;
    geoLocation: {
      geogLocation: { latitude: number; longitude: number };
    };
  };
  variable: {
    variableCode: Array<{ value: string }>;
    unit: { unitCode: string };
  };
  values: Array<{ value: WaterValue[] }>;
};

type GaugeMetric = {
  value: number;
  unit: string;
  time: string;
  series: number[];
};

type Gauge = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  discharge?: GaugeMetric;
  height?: GaugeMetric;
  waterTemperature?: GaugeMetric;
};

type Report = {
  location: Location;
  weather: Weather;
  gauges: Gauge[];
  waterError?: string;
  fetchedAt: Date;
};

const DEFAULT_LOCATION: Location = {
  name: "Lewisberry",
  admin1: "Pennsylvania",
  country: "United States",
  country_code: "US",
  latitude: 40.13509,
  longitude: -76.85969,
  timezone: "America/New_York",
};

const yellowBreechesRoute =
  "M 65 350.9 C 74.1 351.5, 107.2 350.9, 119.9 354.7 C 132.6 358.5, 124.8 367.8, 141.4 373.5 C 157.9 379.2, 201 383.6, 219.2 389 C 237.5 394.4, 244.5 399.9, 250.8 406 C 257 412.1, 250.6 420.6, 256.7 425.5 C 262.8 430.3, 271.4 438.4, 287.5 435 C 303.6 431.6, 340.7 411.7, 353.1 405.2 C 365.5 398.7, 358.7 403, 361.7 396 C 364.8 389, 364 375.2, 371.3 363.1 C 378.6 351.1, 397.1 331.9, 405.6 323.7 C 414.2 315.6, 418.8 318, 422.7 314.2 C 426.6 310.5, 430.3 307.7, 429.1 301.1 C 428 294.4, 421.5 282.5, 415.6 274.3 C 409.8 266.1, 407.5 256.1, 393.9 252.1 C 380.3 248.1, 347.7 248.9, 334.3 250.4 C 320.9 251.8, 323.8 261.1, 313.4 260.8 C 303.1 260.6, 283.4 255.4, 272.2 248.9 C 260.9 242.3, 255 235.2, 245.9 221.6 C 236.7 208, 222.5 177.3, 217.4 167.2 C 212.3 157.1, 214.3 164, 215.4 160.8 C 216.5 157.6, 210.6 157.2, 223.9 148.2 C 237.2 139.2, 276.2 109.2, 294.9 106.9 C 313.7 104.6, 323.1 127.4, 336.2 134.5 C 349.3 141.6, 347.6 144.5, 373.5 149.3 C 399.3 154.1, 469.1 161, 491.3 163.3 C 513.6 165.6, 502.2 164.6, 507.2 163.3 C 512.1 162, 514.2 163.8, 521 155.4 C 527.8 147, 540.9 121.5, 547.8 113.1 C 554.8 104.8, 547.9 101.7, 562.8 105.2 C 577.7 108.7, 620.5 129.7, 637.3 133.9 C 654 138.2, 653.7 133.5, 663.3 130.6 C 672.9 127.7, 689.7 118.8, 695 116.5";

const floatPlaylist = [
  { title: "Float On", artist: "Modest Mouse", note: "For when the creek handles navigation." },
  { title: "Send Me on My Way", artist: "Rusted Root", note: "Pennsylvania-grown launch energy." },
  { title: "Take Me to the River", artist: "Talking Heads", note: "The title understood the assignment." },
  { title: "Here Comes the Sun", artist: "The Beatles", note: "Deploy only when the forecast agrees." },
  { title: "The Swimming Song", artist: "Loudon Wainwright III", note: "Jaunty, aquatic, suspiciously specific." },
  { title: "Island in the Sun", artist: "Weezer", note: "Your tube is the island. Science." },
];

const floatKit = [
  { glyph: "◎", title: "A properly fitted PFD", note: "Wear it. Looking cool is easier while breathing." },
  { glyph: "◒", title: "Water + sturdy snacks", note: "Hydration for you; sandwiches that can take a jostle." },
  { glyph: "✦", title: "Sunscreen + a hat", note: "The sun is delightful and also a giant laser." },
  { glyph: "▣", title: "A truly dry bag", note: "Phone, keys, meds, and one emergency dry sock." },
  { glyph: "↔", title: "Water shoes + towel", note: "Creek rocks are pointy little overachievers." },
  { glyph: "⌁", title: "A take-out shuttle plan", note: "Leave a car at McCormick before the grand plop-in." },
];

const weatherDescriptions: Record<number, { label: string; glyph: string }> = {
  0: { label: "Clear sky", glyph: "☀" },
  1: { label: "Mostly clear", glyph: "◑" },
  2: { label: "Partly cloudy", glyph: "◒" },
  3: { label: "Overcast", glyph: "●" },
  45: { label: "Foggy", glyph: "≋" },
  48: { label: "Rime fog", glyph: "≋" },
  51: { label: "Light drizzle", glyph: "⋰" },
  53: { label: "Drizzle", glyph: "⋰" },
  55: { label: "Heavy drizzle", glyph: "⋰" },
  56: { label: "Freezing drizzle", glyph: "✣" },
  57: { label: "Freezing drizzle", glyph: "✣" },
  61: { label: "Light rain", glyph: "☂" },
  63: { label: "Rain", glyph: "☂" },
  65: { label: "Heavy rain", glyph: "☂" },
  66: { label: "Freezing rain", glyph: "✣" },
  67: { label: "Freezing rain", glyph: "✣" },
  71: { label: "Light snow", glyph: "✣" },
  73: { label: "Snow", glyph: "✣" },
  75: { label: "Heavy snow", glyph: "✣" },
  77: { label: "Snow grains", glyph: "✣" },
  80: { label: "Rain showers", glyph: "☂" },
  81: { label: "Rain showers", glyph: "☂" },
  82: { label: "Heavy showers", glyph: "☂" },
  85: { label: "Snow showers", glyph: "✣" },
  86: { label: "Heavy snow showers", glyph: "✣" },
  95: { label: "Thunderstorm", glyph: "ϟ" },
  96: { label: "Storm with hail", glyph: "ϟ" },
  99: { label: "Storm with hail", glyph: "ϟ" },
};

const getWeatherDescription = (code: number) =>
  weatherDescriptions[code] ?? { label: "Changing conditions", glyph: "◌" };

async function fetchJson<T>(
  url: string,
  options: { retries?: number; timeoutMs?: number } = {},
): Promise<T> {
  const { retries = 0, timeoutMs = 0 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = timeoutMs ? new AbortController() : undefined;
    const timeout = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    try {
      const response = await fetch(url, { signal: controller?.signal });
      if (!response.ok) throw new Error(`Data source returned ${response.status}`);
      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
      }
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Data source request failed");
}

async function geocode(query: string): Promise<Location> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await fetchJson<{ results?: Location[] }>(url.toString());
  if (!data.results?.length) {
    throw new Error("We couldn’t find that place. Try a city, state, or ZIP code.");
  }
  return data.results[0];
}

async function fetchWeather(location: Location): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", location.latitude.toString());
  url.searchParams.set("longitude", location.longitude.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,weather_code",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  return fetchJson<Weather>(url.toString());
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readSeries(series: UsgsSeries): GaugeMetric | undefined {
  const values = series.values?.[0]?.value ?? [];
  const numericValues = values
    .map((item) => ({ ...item, numeric: Number(item.value) }))
    .filter((item) => Number.isFinite(item.numeric));
  const latest = numericValues.at(-1);
  if (!latest) return undefined;

  return {
    value: latest.numeric,
    unit: series.variable.unit.unitCode,
    time: latest.dateTime,
    series: numericValues.map((item) => item.numeric),
  };
}

function groupGauges(
  seriesList: UsgsSeries[],
  location: Location,
  allowedIds?: Set<string>,
): Gauge[] {
  const gauges = new Map<string, Gauge>();

  for (const series of seriesList) {
    const id = series.sourceInfo.siteCode[0]?.value;
    if (!id || (allowedIds && !allowedIds.has(id))) continue;
    const coordinates = series.sourceInfo.geoLocation.geogLocation;
    const existing = gauges.get(id) ?? {
      id,
      name: series.sourceInfo.siteName,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distance: haversineMiles(
        location.latitude,
        location.longitude,
        coordinates.latitude,
        coordinates.longitude,
      ),
    };
    const metric = readSeries(series);
    const parameterCode = series.variable.variableCode[0]?.value;
    if (metric && parameterCode === "00060") existing.discharge = metric;
    if (metric && parameterCode === "00065") existing.height = metric;
    if (metric && parameterCode === "00010") existing.waterTemperature = metric;
    gauges.set(id, existing);
  }

  return [...gauges.values()].sort((a, b) => a.distance - b.distance);
}

async function fetchWater(location: Location): Promise<Gauge[]> {
  let nearest: Gauge[] = [];

  // Start close to the selected place. Large USGS bounding-box queries can be
  // surprisingly slow, so widen only when a sparse area needs it.
  for (const latitudeDelta of [0.2, 0.4, 0.7]) {
    const longitudeDelta = Math.min(
      1.4,
      latitudeDelta / Math.max(0.5, Math.cos((location.latitude * Math.PI) / 180)),
    );
    const west = Math.max(-179.999, location.longitude - longitudeDelta);
    const east = Math.min(179.999, location.longitude + longitudeDelta);
    const south = Math.max(-89.999, location.latitude - latitudeDelta);
    const north = Math.min(89.999, location.latitude + latitudeDelta);
    const boundingBox = [west, south, east, north]
      .map((coordinate) => coordinate.toFixed(6))
      .join(",");

    const nearbyUrl = new URL("https://waterservices.usgs.gov/nwis/iv/");
    nearbyUrl.searchParams.set("format", "json");
    nearbyUrl.searchParams.set("bBox", boundingBox);
    nearbyUrl.searchParams.set("parameterCd", "00060,00065,00010");
    nearbyUrl.searchParams.set("siteStatus", "active");
    nearbyUrl.searchParams.set("siteType", "ST");

    const nearbyData = await fetchJson<{
      value?: { timeSeries?: UsgsSeries[] };
    }>(nearbyUrl.toString(), { retries: 1, timeoutMs: 12000 });
    nearest = groupGauges(
      nearbyData.value?.timeSeries ?? [],
      location,
    ).slice(0, 4);
    if (nearest.length >= 4) break;
  }

  if (!nearest.length) return [];

  const ids = new Set(nearest.map((gauge) => gauge.id));
  const detailUrl = new URL("https://waterservices.usgs.gov/nwis/iv/");
  detailUrl.searchParams.set("format", "json");
  detailUrl.searchParams.set("sites", [...ids].join(","));
  detailUrl.searchParams.set("parameterCd", "00060,00065,00010");
  detailUrl.searchParams.set("period", "P1D");
  detailUrl.searchParams.set("siteStatus", "active");

  const detailData = await fetchJson<{
    value?: { timeSeries?: UsgsSeries[] };
  }>(detailUrl.toString(), { retries: 1, timeoutMs: 12000 });
  return groupGauges(detailData.value?.timeSeries ?? [], location, ids);
}

function formatLocation(location: Location) {
  return [location.name, location.admin1].filter(Boolean).join(", ");
}

function formatObservedAt(dateTime?: string) {
  if (!dateTime) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(dateTime));
}

function formatDay(date: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function cardinalDirection(degrees: number) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(degrees / 45) % 8];
}

function trendFor(metric?: GaugeMetric) {
  if (!metric || metric.series.length < 2) return { label: "Trend unavailable", tone: "flat" };
  const first = metric.series[0];
  const last = metric.series.at(-1)!;
  const percent = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
  if (percent > 5) return { label: `Rising ${Math.round(percent)}%`, tone: "up" };
  if (percent < -5) return { label: `Falling ${Math.abs(Math.round(percent))}%`, tone: "down" };
  return { label: "Holding steady", tone: "flat" };
}

function SparkBars({ values }: { values: number[] }) {
  const sampled = useMemo(() => {
    if (!values.length) return [];
    const step = Math.max(1, Math.floor(values.length / 18));
    return values.filter((_, index) => index % step === 0).slice(-18);
  }, [values]);
  const minimum = Math.min(...sampled);
  const range = Math.max(1, Math.max(...sampled) - minimum);

  return (
    <div className="spark-bars" aria-label="Discharge observations over the last 24 hours">
      {sampled.map((value, index) => (
        <span
          key={`${value}-${index}`}
          style={{ height: `${24 + ((value - minimum) / range) * 76}%` }}
        />
      ))}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="loading-card" role="status">
      <span className="loading-dot" />
      <div>
        <strong>Asking the river nicely…</strong>
        <p>Collecting fresh weather and gauge gossip.</p>
      </div>
    </div>
  );
}

export function App() {
  const [query, setQuery] = useState("Lewisberry, PA");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const requestId = useRef(0);
  const initialLoadStarted = useRef(false);

  const loadReport = async (location: Location) => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const weatherPromise = fetchWeather(location);
      const waterPromise = fetchWater(location).then(
        (gauges) => ({ gauges }),
        (waterFailure) => {
          console.warn("USGS gauge request failed", waterFailure);
          return {
            gauges: [] as Gauge[],
            waterError: "The USGS gauge service took a snack break. Give it another splash.",
          };
        },
      );
      const [weather, water] = await Promise.all([weatherPromise, waterPromise]);
      if (thisRequest !== requestId.current) return;
      setReport({ location, weather, ...water, fetchedAt: new Date() });
      setQuery(formatLocation(location));
    } catch (caught) {
      if (thisRequest !== requestId.current) return;
      setError(caught instanceof Error ? caught.message : "Couldn’t load this report.");
    } finally {
      if (thisRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void loadReport(DEFAULT_LOCATION);
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError("Enter a city, state, or ZIP code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loadReport(await geocode(trimmed));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t find that location.");
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location access isn’t supported by this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void loadReport({
          name: "Your location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setError("We couldn’t access your location. Search for a nearby town instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const current = report?.weather.current;
  const currentDescription = current
    ? getWeatherDescription(current.weather_code)
    : getWeatherDescription(0);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Riverwise home">
          <span className="brand-mark">R!</span>
          <span>Riverwise!</span>
        </a>
        <div className="outfitter-badge">
          <span aria-hidden="true">★</span>
          Powered by Hudak Outfitters
        </div>
        <div className="header-note">
          <span className="live-dot" />
          Fresh-ish facts
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="silly-sun" aria-hidden="true">☀</div>
          <div className="splash splash-one" />
          <div className="splash splash-two" />
          <div className="tube-mascot" aria-hidden="true">
            <span>😎</span>
          </div>
          <div className="hero-content">
            <p className="eyebrow">Maple Shade river intelligence-ish</p>
            <h1>Is it a<br /><span>float day?</span></h1>
            <p className="hero-copy">
              Weather, water, and exactly zero guesses pulled from a soggy hat.
              Find out what the sky and nearby stream gauges are plotting.
            </p>

            <div className="silly-stickers" aria-hidden="true">
              <span>NO BORING WEATHER</span>
              <span>100% SPLASHY</span>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="location">Where are we causing a mild splash?</label>
              <div className="search-row">
                <input
                  id="location"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Town, state, or ZIP-a-dee-doo-dah"
                  autoComplete="postal-code"
                />
                <button className="search-button" type="submit" disabled={loading}>
                  {loading ? "Paddling…" : "Gimme the scoop"}
                </button>
              </div>
              <button className="location-button" type="button" onClick={useMyLocation} disabled={locating}>
                <span className="target-icon" aria-hidden="true">⌾</span>
                {locating ? "Consulting the satellites…" : "Use my fancy GPS"}
              </button>
            </form>

            <div className="error-message" aria-live="polite">
              {error && <p>{error}</p>}
            </div>
          </div>

          <aside className="now-card" aria-live="polite">
            {loading && !report ? (
              <LoadingCard />
            ) : report && current ? (
              <>
                <div className="now-card-heading">
                  <div>
                    <span className="section-kicker">The vibe right now</span>
                    <h2>{formatLocation(report.location)}</h2>
                    <p>{report.location.country}</p>
                  </div>
                  <button
                    className="refresh-button"
                    onClick={() => void loadReport(report.location)}
                    disabled={loading}
                    aria-label="Refresh report"
                    title="Refresh report"
                  >
                    ↻
                  </button>
                </div>

                <div className="current-weather">
                  <span className="weather-glyph" aria-hidden="true">{currentDescription.glyph}</span>
                  <div>
                    <strong>{Math.round(current.temperature_2m)}°</strong>
                    <span>{currentDescription.label}</span>
                  </div>
                </div>

                <div className="now-metrics">
                  <div>
                    <span>Feels like</span>
                    <strong>{Math.round(current.apparent_temperature)}°</strong>
                  </div>
                  <div>
                    <span>Wind</span>
                    <strong>{Math.round(current.wind_speed_10m)} mph {cardinalDirection(current.wind_direction_10m)}</strong>
                  </div>
                  <div>
                    <span>Humidity</span>
                    <strong>{current.relative_humidity_2m}%</strong>
                  </div>
                </div>

                <p className="updated-time">
                  Freshened up at {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(report.fetchedAt)} · no crystal ball used
                </p>
              </>
            ) : null}
          </aside>
        </section>

        <section className="route-section" aria-labelledby="route-title">
          <div className="route-intro">
            <span className="section-kicker dark">The Yellow Breeches float plan</span>
            <h2 id="route-title">Messiah to McCormick.<br /><em>Let’s get weirdly scenic.</em></h2>
            <p>
              A laid-back downstream adventure from the Messiah University access to
              McCormick Park, with a picnic-worthy checkpoint at Simpson Park.
              Pack water, secure your snacks, and leave the glass at home.
            </p>
            <div className="route-stats" aria-label="Route quick facts">
              <div><strong>~3.6</strong><span>river miles</span></div>
              <div><strong>3–4</strong><span>hours-ish</span></div>
              <div><strong>2.5</strong><span>miles to Simpson</span></div>
            </div>
            <p className="route-disclaimer">* Time and distance are playful planning estimates. Flow, stops, and snack negotiations change everything.</p>
          </div>

          <div className="route-map" aria-label="Illustrated route map from Messiah College to McCormick Park">
            <div className="map-label">Real bends. Silly labels.</div>
            <svg viewBox="0 0 760 500" role="img" aria-labelledby="map-title map-desc">
              <title id="map-title">Yellow Breeches tubing route</title>
              <desc id="map-desc">A north-up illustrated map following the actual bends of Yellow Breeches Creek from the Messiah University put-in, past Simpson Park at mile 2.5, to the McCormick Park take-out at mile 3.6.</desc>

              <text className="map-county-label" x="92" y="64">CUMBERLAND COUNTY</text>
              <text className="map-county-label south" x="476" y="454">YORK COUNTY</text>

              <path className="map-road-outline" d="M112 520 C96 430 102 342 149 252" />
              <path className="map-road" d="M112 520 C96 430 102 342 149 252" />
              <text className="road-label" x="71" y="286" transform="rotate(-70 71 286)">Grantham Rd</text>
              <path className="map-road-outline" d="M374 -25 C365 55 352 135 347 226" />
              <path className="map-road" d="M374 -25 C365 55 352 135 347 226" />
              <text className="road-label" x="366" y="79" transform="rotate(-83 366 79)">PA 114</text>
              <path className="map-road-outline" d="M646 -20 C657 61 691 150 739 227" />
              <path className="map-road" d="M646 -20 C657 61 691 150 739 227" />
              <text className="road-label" x="696" y="67" transform="rotate(70 696 67)">McCormick Rd</text>

              <path className="creek-shadow" d={yellowBreechesRoute} />
              <path className="creek" d={yellowBreechesRoute} />
              <path className="route-dashes" d={yellowBreechesRoute} />
              <g className="map-trees" aria-hidden="true">
                <text x="28" y="195">♠</text><text x="66" y="224">♠</text><text x="184" y="323">♠</text><text x="455" y="229">♠</text><text x="495" y="245">♠</text><text x="590" y="199">♠</text><text x="625" y="226">♠</text>
              </g>
              <g className="map-stop start">
                <circle cx="65" cy="351" r="18" /><text x="65" y="358">1</text>
                <rect x="85" y="316" width="198" height="69" rx="15" />
                <text className="stop-title" x="103" y="340">PUT IN · MILE 0</text>
                <text className="stop-name" x="103" y="366">Messiah University</text>
              </g>
              <g className="map-stop middle">
                <circle cx="336" cy="135" r="18" /><text x="336" y="142">2</text>
                <rect x="226" y="159" width="222" height="69" rx="15" />
                <text className="stop-title" x="245" y="183">PICNIC STOP · MILE 2.5</text>
                <text className="stop-name" x="245" y="209">Simpson Park</text>
              </g>
              <g className="map-stop finish">
                <circle cx="695" cy="117" r="18" /><text x="695" y="124">3</text>
                <rect x="465" y="24" width="219" height="69" rx="15" />
                <text className="stop-title" x="484" y="48">HOP OUT · MILE 3.6</text>
                <text className="stop-name" x="484" y="74">McCormick Park</text>
              </g>
              <g className="fun-pin"><circle cx="288" cy="435" r="7"/><text x="308" y="464">The big southern squiggle</text></g>
              <g className="fun-pin"><circle cx="416" cy="274" r="7"/><text x="439" y="293">Tree-tunnel energy</text></g>
              <text className="flow-label" x="515" y="144">FLOW THIS WAY →</text>
            </svg>
            <div className="map-compass" aria-hidden="true"><span>N</span>↑</div>
            <p className="map-attribution">
              Access points and mileage: <a href="https://www.cumberlandcountypa.gov/DocumentCenter/View/23587/YellowBreechesGuide_2015Version" target="_blank" rel="noreferrer">Cumberland County Water Trail Guide</a>
              <span> · </span>
              Creek geometry © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
            </p>
          </div>
        </section>

        <section className="float-kit-section" aria-labelledby="float-kit-title">
          <div className="float-kit-heading">
            <div>
              <span className="section-kicker light">Highly scientific fun supplies</span>
              <h2 id="float-kit-title">Pack it. Play it.<br /><em>Plop in.</em></h2>
            </div>
            <p>
              A tiny soundtrack and a mighty checklist for maximum creek joy with
              minimum “oh beans, I forgot the keys.”
            </p>
          </div>

          <div className="float-kit-grid">
            <article className="kit-panel playlist-panel">
              <div className="kit-panel-heading">
                <div>
                  <span className="kit-label">River radio</span>
                  <h3>Songs that know how to float</h3>
                </div>
                <span className="record-badge" aria-hidden="true"><i>♪</i></span>
              </div>
              <ol className="song-list">
                {floatPlaylist.map((song, index) => (
                  <li key={song.title}>
                    <span className="song-number">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{song.title}</strong>
                      <span>{song.artist}</span>
                    </div>
                    <small>{song.note}</small>
                  </li>
                ))}
              </ol>
              <p className="kit-footnote">Speaker etiquette: keep it tiny, friendly, and quieter than the actual birds.</p>
            </article>

            <article className="kit-panel packing-panel">
              <div className="kit-panel-heading">
                <div>
                  <span className="kit-label">The no-regrets bag</span>
                  <h3>Things future-you will thank you for</h3>
                </div>
                <span className="bag-badge" aria-hidden="true">✓</span>
              </div>
              <ul className="packing-list">
                {floatKit.map((item) => (
                  <li key={item.title}>
                    <span className="packing-icon" aria-hidden="true">{item.glyph}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="kit-footnote"><strong>Bonus points:</strong> a small trash bag, basic first aid, dry clothes, and absolutely no glass.</p>
            </article>
          </div>
        </section>

        <section className="review-section" aria-labelledby="review-title">
          <div className="review-heading">
            <span className="section-kicker">Unfiltered river wisdom</span>
            <h2 id="review-title">The people have floated.</h2>
          </div>
          <article className="review-card">
            <div className="review-avatar" aria-hidden="true">?</div>
            <div className="review-body">
              <div className="review-meta">
                <div><strong>Anonymous River Rat</strong><span>Verified floater-ish</span></div>
                <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
              </div>
              <blockquote>“Butts up, nuts up. Rocks up, box up”</blockquote>
              <div className="review-footer"><span>Hudak Outfitters</span><span>Helpful? <button type="button">You betcha</button></span></div>
            </div>
          </article>
          <p className="review-fineprint">A totally real-looking fake review for demonstration purposes. The creek, however, is extremely real.</p>
        </section>

        {report && (
          <>
            <section className="forecast-section" aria-labelledby="forecast-title">
              <div className="section-heading">
                <div>
                  <span className="section-kicker dark">Seven-day sky shenanigans</span>
                  <h2 id="forecast-title">What the clouds are cooking</h2>
                </div>
                <p>The farther out we look, the more the clouds may be making things up. Check again before launch.</p>
              </div>

              <div className="forecast-grid">
                {report.weather.daily.time.map((date, index) => {
                  const description = getWeatherDescription(report.weather.daily.weather_code[index]);
                  return (
                    <article className="forecast-day" key={date}>
                      <span className="day-name">{formatDay(date, index)}</span>
                      <span className="forecast-glyph" aria-hidden="true">{description.glyph}</span>
                      <span className="forecast-label">{description.label}</span>
                      <div className="temperatures">
                        <strong>{Math.round(report.weather.daily.temperature_2m_max[index])}°</strong>
                        <span>{Math.round(report.weather.daily.temperature_2m_min[index])}°</span>
                      </div>
                      <span className="rain-chance">{report.weather.daily.precipitation_probability_max[index]}% rain</span>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="water-section" aria-labelledby="water-title">
              <div className="water-heading">
                <div>
                  <span className="section-kicker light">Nearby USGS tattletales</span>
                  <h2 id="water-title">The river has receipts</h2>
                </div>
                <p>
                  Real observations from active stream gauges, ranked from “right over there” to “still pretty close.”
                </p>
              </div>

              {loading ? (
                <LoadingCard />
              ) : report.gauges.length ? (
                <div className="gauge-grid">
                  {report.gauges.map((gauge, index) => {
                    const trend = trendFor(gauge.discharge);
                    return (
                      <article className="gauge-card" key={gauge.id}>
                        <div className="gauge-topline">
                          <span>Nosy gauge {String(index + 1).padStart(2, "0")}</span>
                          <span>{gauge.distance.toFixed(1)} mi away-ish</span>
                        </div>
                        <h3>{gauge.name.replace(/^USGS\s+/i, "")}</h3>
                        <div className="flow-reading">
                          <div>
                            <span>Discharge</span>
                            <strong>{gauge.discharge ? Math.round(gauge.discharge.value).toLocaleString() : "—"}</strong>
                            <small>{gauge.discharge?.unit ?? "cfs"}</small>
                          </div>
                          <SparkBars values={gauge.discharge?.series ?? []} />
                        </div>
                        <div className="gauge-metrics">
                          <div>
                            <span>Gauge height</span>
                            <strong>{gauge.height ? `${gauge.height.value.toFixed(2)} ${gauge.height.unit}` : "Not reported"}</strong>
                          </div>
                          <div>
                            <span>Water temp</span>
                            <strong>{gauge.waterTemperature ? `${gauge.waterTemperature.value.toFixed(1)} ${gauge.waterTemperature.unit}` : "Not reported"}</strong>
                          </div>
                        </div>
                        <div className="gauge-footer">
                          <span className={`trend ${trend.tone}`}>{trend.label}</span>
                          <span>{formatObservedAt(gauge.discharge?.time ?? gauge.height?.time)}</span>
                        </div>
                        <a
                          href={`https://waterdata.usgs.gov/monitoring-location/${gauge.id}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          See the official nerdy details <span aria-hidden="true">↗</span>
                        </a>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-water">
                  <span aria-hidden="true">≈</span>
                  <div>
                    <h3>No nearby USGS stream gauges found</h3>
                    <p>
                      {report.waterError ?? "Weather is available worldwide, but this water report uses U.S. Geological Survey gauges within roughly 50 miles."}
                    </p>
                    {report.waterError && (
                      <button
                        className="retry-gauge-button"
                        type="button"
                        onClick={() => void loadReport(report.location)}
                        disabled={loading}
                      >
                        Try the gauge gossip again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="field-note">
              <span className="field-note-number">UH-OH</span>
              <div>
                <span className="section-kicker dark">Tiny serious moment</span>
                <h2>Nature is still the boss.</h2>
              </div>
              <p>
                River levels can change quickly and a safe flow varies by river, route, and experience.
                Check local notices, weather alerts, and Hudak Outfitters guidance before you plop into the water.
              </p>
            </section>
          </>
        )}
      </main>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark inverse">R!</span>
          <div>
            <strong>Riverwise!</strong>
            <span>Is it a float day?</span>
          </div>
        </div>
        <div className="footer-powered">
          <span aria-hidden="true">★</span>
          Powered by <strong>Hudak Outfitters</strong>
        </div>
        <p>
          Weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          <span> · </span>
          Water data by <a href="https://waterdata.usgs.gov/" target="_blank" rel="noreferrer">USGS</a>
        </p>
        <p className="footer-small">Made with big Maple Shade energy. For planning only—not an emergency or flood-warning service.</p>
      </footer>
    </div>
  );
}
