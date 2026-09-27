export const SESSION_EXPIRED_EVENT = "efm:session-expired";

export function notifySessionExpired(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
