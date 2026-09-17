import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { NewsWidget } from "@/components/widgets/news-widget";
import { TodoWidget } from "@/components/widgets/todo-widget";
import { WeatherWidget } from "@/components/widgets/weather-widget";

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <WeatherWidget />
      <CalendarWidget />
      <TodoWidget />
      <NewsWidget />
    </div>
  );
}
