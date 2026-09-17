export type WeatherForecastDay = {
  date: string;
  high: number;
  low: number;
  condition: string;
};

export type WeatherData = {
  locationName: string;
  temp: number;
  condition: string;
  forecast: WeatherForecastDay[];
  source: "openweathermap" | "open-meteo";
};

/** Alias kept for readability in widgets */
export type WeatherSource = WeatherData["source"];

export type NewsArticle = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  trailText?: string;
};

export type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type SavedLocation = {
  lat: number;
  lon: number;
  label?: string;
};
