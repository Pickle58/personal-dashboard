"use client";

import { FormEvent, useEffect, useState } from "react";
import { CloudSun, MapPin, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LOCATION_STORAGE_KEY } from "@/lib/todos";
import type { SavedLocation, WeatherData } from "@/lib/types";

type WeatherResponse = WeatherData & {
  lat?: number;
  lon?: number;
  error?: string;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadInitialWeather();
  }, []);

  async function loadInitialWeather() {
    setLoading(true);
    setError(null);

    const saved = readSavedLocation();
    if (saved) {
      const ok = await fetchWeather({ lat: saved.lat, lon: saved.lon });
      if (ok) return;
    }

    if (!navigator.geolocation) {
      setLoading(false);
      setError("Geolocation unavailable. Search for a city instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await fetchWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        setLoading(false);
        setError("Location permission denied. Search for a city instead.");
      },
      { timeout: 10000 }
    );
  }

  async function fetchWeather(params: {
    lat?: number;
    lon?: number;
    city?: string;
  }): Promise<boolean> {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (params.city) query.set("city", params.city);
      if (params.lat != null && params.lon != null) {
        query.set("lat", String(params.lat));
        query.set("lon", String(params.lon));
      }

      const res = await fetch(`/api/weather?${query.toString()}`);
      const data = (await res.json()) as WeatherResponse;
      if (!res.ok) {
        throw new Error(data.error || "Failed to load weather");
      }

      setWeather(data);
      if (typeof data.lat === "number" && typeof data.lon === "number") {
        writeSavedLocation({
          lat: data.lat,
          lon: data.lon,
          label: data.locationName,
        });
      }
      setLoading(false);
      return true;
    } catch (err) {
      setWeather(null);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load weather");
      return false;
    }
  }

  async function handleCitySearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    const ok = await fetchWeather({ city: trimmed });
    if (ok) setCity("");
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudSun className="size-4 text-primary" />
            Weather
          </CardTitle>
          {weather ? (
            <Badge variant="secondary">
              {weather.source === "openweathermap"
                ? "OpenWeather"
                : "Open-Meteo"}
            </Badge>
          ) : null}
        </div>
        <CardDescription>Current conditions and 5-day outlook</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCitySearch} className="flex gap-2">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search city…"
            aria-label="City search"
          />
          <Button type="submit" size="icon" aria-label="Search weather">
            <Search className="size-4" />
          </Button>
        </form>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : weather ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {weather.locationName}
              </div>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-highlight">
                {weather.temp}°F
              </p>
              <p className="text-sm text-muted-foreground">{weather.condition}</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {weather.forecast.map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-border bg-muted/40 px-1.5 py-2 text-center"
                >
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {formatWeekday(day.date)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {day.high}°
                  </p>
                  <p className="text-[10px] text-muted-foreground">{day.low}°</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatWeekday(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

function readSavedLocation(): SavedLocation | null {
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLocation;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lon)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSavedLocation(location: SavedLocation) {
  window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
}
