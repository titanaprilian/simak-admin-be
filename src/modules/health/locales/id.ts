export const id = {
  serverUp: "Server berjalan",
  serverShuttingDown: "Server sedang shuts down",
} as const;

export type HealthLocale = typeof id;
