import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/lib/use-platform-settings";

type Banner = { id: string; image_path: string; external_link: string };
type BannersSettings = { banners: Banner[] };

export function DashboardBanners() {
  const { data } = usePlatformSettings<BannersSettings>("banners");
  const banners = data?.banners ?? [];
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    async function resolve() {
      const entries = await Promise.all(
        banners.map(async (b) => {
          const { data: s } = await supabase.storage
            .from("platform-assets")
            .createSignedUrl(b.image_path, 60 * 60);
          return [b.id, s?.signedUrl ?? ""] as const;
        }),
      );
      if (alive) setUrls(Object.fromEntries(entries));
    }
    if (banners.length) void resolve();
    return () => {
      alive = false;
    };
  }, [banners]);

  if (!banners.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {banners.map((b) => {
        const url = urls[b.id];
        const img = url ? (
          <img
            src={url}
            alt="Banner"
            className="h-40 w-full rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="h-40 w-full animate-pulse rounded-xl border border-border bg-muted" />
        );
        return b.external_link ? (
          <a key={b.id} href={b.external_link} target="_blank" rel="noreferrer noopener">
            {img}
          </a>
        ) : (
          <div key={b.id}>{img}</div>
        );
      })}
    </div>
  );
}
