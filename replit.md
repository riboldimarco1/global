# Registro de Centrales

## Overview

A data-entry web application for recording and managing weekly reports from power plant centrals ("centrales"). Users can log entries with date, central name (Portuguesa, Palmar, or Otros), quantity, and grade values. The system organizes records by week starting from November 3, 2025, provides filtering by week, displays data in a grid format, and generates PDF reports for each week.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (Material Design 3 inspired)
- **PDF Generation**: jsPDF with jspdf-autotable for client-side PDF creation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between client and server via drizzle-zod

### Data Storage
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Tables**:
  - `users`: Basic user authentication (id, username, password)
  - `registros`: Main data table (id, fecha, central, cantidad, grado)

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components including shadcn/ui
│       ├── pages/        # Route pages
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities (queryClient, weekUtils, pdfGenerator)
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Code shared between client/server
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Drizzle database migrations
```

### Key Design Patterns
- **Shared Schema**: Database types and validation schemas defined once in `shared/schema.ts`, used by both frontend and backend
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Week-based Filtering**: Custom date utilities in `client/src/lib/weekUtils.ts` handle week calculations relative to a fixed start date
- **PWA Update Notification**: Service worker detects new versions and prompts users to reload; version is controlled by `CACHE_VERSION` in `client/public/sw.js` (must be updated manually on each release)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations with `npm run db:push`

### Frontend Libraries
- **Radix UI**: Accessible component primitives (dialogs, selects, tooltips, etc.)
- **TanStack Query**: Data fetching and caching
- **date-fns**: Date manipulation utilities
- **jsPDF**: PDF document generation
- **Lucide React**: Icon library

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Production server bundling
- **tsx**: TypeScript execution for development

### Replit-specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator