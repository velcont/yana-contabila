import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, CloudLightning, CloudFog, Loader2 } from "lucide-react";

interface Weather {
  temp: number;
  code: number;
  city: string;
}

const codeToIcon = (code: number) => {
  if (code === 0) return <Sun className="h-4 w-4 text-yellow-400" />;
  if (code <= 2) return <CloudSun className="h-4 w-4 text-yellow-300" />;
  if (code === 3) return <Cloud className="h-4 w-4 text-slate-300" />;
  if (code >= 45 && code <= 48) return <CloudFog className="h-4 w-4 text-slate-300" />;
  if (code >= 51 && code <= 67) return <CloudRain className="h-4 w-4 text-blue-300" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="h-4 w-4 text-white" />;
  if (code >= 80 && code <= 82) return <CloudRain className="h-4 w-4 text-blue-400" />;
  if (code >= 95) return <CloudLightning className="h-4 w-4 text-yellow-300" />;
  return <Cloud className="h-4 w-4 text-slate-300" />;
};

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ro&format=json`
    );
    const j = await r.json();
    return j?.results?.[0]?.name || "Locație";
  } catch {
    return "Locație";
  }
}

export const WeatherClock = () => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
        );
        const j = await r.json();
        const city = await reverseGeocode(lat, lon);
        if (cancelled) return;
        setWeather({
          temp: Math.round(j?.current?.temperature_2m ?? 0),
          code: j?.current?.weather_code ?? 0,
          city,
        });
        localStorage.setItem("weather_coords", JSON.stringify({ lat, lon, city, ts: Date.now() }));
      } catch (e) {
        console.error("[WeatherClock]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const cached = localStorage.getItem("weather_coords");
    if (cached) {
      try {
        const { lat, lon } = JSON.parse(cached);
        fetchWeather(lat, lon);
      } catch {}
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Fallback: București
          if (!cached) fetchWeather(44.4268, 26.1025);
        },
        { timeout: 8000, maximumAge: 60 * 60 * 1000 }
      );
    } else if (!cached) {
      fetchWeather(44.4268, 26.1025);
    }

    // Refresh weather every 15 minutes
    const refresh = setInterval(() => {
      const c = localStorage.getItem("weather_coords");
      if (c) {
        try {
          const { lat, lon } = JSON.parse(c);
          fetchWeather(lat, lon);
        } catch {}
      }
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  const time = now.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div
      className="fixed top-3 right-3 z-40 flex items-center gap-3 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md hidden md:flex"
      title={weather ? `${weather.city} • ${weather.temp}°C` : "Vremea"}
    >
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-sm tabular-nums">{time}</span>
        <span className="text-[10px] text-muted-foreground capitalize">{date}</span>
      </div>
      <div className="h-6 w-px bg-border/60" />
      <div className="flex items-center gap-1.5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : weather ? (
          <>
            {codeToIcon(weather.code)}
            <span className="tabular-nums">{weather.temp}°</span>
            <span className="text-muted-foreground hidden lg:inline">{weather.city}</span>
          </>
        ) : (
          <Cloud className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};