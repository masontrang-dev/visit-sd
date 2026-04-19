const SESSION_KEY = "visitsd-session-id";

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function post(body: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/log-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow
  }
}

export function trackPageView(path?: string) {
  if (typeof window === "undefined") return;
  post({
    path: path ?? window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    session_id: getSessionId(),
  });
}

export type TrackableEvent = "outbound_click" | "search";

export function trackEvent(event_type: TrackableEvent, event_label: string) {
  if (typeof window === "undefined") return;
  post({
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    session_id: getSessionId(),
    event_type,
    event_label,
  });
}
