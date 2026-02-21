import { Context } from "elysia";
import z, { ZodType } from "zod";
import { t as translate, type Translator } from "@/libs/i18n";
type ElysiaSet = Context["set"];

type MessageInput =
  | string
  | { key: string; params?: Record<string, string | number> };

const resolveMessage = (
  message: MessageInput,
  locale: string,
  translator?: Translator,
): string => {
  if (typeof message === "string") {
    if (translator) {
      return translator(message);
    }
    return message;
  }

  const { key, params } = message;
  return translate(locale, key, params);
};

export const successResponse = <T, E>(
  set: ElysiaSet,
  data: T,
  message: MessageInput = "Success",
  code: number = 200,
  extras?: E,
  locale: string = "en",
) => {
  set.status = code;
  const resolvedMessage = resolveMessage(message, locale);

  return {
    error: false,
    code,
    message: resolvedMessage,
    data,
    ...extras,
  } as {
    error: boolean;
    code: number;
    message: string;
    data: T;
  } & E;
};

export const errorResponse = (
  set: ElysiaSet,
  code: number,
  message: MessageInput,
  issues: unknown = null,
  locale: string = "en",
) => {
  set.status = code;
  const resolvedMessage = resolveMessage(message, locale);

  return {
    error: true,
    code,
    message: resolvedMessage,
    issues,
  };
};

export const createResponseSchema = <T extends ZodType>(schema: T) =>
  z.object({
    error: z.boolean().default(false),
    code: z.number(),
    message: z.string(),
    data: z.union([schema, z.null()]),
  });

export const createErrorSchema = (schema: ZodType = z.any()) =>
  z.object({
    error: z.boolean().default(true),
    code: z.number(),
    message: z.string(),
    issues: z.union([schema, z.null()]),
  });

export const PaginationSchema = z.object({
  page: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z
        .number()
        .min(1, { message: "Page number must be at least 1" })
        .default(1),
    )
    .optional(),

  limit: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z
        .number()
        .min(1, { message: "Limit must be between 1 and 100" })
        .max(100, { message: "Limit must be between 1 and 100" })
        .default(10),
    )
    .optional(),
});

export const createPaginatedResponseSchema = <T extends ZodType>(
  itemSchema: T,
) =>
  z.object({
    error: z.boolean(),
    code: z.number(),
    message: z.string(),
    data: itemSchema,
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  });
