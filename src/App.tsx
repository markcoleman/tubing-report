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
              A laid-back downstream adventure from the Messiah College access to
              McCormick Park take-out. Pack water, secure your snacks, and leave
              the glass at home.
            </p>
            <div className="route-stats" aria-label="Route quick facts">
              <div><strong>~6.5</strong><span>river miles</span></div>
              <div><strong>3–4</strong><span>hours-ish</span></div>
              <div><strong>100%</strong><span>better afloat</span></div>
            </div>
            <p className="route-disclaimer">* Time and distance are playful planning estimates. Flow, stops, and snack negotiations change everything.</p>
          </div>

          <div className="route-map" aria-label="Illustrated route map from Messiah College to McCormick Park">
            <div className="map-label">Not to scale. Very much to vibe.</div>
            <svg viewBox="0 0 760 540" role="img" aria-labelledby="map-title map-desc">
              <title id="map-title">Yellow Breeches tubing route</title>
              <desc id="map-desc">An illustrated creek route running from the Messiah College put-in to McCormick Park take-out with three landmarks.</desc>
              <path className="map-road" d="M-30 130 C130 180 165 65 330 105 S570 170 790 88" />
              <path className="map-road thin" d="M92 -20 C140 130 68 260 130 580" />
              <path className="creek-shadow" d="M54 72 C165 45 180 163 282 159 C397 155 333 279 458 280 C576 281 508 406 701 459" />
              <path className="creek" d="M54 72 C165 45 180 163 282 159 C397 155 333 279 458 280 C576 281 508 406 701 459" />
              <path className="route-dashes" d="M54 72 C165 45 180 163 282 159 C397 155 333 279 458 280 C576 281 508 406 701 459" />
              <g className="map-trees" aria-hidden="true">
                <text x="320" y="70">♠</text><text x="360" y="90">♠</text><text x="615" y="245">♠</text><text x="650" y="225">♠</text><text x="226" y="400">♠</text><text x="275" y="425">♠</text>
              </g>
              <g className="map-stop start">
                <circle cx="54" cy="72" r="18" /><text x="54" y="79">1</text>
                <rect x="72" y="25" width="185" height="66" rx="15" />
                <text className="stop-title" x="90" y="52">PUT IN</text><text className="stop-name" x="90" y="75">Messiah College</text>
              </g>
              <g className="map-stop finish">
                <circle cx="701" cy="459" r="18" /><text x="701" y="466">2</text>
                <rect x="465" y="438" width="208" height="68" rx="15" />
                <text className="stop-title" x="485" y="465">HOP OUT</text><text className="stop-name" x="485" y="490">McCormick Park</text>
              </g>
              <g className="fun-pin"><circle cx="282" cy="159" r="7"/><text x="300" y="145">Wave at the herons</text></g>
              <g className="fun-pin"><circle cx="458" cy="280" r="7"/><text x="477" y="266">Prime snack zone</text></g>
              <g className="fun-pin"><circle cx="568" cy="377" r="7"/><text x="590" y="363">Final wiggle</text></g>
            </svg>
            <div className="map-compass" aria-hidden="true"><span>N</span>↑</div>
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
