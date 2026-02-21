import { common as commonEn, validation as validationEn } from "@/locales/en";
import { es as commonEs, validation as validationEs } from "@/locales/es";
import { id as commonId, validation as validationId } from "@/locales/id";
import {
  en as authEn,
  es as authEs,
  id as authId,
} from "@/modules/auth/locales";
import {
  en as userEn,
  es as userEs,
  id as userId,
} from "@/modules/user/locales";
import {
  en as rbacEn,
  es as rbacEs,
  id as rbacId,
} from "@/modules/rbac/locales";
import {
  en as healthEn,
  es as healthEs,
  id as healthId,
} from "@/modules/health/locales";
import {
  en as dashboardEn,
  es as dashboardEs,
  id as dashboardId,
} from "@/modules/dashboard/locales";

const en = {
  common: commonEn,
  validation: validationEn,
  auth: authEn,
  user: userEn,
  rbac: rbacEn,
  health: healthEn,
  dashboard: dashboardEn,
};

const es = {
  common: commonEs,
  validation: validationEs,
  auth: authEs,
  user: userEs,
  rbac: rbacEs,
  health: healthEs,
  dashboard: dashboardEs,
};

const id = {
  common: commonId,
  validation: validationId,
  auth: authId,
  user: userId,
  rbac: rbacId,
  health: healthId,
  dashboard: dashboardId,
};

const locales: Record<string, typeof en> = {
  en: en as unknown as typeof en,
  es: es as unknown as typeof en,
  id: id as unknown as typeof en,
};

export const SUPPORTED_LOCALES = Object.keys(locales) as Array<
  keyof typeof locales
>;
export const DEFAULT_LOCALE = "en";

export type Locale = typeof en;

function getLocaleFromHeader(acceptLanguage: string | undefined): string {
  if (!acceptLanguage || acceptLanguage === "*") return DEFAULT_LOCALE;

  const preferred = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().toLowerCase())
    .find((lang) => {
      if (lang === "*") return null;
      if (lang.startsWith("en")) return "en";
      if (lang.startsWith("es")) return "es";
      if (lang.startsWith("id")) return "id";
      return null;
    });

  return preferred ? preferred.split("-")[0] : DEFAULT_LOCALE;
}

export function getLocale(acceptLanguage?: string): string {
  return getLocaleFromHeader(acceptLanguage);
}

export function getTranslations(locale?: string): Locale {
  const validLocale = locale && locales[locale] ? locale : DEFAULT_LOCALE;
  return locales[validLocale];
}

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Locale>;

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function t(
  locale: string,
  key: string,
  params?: Record<string, string | number>,
): string {
  const translations = getTranslations(locale);
  const translation = getNestedValue(translations, key);

  if (!translation) {
    return key;
  }

  if (!params) {
    return translation;
  }

  return translation.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
    return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
  });
}

export function createTranslator(locale: string) {
  return (key: string, params?: Record<string, string | number>) =>
    t(locale, key, params);
}

export type Translator = ReturnType<typeof createTranslator>;
