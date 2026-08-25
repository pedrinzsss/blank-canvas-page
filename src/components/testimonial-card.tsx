import { useEffect, useState } from "react";
import { Star, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveProductImageUrl } from "@/lib/product-image";
import type { TestimonialItem } from "@/components/checkout-preview";

export function TestimonialCard({
  item,
  className,
}: {
  item: TestimonialItem;
  className?: string;
}) {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!item.avatarUrl) {
      setAvatar(null);
      return;
    }
    resolveProductImageUrl(item.avatarUrl).then((url) => {
      if (!cancelled) setAvatar(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item.avatarUrl]);

  const rating = Math.min(5, Math.max(1, item.rating ?? 5));

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 text-neutral-400">
          {avatar ? (
            <img src={avatar} alt={item.author} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-neutral-800">
            {item.author}
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, k) => (
              <Star
                key={k}
                className={cn("h-3.5 w-3.5", k < rating ? "fill-current" : "opacity-30")}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
        {item.quote}
      </p>
    </div>
  );
}
