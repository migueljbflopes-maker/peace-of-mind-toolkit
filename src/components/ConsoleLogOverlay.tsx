import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Copy, Terminal, Trash2, X } from "lucide-react";

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

type LogEntry = {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
};

function safeToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "[unprintable]";
    }
  }
}

function formatArgs(args: unknown[]): string {
  if (!args.length) return "";
  const parts = args.map((a) => safeToString(a));
  // Keep readability: join with spaces, but preserve newlines in objects/errors.
  return parts.join(" ");
}

const levelStyles: Record<LogLevel, { pill: string; text: string }> = {
  log: { pill: "bg-muted text-foreground", text: "text-foreground" },
  info: { pill: "bg-accent text-accent-foreground", text: "text-foreground" },
  warn: { pill: "bg-muted text-foreground", text: "text-foreground" },
  error: { pill: "bg-destructive text-destructive-foreground", text: "text-foreground" },
  debug: { pill: "bg-muted text-foreground", text: "text-foreground" },
};

export default function ConsoleLogOverlay({
  enabled,
  title = "Debug Logs",
  maxEntries = 250,
}: {
  enabled: boolean;
  title?: string;
  maxEntries?: number;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Keep original console funcs stable.
  const originalsRef = useRef<Partial<Record<LogLevel, (...args: unknown[]) => void>>>({});

  const addEntry = (level: LogLevel, message: string) => {
    const entry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
      level,
      message,
    };

    setEntries((prev) => {
      const next = [...prev, entry];
      if (next.length <= maxEntries) return next;
      return next.slice(next.length - maxEntries);
    });
  };

  useEffect(() => {
    if (!enabled) return;

    const levels: LogLevel[] = ["log", "info", "warn", "error", "debug"];

    levels.forEach((level) => {
      const original = console[level].bind(console);
      originalsRef.current[level] = original;

      console[level] = (...args: unknown[]) => {
        try {
          addEntry(level, formatArgs(args));
        } catch {
          // ignore
        }
        original(...args);
      };
    });

    const onError = (event: ErrorEvent) => {
      const msg = event.error ? safeToString(event.error) : `${event.message} (${event.filename}:${event.lineno}:${event.colno})`;
      addEntry("error", `[window.error] ${msg}`);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      addEntry("error", `[unhandledrejection] ${safeToString(event.reason)}`);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    addEntry("info", "[ConsoleLogOverlay] UI log capture enabled");

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);

      // Restore
      levels.forEach((level) => {
        const original = originalsRef.current[level];
        if (original) console[level] = original as typeof console[typeof level];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, maxEntries]);

  const transcript = useMemo(() => {
    return entries
      .map((e) => {
        const t = new Date(e.ts).toLocaleTimeString();
        return `[${t}] ${e.level.toUpperCase()} ${e.message}`;
      })
      .join("\n\n");
  }, [entries]);

  const counts = useMemo(() => {
    const c = { error: 0, warn: 0 };
    for (const e of entries) {
      if (e.level === "error") c.error++;
      if (e.level === "warn") c.warn++;
    }
    return c;
  }, [entries]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {!open ? (
        <Button
          type="button"
          variant="outline"
          className="bg-background/95 backdrop-blur"
          onClick={() => setOpen(true)}
        >
          <Terminal className="h-4 w-4 mr-2" />
          {title}
          {(counts.error > 0 || counts.warn > 0) && (
            <span className="ml-2 text-xs text-muted-foreground">
              {counts.error > 0 ? `${counts.error} error` : ""}
              {counts.error > 0 && counts.warn > 0 ? " • " : ""}
              {counts.warn > 0 ? `${counts.warn} warn` : ""}
            </span>
          )}
        </Button>
      ) : (
        <Card className="w-[min(560px,calc(100vw-2rem))] h-[min(60vh,520px)] bg-background/95 backdrop-blur border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">({entries.length}/{maxEntries})</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(transcript || "(no logs)");
                    addEntry("info", "[ConsoleLogOverlay] Copied logs to clipboard");
                  } catch (e) {
                    addEntry("error", `[ConsoleLogOverlay] Copy failed: ${safeToString(e)}`);
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => setEntries([])}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(60vh-44px)] max-h-[calc(520px-44px)]">
            <div className="p-2 space-y-2">
              {entries.length === 0 ? (
                <div className="text-sm text-muted-foreground">No logs yet.</div>
              ) : (
                entries.map((e) => {
                  const t = new Date(e.ts).toLocaleTimeString();
                  const styles = levelStyles[e.level];

                  return (
                    <div key={e.id} className="rounded-md border border-border bg-card p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", styles.pill)}>
                          {e.level.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{t}</span>
                      </div>
                      <pre className={cn("whitespace-pre-wrap break-words text-xs leading-snug", styles.text)}>
                        {e.message}
                      </pre>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
