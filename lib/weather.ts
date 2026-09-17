import type { WeatherData, WeatherForecastDay } from "@/lib/types";

// Weather helpers: OpenWeatherMap when keyed, otherwise Open-Meteo

const WMO_CODES: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export function wmoCodeToCondition(code: number): string {
  return WMO_CODES[code] ?? "Unknown";
}

type GeoResult = { lat: number; lon: number; name: string };

export async function resolveCity(
  city: string,
  apiKey?: string
): Promise<GeoResult> {
  if (apiKey) {
    const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
    url.searchParams.set("q", city);
    url.searchParams.set("limit", "1");
    url.searchParams.set("appid", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error("Failed to geocode city with OpenWeatherMap");
    }
    const data = (await res.json()) as Array<{
      lat: number;
      lon: number;
      name: string;
      state?: string;
      country?: string;
    }>;
    if (!data.length) {
      throw new Error(`No results for city "${city}"`);
    }
    const place = data[0];
    const parts = [place.name, place.state, place.country].filter(Boolean);
    return { lat: place.lat, lon: place.lon, name: parts.join(", ") };
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Failed to geocode city with Open-Meteo");
  }
  const data = (await res.json()) as {
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      admin1?: string;
      country?: string;
    }>;
  };
  if (!data.results?.length) {
    throw new Error(`No results for city "${city}"`);
  }
  const place = data.results[0];
  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  return {
    lat: place.latitude,
    lon: place.longitude,
    name: parts.join(", "),
  };
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  apiKey?: string
): Promise<string> {
  if (apiKey) {
    const url = new URL("https://api.openweathermap.org/geo/1.0/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("limit", "1");
    url.searchParams.set("appid", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return formatCoords(lat, lon);
    const data = (await res.json()) as Array<{
      name: string;
      state?: string;
      country?: string;
    }>;
    if (!data.length) return formatCoords(lat, lon);
    const place = data[0];
    return [place.name, place.state, place.country].filter(Boolean).join(", ");
  }

  // Nominatim fallback when no OpenWeatherMap key is configured
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "personal-dashboard/1.0" },
  });
  if (!res.ok) return formatCoords(lat, lon);

  const data = (await res.json()) as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
    };
  };
  const place =
    data.address?.city || data.address?.town || data.address?.village;
  if (!place) return formatCoords(lat, lon);
  return [place, data.address?.state, data.address?.country]
    .filter(Boolean)
    .join(", ");
}

export async function fetchOpenWeatherMap(
  lat: number,
  lon: number,
  apiKey: string,
  locationName: string
): Promise<WeatherData> {
  const currentUrl = new URL(
    "https://api.openweathermap.org/data/2.5/weather"
  );
  currentUrl.searchParams.set("lat", String(lat));
  currentUrl.searchParams.set("lon", String(lon));
  currentUrl.searchParams.set("units", "imperial");
  currentUrl.searchParams.set("appid", apiKey);

  const forecastUrl = new URL(
    "https://api.openweathermap.org/data/2.5/forecast"
  );
  forecastUrl.searchParams.set("lat", String(lat));
  forecastUrl.searchParams.set("lon", String(lon));
  forecastUrl.searchParams.set("units", "imperial");
  forecastUrl.searchParams.set("appid", apiKey);

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl.toString()),
    fetch(forecastUrl.toString()),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error("OpenWeatherMap request failed");
  }

  const current = (await currentRes.json()) as {
    main: { temp: number };
    weather: Array<{ description: string }>;
    name?: string;
  };
  const forecastJson = (await forecastRes.json()) as {
    list: Array<{
      dt_txt: string;
      main: { temp_max: number; temp_min: number };
      weather: Array<{ description: string }>;
    }>;
  };

  const byDay = new Map<
    string,
    { highs: number[]; lows: number[]; condition: string }
  >();

  for (const entry of forecastJson.list) {
    const date = entry.dt_txt.slice(0, 10);
    const bucket = byDay.get(date) ?? {
      highs: [],
      lows: [],
      condition: entry.weather[0]?.description ?? "Unknown",
    };
    bucket.highs.push(entry.main.temp_max);
    bucket.lows.push(entry.main.temp_min);
    if (entry.dt_txt.includes("12:00:00")) {
      bucket.condition = entry.weather[0]?.description ?? bucket.condition;
    }
    byDay.set(date, bucket);
  }

  const forecast: WeatherForecastDay[] = Array.from(byDay.entries())
    .slice(0, 5)
    .map(([date, bucket]) => ({
      date,
      high: Math.round(Math.max(...bucket.highs)),
      low: Math.round(Math.min(...bucket.lows)),
      condition: capitalize(bucket.condition),
    }));

  return {
    locationName: locationName || current.name || "Unknown",
    temp: Math.round(current.main.temp),
    condition: capitalize(current.weather[0]?.description ?? "Unknown"),
    forecast,
    source: "openweathermap" as const,
  };
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  locationName: string
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min"
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Open-Meteo request failed");
  }

  const data = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
    };
  };

  const forecast: WeatherForecastDay[] = data.daily.time.map((date, i) => ({
    date,
    high: Math.round(data.daily.temperature_2m_max[i]),
    low: Math.round(data.daily.temperature_2m_min[i]),
    condition: wmoCodeToCondition(data.daily.weather_code[i]),
  }));

  return {
    locationName,
    temp: Math.round(data.current.temperature_2m),
    condition: wmoCodeToCondition(data.current.weather_code),
    forecast,
    source: "open-meteo" as const,
  };
}

function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
