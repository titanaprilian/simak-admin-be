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
      title: "SIMAK API",
      version: "1.0.0",
      description: `
A production-ready academic management system with Role-Based Access Control (RBAC).

### Features
- JWT-based authentication with access & refresh tokens
- Token rotation for security
- Session management (logout single/all devices)
- User, Faculty, Study Program, Lecturer, and Position management
- Role & Feature management with granular permissions
- Dashboard statistics endpoint
- Position-based scope access (FACULTY, STUDY_PROGRAM)

### Security
- Password hashing with bcrypt
- HttpOnly cookies for refresh tokens
- Rate limiting on all endpoints, stricter for auth endpoints (just 10 request per ip per minute)
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
          "User management - Create, read, update, delete users. Requires user_management permissions.",
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
      {
        name: "Faculty",
        description:
          "Faculty management - Create, read, update, delete faculties. Create requires faculty_management:create permission. Update/Delete requires faculty_management permission or SuperAdmin role.",
      },
      {
        name: "Study Program",
        description:
          "Study Program management - Create, read, update, delete study programs within faculties. Create requires studyProgram_management:create permission. Update/Delete requires studyProgram_management permission or FACULTY/STUDY_PROGRAM scoped position.",
      },
      {
        name: "Lecturer",
        description:
          "Lecturer management - Create, read, update, delete lecturer profiles. Requires lecturer_management permissions.",
      },
      {
        name: "Position",
        description:
          "Position management - Create, read, update, delete positions within the system. Requires position_management permissions. Position assignments require position:assign permission.",
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
