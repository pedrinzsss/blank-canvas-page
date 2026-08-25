import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Tailwind classes for the placeholder icon size. */
  iconClassName?: string;
  /** Label shown under the icon in the placeholder. */
  label?: string;
  /**
   * When true, disables lazy loading and hints the browser to prioritize this image
   * (use for LCP / above-the-fold hero images).
   */
  priority?: boolean;
};

/**
 * Renders a product image with:
 *  - Native lazy loading + async decoding (better mobile performance)
 *  - Animated skeleton placeholder while loading
 *  - Graceful fallback when src is null/empty OR the image fails to load
 *    (also covers expired signed URLs — the <img> onError fires and we swap
 *     to a stylized placeholder without breaking the layout)
 */
export function ProductImageBox({
  src,
  alt = "",
  className,
  iconClassName = "h-5 w-5",
  label,
  priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div
        className={cn(
          "relative flex-shrink-0 overflow-hidden rounded",
          className,
        )}
        role="img"
        aria-label={alt || "Imagem indisponível"}
      >
        {/* Soft gradient backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200"
        />
        {/* Subtle diagonal shimmer accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(238,19,91,0.04) 0 8px, transparent 8px 18px)",
          }}
        />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-neutral-400">
          <div className="grid place-items-center rounded-full bg-white/70 p-1.5 shadow-sm ring-1 ring-neutral-200/70 backdrop-blur-sm">
            <Package
              className={cn(iconClassName, "text-neutral-400")}
              strokeWidth={1.75}
            />
          </div>
          {label && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex-shrink-0 overflow-hidden bg-neutral-100",
        className,
      )}
    >
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100"
          aria-hidden="true"
        />
      )}
      <img
        src={src ?? undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
