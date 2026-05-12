import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  id?: string;
  title: string;
  link: string;
  source?: string | null;
}

export const NewsTicker = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [hidden, setHidden] = useState<boolean>(() => localStorage.getItem("news_ticker_hidden") === "1");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("fiscal_news")
          .select("id, title, link, source")
          .order("published_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (cancelled) return;
        if (data && data.length > 0) {
          setItems(data as NewsItem[]);
        } else {
          // Trigger a refresh in background, then re-load
          await supabase.functions.invoke("fetch-fiscal-news").catch(() => {});
          const { data: d2 } = await supabase
            .from("fiscal_news")
            .select("id, title, link, source")
            .order("published_at", { ascending: false })
            .limit(20);
          if (!cancelled && d2) setItems(d2 as NewsItem[]);
        }
      } catch (e) {
        console.error("[NewsTicker]", e);
      }
    };

    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (hidden || items.length === 0) return null;

  // Duplicate for seamless loop
  const loop = [...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 border-t border-border/60 bg-background/90 backdrop-blur-md py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
      <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide shrink-0">
        <Newspaper className="h-3 w-3" />
        Business
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="flex gap-10 whitespace-nowrap animate-[ticker_120s_linear_infinite] hover:[animation-play-state:paused]"
        >
          {loop.map((it, i) => (
            <a
              key={`${it.id || it.link}-${i}`}
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-foreground/90 hover:text-primary transition-colors"
            >
              {it.source && (
                <span className="text-[10px] font-semibold uppercase text-primary mr-2">
                  {it.source}
                </span>
              )}
              {it.title}
              <span className="mx-3 text-muted-foreground">•</span>
            </a>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.setItem("news_ticker_hidden", "1");
          setHidden(true);
        }}
        className="shrink-0 px-2 text-muted-foreground hover:text-foreground text-sm"
        aria-label="Închide știri"
        title="Închide bara de știri"
      >
        ×
      </button>
    </div>
  );
};