import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("notifications" as any)
      .select("id, title, body, link, read_at, created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as any);
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const channelName = `notif-${userData.user.id}-${crypto.randomUUID()}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          () => void load(),
        )
        .subscribe();
    })();
    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  async function handleClick(n: Notif) {
    if (!n.read_at) {
      await supabase
        .from("notifications" as any)
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  async function markAllRead() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase
      .from("notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userData.user.id)
      .is("read_at", null);
    await load();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`flex w-full flex-col items-start gap-1 border-b border-border px-3 py-3 text-left transition-colors hover:bg-secondary/50 ${
                  n.read_at ? "opacity-70" : ""
                }`}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.read_at && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                {n.body && (
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
