import { NextResponse } from "next/server";

import {
  fetchOpenMeteo,
  fetchOpenWeatherMap,
  resolveCity,
  reverseGeocode,
} from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim();
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const apiKey = process.env.OPENWEATHER_API_KEY?.trim();

    let lat: number;
    let lon: number;
    let locationName: string;

    if (city) {
      const geo = await resolveCity(city, apiKey || undefined);
      lat = geo.lat;
      lon = geo.lon;
      locationName = geo.name;
    } else if (latParam && lonParam) {
      lat = Number(latParam);
      lon = Number(lonParam);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return NextResponse.json(
          { error: "Invalid lat/lon parameters" },
          { status: 400 }
        );
      }
      locationName = await reverseGeocode(lat, lon, apiKey || undefined);
    } else {
      return NextResponse.json(
        { error: "Provide city or lat and lon query params" },
        { status: 400 }
      );
    }

    const weather = apiKey
      ? await fetchOpenWeatherMap(lat, lon, apiKey, locationName)
      : await fetchOpenMeteo(lat, lon, locationName);

    return NextResponse.json({ ...weather, lat, lon });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch weather";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
