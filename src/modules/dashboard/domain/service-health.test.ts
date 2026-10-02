import { describe, expect, it } from "vitest";
import { computeSyncHealth, formatElapsed, heartbeatHealth } from "./service-health";

const NOW = new Date("2024-01-01T12:00:00Z").getTime();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

describe("formatElapsed", () => {
  it("returns empty string for negative minutes", () => {
    expect(formatElapsed(-1)).toBe("");
  });

  it("returns 'menos de 1 minuto' for zero", () => {
    expect(formatElapsed(0)).toBe("há menos de 1 minuto");
  });

  it("formats minutes under an hour", () => {
    expect(formatElapsed(30)).toBe("há 30 min");
  });

  it("formats hours and remaining minutes", () => {
    expect(formatElapsed(90)).toBe("há 1h 30min");
  });

  it("formats exact hours without remainder", () => {
    expect(formatElapsed(120)).toBe("há 2h");
  });

  it("formats days and remaining hours", () => {
    expect(formatElapsed(25 * 60)).toBe("há 1d 1h");
  });

  it("formats exact days without remainder", () => {
    expect(formatElapsed(24 * 60)).toBe("há 1d");
  });
});

describe("heartbeatHealth", () => {
  it("is unknown when there is no ping", () => {
    expect(heartbeatHealth(null, NOW)).toEqual({ level: "unknown", label: "Sem ping na base", minutes: -1 });
  });

  it("is unknown when the timestamp is invalid", () => {
    expect(heartbeatHealth("not-a-date", NOW)).toEqual({
      level: "unknown",
      label: "Sem ping na base",
      minutes: -1,
    });
  });

  it("is healthy within 5 minutes", () => {
    expect(heartbeatHealth(minutesAgo(3), NOW)).toEqual({ level: "healthy", label: "Operacional", minutes: 3 });
  });

  it("is a warning between 6 and 15 minutes", () => {
    expect(heartbeatHealth(minutesAgo(10), NOW)).toEqual({ level: "warning", label: "Atraso", minutes: 10 });
  });

  it("is critical beyond 15 minutes", () => {
    expect(heartbeatHealth(minutesAgo(30), NOW)).toEqual({ level: "critical", label: "Serviço parado", minutes: 30 });
  });
});

describe("computeSyncHealth", () => {
  it("is unknown when neither log nor heartbeat exist", () => {
    expect(computeSyncHealth(null, null, NOW)).toEqual({ level: "unknown", label: "Sem ping na base", minutes: -1 });
  });

  it("falls back to the heartbeat when there is no sync_log row", () => {
    expect(computeSyncHealth(null, minutesAgo(2), NOW)).toEqual({
      level: "healthy",
      label: "Operacional",
      minutes: 2,
    });
  });

  it("derives health from sync_log when there is no heartbeat", () => {
    expect(computeSyncHealth(minutesAgo(20), null, NOW)).toEqual({
      level: "critical",
      label: "Serviço parado",
      minutes: 20,
    });
  });

  it("prefers the heartbeat when it is more recent than the log", () => {
    expect(computeSyncHealth(minutesAgo(30), minutesAgo(2), NOW)).toEqual({
      level: "healthy",
      label: "Operacional",
      minutes: 2,
    });
  });

  it("prefers the log-derived status when the log is more recent than the heartbeat", () => {
    expect(computeSyncHealth(minutesAgo(2), minutesAgo(30), NOW)).toEqual({
      level: "healthy",
      label: "Operacional",
      minutes: 2,
    });
  });
});
