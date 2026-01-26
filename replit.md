# Registro de Centrales

## Overview

A data-entry web application for recording and managing weekly reports from power plant centrals ("centrales"). Users can log entries with date, central name (Portuguesa, Palmar, or Otros), quantity, and grade values. The system organizes records by week starting from November 3, 2025, provides filtering by week, displays data in a grid format, and generates PDF reports for each week.

## User Preferences

Preferred communication style: Simple, everyday language.

### Date Format
- All dates use format **dd/mm/aa** (example: 26/01/25)
- Dates are stored as text to avoid timezone issues

### Auto-populate on New Records
When saving a new record without explicit fecha/unidad:
- **unidad**: Use the current `filtrodeunidad` value
- **fecha**: Use the current date in dd/mm/aa format

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
  - `fincas_finanza`: Finanza module finca configurations (id, nombre, central, costo_cosecha, comp_flete, valor_ton_azucar, valor_melaza_tc)
  - `pagos_finanza`: Finanza module payments (id, fecha, finca, central, monto, comentario)
  - `centrales`: Power plant central names (id, nombre)
  - `fincas`: Farm names for Arrime module (id, nombre)

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
- **Real-time Sync**: WebSocket connection in `client/src/hooks/use-realtime-sync.ts` handles real-time updates for registros, centrales, fincas, and Finanza data (fincas_finanza, pagos_finanza)
- **Server-First Data Fetching**: All data is fetched directly from the server using TanStack React Query with automatic caching and background refetching. This provides a simpler, more reliable data flow:
  - Module pages use MyWindow with `autoLoadTable` which provides TableDataContext for centralized data management
  - Child components use `useTableData()` hook to access tableData, onRefresh, onEdit, onCopy, onDelete
  - Mutations invalidate the appropriate query keys to trigger automatic refetching
  - Client-side filtering applied via MyTab's `filterFn` prop for additional filtering beyond tab selection
- **MyWindow + TableDataContext Pattern**: MyWindow component provides TableDataContext to its children:
  - Loads data automatically when `autoLoadTable={true}` is set
  - Child components like ParametrosContent use `useTableData()` to access data without duplicate fetching
  - Eliminates duplicate API calls by using context as single source of truth
- **Toast Delete Confirmation**: All delete actions in Parametros module use toast-based confirmation:
  - Each tab has a `confirmDelete(id)` function that shows a toast with "¿Está seguro?" title
  - Users must click "Confirmar" button within the toast to proceed with deletion
  - Prevents accidental data loss with non-intrusive confirmation flow
- **Generic CRUD API**: A generic API pattern at `/api/:tableName` handles CRUD operations for simple tables:
  - Configured via `tableConfig` object in `server/routes.ts`
  - Supports tables: parametros, actividades, clientes, insumos, personal, productos, proveedores, centrales, fincas, registros, operaciones-bancarias, tasas-dolar, almacen, cosecha, cheques, transferencias, administracion, bancos
  - Special logic for bancos table (saldo recalculation)
  - Known limitation: Route pattern doesn't capture slashes, so nested routes (finanza/*, administracion/*) keep specific endpoints
  - Some tables have both specific endpoints (GET) and generic fallback (POST/PUT/DELETE) - partial migration

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