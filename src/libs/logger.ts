import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  // Silence all logs in automated tests, including `error`.
  enabled: !isTest,
  level: process.env.LOG_LEVEL || "info",

  redact: {
    paths: [
      "email",
      "password",
      "token",
      "access_token",
      "refresh_token",
      "user.password",
    ],
    remove: true,
  },

  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
