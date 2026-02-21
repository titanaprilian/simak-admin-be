# Auth API with Role-Based Access Control

A production-ready authentication service built with Bun, Elysia framework, and Prisma ORM. Features secure JWT-based authentication, user management, and granular role-based access control (RBAC).

## Features

### Authentication

- **Secure Login**: Email/password authentication with bcrypt password hashing
- **JWT Access Tokens**: Short-lived access tokens for API authentication
- **Refresh Tokens**: Long-lived refresh tokens with automatic rotation
- **Session Management**: Logout from single device or all devices
- **Token Versioning**: Automatic session invalidation on password change or logout all
- **Rate Limiting**: Built-in rate limiting to prevent brute-force attacks

### User Management

- **Full CRUD Operations**: Create, read, update, and delete users
- **Pagination & Filtering**: List users with pagination, search, and filters
- **Soft Delete Protection**: System users cannot be deleted
- **Self-Delete Protection**: Users cannot delete their own accounts

### Role-Based Access Control (RBAC)

- **Feature Management**: Define application features (e.g., `user_management`, `RBAC_management`)
- **Role Management**: Create and assign roles to users
- **Granular Permissions**: Per-feature permissions (create, read, update, delete, print)
- **Middleware Enforcement**: Permission checks at the API level

### Security

- **Password Hashing**: Secure bcrypt hashing with Bun's native implementation
- **Token Security**: HttpOnly cookies, sameSite restrictions, secure flag in production
- **Helmet Headers**: Security headers via elysia-helmet
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schema validation for all inputs

### Developer Experience

- **TypeScript**: Full type safety with TypeScript
- **OpenAPI/Swagger**: Auto-generated API documentation
- **Structured Logging**: Pino logger with configurable levels
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Automated Pruning**: Cron job to remove expired refresh tokens

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Elysia](https://elysia.dev/)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: JWT (via @elysiajs/jwt)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Pino](https://getpino.io/)
- **API Documentation**: @elysiajs/openapi
- **Testing**: bun:test

## Project Structure

```
src/
├── __tests__/              # Unit and integration tests
│   ├── auth/               # Auth module tests
│   ├── users/              # User module tests
│   ├── rbac/               # RBAC module tests
│   ├── cron/               # Cron job tests
│   ├── health/             # Health check tests
│   └── test_utils.ts       # Test utilities
├── config/
│   └── env.ts              # Environment variable validation
├── libs/
│   ├── base.ts             # Elysia app builders
│   ├── exceptions.ts       # Custom error classes
│   ├── logger.ts           # Pino logger instance
│   ├── prisma.ts           # Prisma client singleton
│   └── response.ts         # Standardized response helpers
├── middleware/
│   ├── auth.ts             # JWT verification middleware
│   ├── error.ts            # Global error handler
│   ├── logger.ts           # Request logging middleware
│   └── permission.ts       # RBAC permission middleware
├── modules/
│   ├── auth/               # Authentication module
│   │   ├── index.ts        # Auth routes
│   │   ├── model.ts        # Response models
│   │   ├── schema.ts       # Zod schemas
│   │   └── service.ts      # Business logic
│   ├── rbac/               # RBAC management module
│   │   ├── error.ts        # RBAC-specific errors
│   │   ├── index.ts        # RBAC routes
│   │   ├── model.ts        # Response models
│   │   ├── schema.ts       # Zod schemas
│   │   └── service.ts      # Business logic
│   ├── user/               # User management module
│   │   ├── error.ts        # User-specific errors
│   │   ├── index.ts        # User routes
│   │   ├── model.ts        # Response models
│   │   ├── schema.ts       # Zod schemas
│   │   └── service.ts      # Business logic
│   ├── health/             # Health check module
│   │   ├── index.ts
│   │   ├── model.ts
│   │   ├── service.ts
│   │   └── state.ts
│   └── index.ts            # Module aggregator
├── plugins/
│   ├── jwt.ts              # JWT configuration
│   ├── openapi.ts          # OpenAPI plugin setup
│   └── rate-limit.ts       # Rate limiting configuration
├── utils/
│   └── time.ts             # Time utilities
└── server.ts               # Application entry point

prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Database seeder
```

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐                                                  │
│  │  Login   │────────────────────────────────────────────────┐ │
│  └──────────┘                                                │ │
│       │                                                       │ │
│       ▼                                                       │ │
│  ┌──────────────┐     ┌─────────────────┐     ┌───────────┐  │ │
│  │ Verify creds │────▶│ Create Refresh  │────▶│  Generate │  │ │
│  │ & password   │     │ Token (DB)      │     │  JWTs     │  │ │
│  └──────────────┘     └─────────────────┘     └───────────┘  │ │
│                                                      │        │ │
│                                                      ▼        │ │
│                                               ┌──────────────┐│ │
│                                               │ Set refresh   ││ │
│                                               │ cookie        ││ │
│                                               └──────────────┘│ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Protected API Request                        │  │
│  │  Authorization: Bearer <access_token>                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Verify JWT Payload                           │  │
│  │  - Check signature                                        │  │
│  │  - Validate sub (user ID)                                 │  │
│  │  - Validate tokenVersion                                  │  │
│  │  - Check user exists & is active                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Check RBAC Permissions                       │  │
│  │  - Look up user's role                                    │  │
│  │  - Check role has permission for feature/action           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Execute Handler                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                      Database Schema                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User ──────────── RefreshToken                                 │
│   │                                                                │
│   │                                                                │
│   └── Role ──────── RoleFeature ──────── Feature                │
│        (many-to-many via join table)                            │
│                                                                  │
│  User Fields:                                                    │
│  - id, email, password, name, isActive, tokenVersion, roleId    │
│                                                                  │
│  RefreshToken Fields:                                           │
│  - id, token, userId, expiresAt, revoked                       │
│                                                                  │
│  Role Fields:                                                   │
│  - id, name, description                                        │
│                                                                  │
│  Feature Fields:                                                 │
│  - id, name, description                                        │
│                                                                  │
│  RoleFeature Fields:                                             │
│  - id, roleId, featureId, canCreate, canRead,                   │
│    canUpdate, canDelete, canPrint                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL database
- Node.js 18+ (for tooling)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd auth-api-rbac
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file with:

```env
NODE_ENV=development
LOG_LEVEL=info
PORT=4000
CORS_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://user:password@localhost:5432/mydb

JWT_ACCESS_SECRET=your-32-char-min-access-secret
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your-32-char-min-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

5. Generate Prisma client and push schema:

```bash
bun prisma:generate
bun prisma:migrate dev
```

6. (Optional) Seed the database:

```bash
bun prisma:seed
```

### Development

Start the development server with hot reload:

```bash
bun run dev
```

The server will start at `http://localhost:4000`.

### Production

Build and start the production server:

```bash
bun run build
bun run start
```

### Testing

Set up the test database:

```bash
bun run test:setup
```

Run tests:

```bash
bun test           # Run all tests
```

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint           | Description             | Auth Required |
| ------ | ------------------ | ----------------------- | ------------- |
| POST   | `/auth/login`      | User login              | No            |
| POST   | `/auth/refresh`    | Refresh access token    | No            |
| POST   | `/auth/logout`     | Logout current session  | No            |
| GET    | `/auth/me`         | Get current user info   | Yes           |
| POST   | `/auth/logout/all` | Logout from all devices | Yes           |

### User Management (`/users`)

| Method | Endpoint     | Description     | Permission Required      |
| ------ | ------------ | --------------- | ------------------------ |
| GET    | `/users`     | List all users  | `user_management:read`   |
| POST   | `/users`     | Create new user | `user_management:create` |
| GET    | `/users/:id` | Get user by ID  | `user_management:read`   |
| PATCH  | `/users/:id` | Update user     | `user_management:update` |
| DELETE | `/users/:id` | Delete user     | `user_management:delete` |

### RBAC Management (`/rbac`)

#### Features

| Method | Endpoint             | Description        | Permission Required      |
| ------ | -------------------- | ------------------ | ------------------------ |
| GET    | `/rbac/features`     | List all features  | `RBAC_management:read`   |
| POST   | `/rbac/features`     | Create new feature | `RBAC_management:create` |
| PATCH  | `/rbac/features/:id` | Update feature     | `RBAC_management:update` |
| DELETE | `/rbac/features/:id` | Delete feature     | `RBAC_management:delete` |

#### Roles

| Method | Endpoint          | Description          | Permission Required      |
| ------ | ----------------- | -------------------- | ------------------------ |
| GET    | `/rbac/roles`     | List all roles       | `RBAC_management:read`   |
| POST   | `/rbac/roles`     | Create new role      | `RBAC_management:create` |
| PATCH  | `/rbac/roles/:id` | Update role          | `RBAC_management:update` |
| DELETE | `/rbac/roles/:id` | Delete role          | `RBAC_management:delete` |
| ME     | `/rbac/roles/me`  | List user permission | `RBAC_management:delete` |

### Health Check (`/`)

| Method | Endpoint | Description           |
| ------ | -------- | --------------------- |
| GET    | `/`      | Health check endpoint |

### OpenAPI Documentation

Access the Swagger UI at `http://localhost:4000/openapi` when the server is running.

## Environment Variables

| Variable                 | Description                             | Required | Default |
| ------------------------ | --------------------------------------- | -------- | ------- |
| `NODE_ENV`               | Environment mode                        | Yes      | -       |
| `LOG_LEVEL`              | Logging level                           | No       | `info`  |
| `PORT`                   | Server port                             | No       | `4000`  |
| `CORS_ORIGIN`            | Allowed CORS origin                     | Yes      | -       |
| `DATABASE_URL`           | PostgreSQL connection URL               | Yes      | -       |
| `JWT_ACCESS_SECRET`      | JWT access token secret (min 32 chars)  | Yes      | -       |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiry                     | Yes      | `15m`   |
| `JWT_REFRESH_SECRET`     | JWT refresh token secret (min 32 chars) | Yes      | -       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry                    | Yes      | `7d`    |

## Scripts

| Command               | Description              |
| --------------------- | ------------------------ |
| `bun run dev`         | Start development server |
| `bun run build`       | Build for production     |
| `bun run start`       | Start production server  |
| `bun prisma:generate` | Generate Prisma client   |
| `bun prisma:migrate`  | Run database migrations  |
| `bun prisma:seed`     | Seed database            |
| `bun test`            | Run all tests            |
| `bun run lint`        | Run ESLint               |
| `bun run format`      | Format with Prettier     |

## Security Best Practices

This implementation follows security best practices:

- Passwords are never logged
- Refresh tokens are stored in the database and can be revoked
- Token versioning invalidates all sessions when needed
- HttpOnly cookies prevent XSS attacks
- Rate limiting prevents brute-force attacks
- Role-based access control at the API level
- Input validation with Zod schemas
- Security headers via Helmet
- CORS configured per environment

## License

MIT
