import { Elysia } from "elysia";
import { getLocale, createTranslator, type Translator } from "@/libs/i18n";

declare module "elysia" {
  interface Generic {
    locale: string;
    t: Translator;
  }
}

export const i18nMiddleware = new Elysia()
  .derive(({ headers }) => {
    const acceptLanguage =
      headers["Accept-Language"] || headers["accept-language"] || "";

    const locale = getLocale(acceptLanguage);
    const t = createTranslator(locale);

    return {
      locale,
      t,
    };
  })
  .as("scoped");
