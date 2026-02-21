import { env } from "@/config/env";
import { jwt } from "@elysiajs/jwt";

export const accessJwt = jwt({
  name: "accessJwt",
  secret: env.JWT_ACCESS_SECRET,
  exp: env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  alg: "HS256",
});

export const refreshJwt = jwt({
  name: "refreshJwt",
  secret: env.JWT_REFRESH_SECRET,
  exp: env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  alg: "HS256",
});
