# Agent Guidelines for login-best-practices

## Project Overview

This is a TypeScript-based authentication service using Bun, Elysia framework, and Prisma ORM. The project implements secure login flows with JWT tokens, refresh tokens, and RBAC.

## Build, Lint, and Test Commands

```bash
# Development
bun run dev                    # Start dev server with hot reload
bun run --watch src/server.ts  # Alternative dev command

# Build
bun build src/server.ts --outdir dist --target bun --external @prisma/client
bun run dist/server.js         # Start production server

# Database
prisma generate                # Generate Prisma client
prisma migrate dev             # Run migrations in dev
prisma migrate deploy          # Deploy migrations in prod
prisma migrate reset           # Reset database (dev only)

# Testing
bun test                      # Run all tests
bun test unit                 # Run only unit tests
bun test integration          # Run only integration tests
bun test auth/unit.test.ts    # Run single test file
bun test auth                 # Run all auth tests
bun test:setup                # Setup test DB

# Linting & Formatting
bun run lint                   # Run ESLint
bun run lint:fix               # Fix ESLint issues
bun run format                 # Format with Prettier
bun run prepare                # Install Husky hooks
```

## Code Style Guidelines

### Imports

- Use path aliases: `@/*` for `src/*`, `@modules/*`, `@plugins/*`, `@libs/*`, `@middlewares/*`, `@utils/*`, `@generated/*`
- Place stdlib imports first, then third-party, then local (absolute paths preferred)
- ESLint auto-removes unused imports

### Formatting

- Prettier config: semicolons, trailing commas, no single quotes, 2-space indent, 80-char width
- Run `bun run format` before committing

### Types

- **No `any`** - Use `unknown` or specific types instead (ESLint warns on `any`)
- Enable `strict: true` in tsconfig.json
- Use `zod` for input validation schemas
- Export types for module consumers (e.g., `LoginInput` from schema files)

### Naming Conventions

- **Classes**: PascalCase (e.g., `AuthService`, `AccountDisabledError`)
- **Functions/variables**: camelCase (e.g., `login`, `refreshToken`)
- **Constants**: SCREAMING_SNAKE_CASE for configs (e.g., `JWT_REFRESH_EXPIRES_IN`)
- **Files**: kebab-case for modules, PascalCase for classes
- **Test files**: `*.test.ts` (unit) or `integration.test.ts` (integration)

### Error Handling

**Golden Rule: Never use `throw new Error()` in the service layer.**

All errors must be custom error classes that:

1. Extend the built-in `Error` class
2. Include a `key` property for i18n translation
3. Are registered in the module's `index.ts` using `.onError()`

#### Creating Custom Errors

Create errors in the module's `error.ts` file:

```typescript
// src/modules/[module]/error.ts
import { t } from "@/libs/i18n";

export class DeleteSystemError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "user.deleteSystem"));
    this.key = "user.deleteSystem";
  }
}
```

#### Registering Error Handlers

Register errors in the module's `index.ts`:

```typescript
export const user = createBaseApp({ tags: ["User"] }).group("/users", (app) =>
  app
    .onError(({ error, set, locale }) => {
      if (error instanceof DeleteSystemError) {
        return errorResponse(
          set,
          403,
          { key: "user.deleteSystem" },
          null,
          locale,
        );
      }
    })
    .use(protectedUser),
);
```

#### Common Errors

Use common errors from `@/libs/exceptions.ts` for typical scenarios:

- `AccountDisabledError` - When user account is disabled
- `UnauthorizedError` - For authentication failures
- `ForeignKeyError` - When foreign key constraint fails
- `UniqueConstraintError` - When duplicate entry violates constraint
- `RecordNotFoundError` - When record doesn't exist

These are pre-registered in `createBaseApp` and `createProtectedApp`.

### Logging

- **Log in the Service Layer** - All logging must be implemented in the service layer (see `src/modules/auth/service.ts` as reference)
- Use pino logger from `@/libs/logger` - inject via method parameter: `log: Logger`
- Log levels:
  - `debug`: Method entry, operation details, parameter values
  - `info`: Successful operations (creation, updates, deletions), counts of retrieved data
  - `warn`: Security blocks, validation failures, unauthorized attempts
  - `error`: System errors, database failures, unexpected exceptions
- Include structured context: `log.info({ userId, email, count }, "message")`
- **Never log passwords, tokens, or sensitive data**
- Pattern example:
  ```typescript
  static async getUsers(params: {...}, log: Logger) {
    log.debug({ page, limit }, "Fetching users list");
    // ... database operations
    log.info({ count: users.length, total }, "Users retrieved successfully");
  }
  ```

### Testing

- Use `bun:test` framework with real database (no mocking)
- Use `beforeEach()` to reset database state between tests
- Use `describe()` for grouping, `it()` or `test()` for cases
- Test files: `*.test.ts` in `src/__tests__/[feature]/`
- Use test utilities from `src/__tests__/test_utils.ts`:
  - `getAuthToken()` - Get authentication token for protected routes
  - `resetDatabase()` - Clean up database between test runs

### i18n Testing

Create i18n tests in `src/__tests__/i18n/`:

- `auth.test.ts` - Test auth endpoint i18n
- `user.test.ts` - Test user endpoint i18n
- `rbac.test.ts` - Test RBAC endpoint i18n
- `dashboard.test.ts` - Test dashboard endpoint i18n
- `health.test.ts` - Test health endpoint i18n

```typescript
describe("POST /auth/login - Login i18n", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return Spanish message when Accept-Language is es", async () => {
    await createTestUser({ email: "test@test.com" });

    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept-language": "es",
          "x-forwarded-for": randomIp(),
        },
        body: JSON.stringify({
          email: "test@test.com",
          password: "wrongpassword",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toBe("Email o contraseña inválidos");
  });
});
```

### Architecture

- **Modules**: Feature-based in `src/modules/[name]/` with `index.ts`, `service.ts`, `model.ts`, `schema.ts`, `error.ts`, `locales/`
- **Plugins**: Elysia plugins in `src/plugins/`
- **Middleware**: Auth, error, permission, logging, i18n in `src/middleware/`
- **Libraries**: Prisma client, logger, exceptions, i18n in `src/libs/`
- **Locales**: Common translations in `src/locales/[lang].ts`, module-specific in `src/modules/[name]/locales/[lang].ts`
- **Config**: Environment variables in `src/config/env.ts`

### Internationalization (i18n)

The project uses a module-based i18n structure:

**Common locales** (shared across all modules):

```
src/locales/
  en.ts    # English common + validation messages
  es.ts    # Spanish common + validation messages
  id.ts    # Indonesian common + validation messages
```

**Module-specific locales** (each module has its own):

```
src/modules/
  auth/
    locales/
      en.ts, es.ts, id.ts
  user/
    locales/
      en.ts, es.ts, id.ts
  rbac/
    locales/
      en.ts, es.ts, id.ts
  dashboard/
    locales/
      en.ts, es.ts, id.ts
  health/
    locales/
      en.ts, es.ts, id.ts
```

**Using i18n in routes:**

```typescript
import { successResponse, errorResponse } from "@/libs/response";

// Success message with i18n
return successResponse(
  set,
  data,
  { key: "user.createSuccess" }, // uses module-specific translation
  201,
  undefined,
  locale,
);

// Error message with i18n
return errorResponse(
  set,
  404,
  { key: "common.notFound" }, // uses common translation
  null,
  locale,
);
```

**Frontend:** Send `Accept-Language` header with requests (e.g., `es-ES`, `id-ID`, `en`)

## Feature Implementation Flow

When implementing a new feature (e.g., new module for "products"), follow this workflow:

### 1. Database Schema

```bash
# Edit prisma/schema.prisma to add new models
# Then generate and apply migration
prisma migrate dev --name add_products
prisma generate
```

### 2. Create Module Structure

Create `src/modules/products/` with:

- `schema.ts` - Zod validation schemas for inputs/outputs
- `model.ts` - TypeBox schemas for API documentation
- `error.ts` - Custom error classes (required)
- `service.ts` - Business logic with logging
- `index.ts` - Route handlers
- `locales/` - i18n translations (optional)

```
src/modules/products/
  index.ts
  service.ts
  model.ts
  schema.ts
  error.ts
  locales/
    en.ts
    es.ts
    id.ts
```

### 3. Create Custom Errors

Create error classes in `error.ts` for business logic failures:

```typescript
// src/modules/products/error.ts
import { t } from "@/libs/i18n";

export class ProductNotFoundError extends Error {
  readonly key: string;

  constructor(locale: string = "en") {
    super(t(locale, "products.notFound"));
    this.key = "products.notFound";
  }
}

export class InsufficientStockError extends Error {
  readonly key: string;
  readonly available: number;

  constructor(available: number, locale: string = "en") {
    super(t(locale, "products.insufficientStock", { available }));
    this.key = "products.insufficientStock";
    this.available = available;
  }
}
```

### 4. Service Layer with Logging

Use custom errors instead of generic `throw new Error()`:

```typescript
import type { Logger } from "pino";
import { prisma } from "@/libs/prisma";
import { ProductNotFoundError, InsufficientStockError } from "./error";

export abstract class ProductService {
  static async getProducts(params: {...}, log: Logger) {
    log.debug({ page, limit }, "Fetching products list");

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({...}),
      prisma.product.count({ where }),
    ]);

    log.info({ count: products.length, total }, "Products retrieved successfully");
    return { products, pagination: {...} };
  }

  static async createProduct(data: CreateProductInput, log: Logger) {
    log.debug({ name: data.name }, "Creating new product");

    const product = await prisma.product.create({ data });

    log.info({ productId: product.id }, "Product created successfully");
    return product;
  }

  static async updateProduct(id: string, data: UpdateProductInput, log: Logger) {
    log.debug({ productId: id }, "Updating product");

    const product = await prisma.product.update({ where: { id }, data });

    log.info({ productId: id }, "Product updated successfully");
    return product;
  }

  static async deleteProduct(id: string, log: Logger) {
    log.debug({ productId: id }, "Deleting product");

    await prisma.product.delete({ where: { id } });

    log.info({ productId: id }, "Product deleted successfully");
  }

  static async getProductById(id: string, log: Logger, locale: string = "en") {
    log.debug({ productId: id }, "Fetching product by ID");

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      log.warn({ productId: id }, "Product not found");
      throw new ProductNotFoundError(locale);
    }

    return product;
  }

  static async checkStock(id: string, quantity: number, log: Logger, locale: string = "en") {
    log.debug({ productId: id, quantity }, "Checking product stock");

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new ProductNotFoundError(locale);
    }

    if (product.stock < quantity) {
      throw new InsufficientStockError(product.stock, locale);
    }

    return true;
  }
}
```

### 5. Route Handlers with Error Registration

Register custom error handlers in the module's `index.ts`:

```typescript
import { createBaseApp, createProtectedApp } from "@/libs/base";
import { successResponse, errorResponse } from "@/libs/response";
import { ProductService } from "./service";
import { ProductNotFoundError, InsufficientStockError } from "./error";

const protectedProducts = createProtectedApp()
  .onError(({ error, set, locale }) => {
    if (error instanceof ProductNotFoundError) {
      return errorResponse(
        set,
        404,
        { key: "products.notFound" },
        null,
        locale,
      );
    }

    if (error instanceof InsufficientStockError) {
      return errorResponse(
        set,
        400,
        {
          key: "products.insufficientStock",
          params: { available: error.available },
        },
        null,
        locale,
      );
    }
  })
  .get("/", async ({ query, set, log, locale }) => {
    const { products, pagination } = await ProductService.getProducts(
      query,
      log,
    );
    return successResponse(
      set,
      products,
      { key: "products.listSuccess" },
      200,
      {
        pagination,
      },
      locale,
    );
  })
  .get("/:id", async ({ params, set, log, locale }) => {
    const product = await ProductService.getProductById(params.id, log, locale);
    return successResponse(
      set,
      product,
      { key: "products.getSuccess" },
      200,
      undefined,
      locale,
    );
  })
  .post("/", async ({ body, set, log, locale }) => {
    const product = await ProductService.createProduct(body, log);
    return successResponse(
      set,
      product,
      { key: "products.createSuccess" },
      201,
      undefined,
      locale,
    );
  });

export const products = createBaseApp({ tags: ["Products"] }).group(
  "/products",
  (app) => app.use(protectedProducts),
);
```

### 6. Testing

Create tests in `src/__tests__/products/`:

- `list.test.ts` - Test GET endpoint with pagination
- `get.test.ts` - Test GET endpoint detail
- `create.test.ts` - Test POST endpoint
- `update.test.ts` - Test PATCH endpoint
- `delete.test.ts` - Test DELETE endpoint

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { app } from "@/app";
import { getAuthToken, resetDatabase } from "@tests/test_utils";

describe("POST /products", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should create a new product", async () => {
    const token = await getAuthToken();

    const res = await app.handle(
      new Request("http://localhost/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Test Product",
          price: 99.99,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Test Product");
  });
});
```

### 7. Register Module

Add to `src/modules/index.ts`:

```typescript
import { products } from "./products";

export const modules = [auth, user, rbac, products];
```

### 8. Verify

```bash
bun run lint           # Check for linting errors
bun test products      # Run feature tests
bun run dev            # Test manually
```

### Security Best Practices

- Never commit secrets - use `.env` files
- Hash passwords with `Bun.password` (bcrypt)
- Rotate refresh tokens on use
- Increment `tokenVersion` on logout_all or password change
- Validate all inputs with Zod schemas
- Use HTTPS in production, Helmet for headers
- Rate limiting enabled via `globalRateLimit` plugin
