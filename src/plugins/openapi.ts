import { openapi } from "@elysiajs/openapi";

export const openapiPlugin = openapi({
  enabled: process.env.NODE_ENV !== "production",
  path: "/openapi",
  scalar: {
    customCss: `
      /* Fix modal scrolling issue */
      .swagger-modal .modal-body {
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }
      
      /* Fix for Scalar UI - modal scrolling */
      .scalar-modal__window {
        max-height: 90vh !important;
        overflow-y: auto !important;
      }
      
      .scalar-modal__body {
        max-height: calc(90vh - 120px) !important;
        overflow-y: auto !important;
      }
    `,
  },
  documentation: {
    openapi: "3.0.3",
    info: {
      title: "Elysia Auth RBAC API",
      version: "1.0.0",
      description: `
A production-ready authentication service with Role-Based Access Control (RBAC).

### Features
- JWT-based authentication with access & refresh tokens
- Token rotation for security
- Session management (logout single/all devices)
- User management with CRUD operations
- Role & Feature management with granular permissions
- Dashboard statistics endpoint

### Security
- Password hashing with bcrypt
- HttpOnly cookies for refresh tokens
- Rate limiting on auth endpoints
- Protected system roles/features

⚠️ This documentation is disabled in production.
      `.trim(),
    },
    tags: [
      {
        name: "Auth",
        description:
          "Authentication endpoints - Login, refresh token, logout. Publicly accessible with rate limiting.",
      },
      {
        name: "User",
        description:
          "User management - Create, read, update, delete users. Requires user_management permissions",
      },
      {
        name: "Health",
        description:
          "System health check - Public endpoint to verify API status.",
      },
      {
        name: "RBAC",
        description:
          "Role-Based Access Control - Manage roles, features, and permissions. Requires RBAC_management permission.",
      },
      {
        name: "Dashboard",
        description:
          "Dashboard statistics - View system overview (total users, roles, features, user distribution). Accessible to all authenticated users.",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Provide a valid JWT access token in the Authorization header: `Bearer <token>`",
        },
      },
    },
  },
});
