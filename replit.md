# Global

## Overview

Sistema de control administrativo de actividades productivas con ventanas flotantes y arrastrables. Gestiona tablas desnormalizadas importadas de archivos DBF con 8 módulos principales (parametros, administracion, bancos, cheques, cosecha, almacen, transferencias, agrodata). Cada módulo incluye carga progresiva de datos con paginación, filtrado completo y edición inline. Incluye sistema de permisos de usuario y funcionalidad de abrir módulos en ventanas externas.

## User Preferences

Preferred communication style: Simple, everyday language.

### Date Format
- All dates use format **dd/mm/aa** (example: 26/01/25)
- Dates are stored as text to avoid timezone issues
- Always use local timezone for date/time display (never UTC)
- Date input fields must auto-insert "/" separators as user types (e.g., typing "26" becomes "26/")

### Auto-populate on New Records
When saving a new record without explicit values:
- **unidad**: If the field exists, use the current `filtrodeunidad` value
- **fecha**: If the field exists, use the current date in dd/mm/aa format
- **tipo**: If the field exists, use the current tab name

### Notification System
- **Errors and Warnings**: Always use `MyPop` (modal popup) - requires user acknowledgment
- **Success messages**: Use `toast` - non-blocking notification that auto-dismisses

### UI Consistency
- **Buttons**: All buttons must have consistent styling throughout the application. Use the same variant, size, and spacing for similar actions across all modules.
- **MyButtonStyle Component**: **ALL buttons in the entire application MUST use `MyButtonStyle`** for consistent styling. Never use `<Button>` directly.
- **Button Feedback**: MyButtonStyle MUST have responsive press feedback. In "alegre" mode: shadow disappears + translate down + brightness flash on press. In "minimizado" mode: scale down + brightness flash on press. Both modes include hover brightness. Use `active:` and `hover:` Tailwind utilities with `transition-all duration-75`.
- **Icon Styling Standard**: ALL icons in menus and title bars MUST use a specific pattern for consistency, including `p-1 rounded-md border-2` container, `h-4 w-4` (or `h-5 w-5` for menu modules) icon size, `text-white` color, and tooltips matching background color.
- **Cache Notifications**: Show toast when cache is cleared to inform the user.

### Charts / Graficas
- **Max 10 points on time axis**: When a chart uses time (dates/months) on the X axis, the data MUST be consolidated into a maximum of 10 points. If data has 10 or fewer points, show them as-is.
- **Expandable chart panels**: Each chart MUST be in its own expandable/collapsible panel with a header (click to expand/collapse) and a close button (X). Use `ChartPanel` pattern with `openCharts` and `expandedCharts` state. All panels start expanded and open.

### Tabs Order
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**.

### Tab Colors (Rainbow Rule)
- **All tabs in all modules MUST follow rainbow color sequence**: `red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose` (repeating cycle). Each tab config must include a `color` property.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **Routing**: Wouter.
- **State Management**: TanStack React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with CSS variables.
- **PDF Generation**: jsPDF with jspdf-autotable.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful endpoints under `/api/`.
- **Database ORM**: Drizzle ORM.
- **Validation**: Zod schemas shared between client and server.

### Data Storage
- **Database**: PostgreSQL.
- **Schema Location**: `shared/schema.ts` defines all table structures, including `users`, `registros`, `fincas_finanza`, `pagos_finanza`, `centrales`, and `fincas`.

### Project Structure
- `client/`: React frontend.
- `server/`: Express backend.
- `shared/`: Code shared between client/server, including schema.
- `migrations/`: Drizzle database migrations.

### Core Features & Design Patterns
- **Normalized Filter Options**: All filter dropdowns use the centralized `parametros` table for consistency.
- **Persisted Filters**: Filter values are stored in localStorage for persistence across sessions.
- **Flexible Tipo Matching**: `matchesTipo` function handles singular/plural variations in parameter types.
- **Automatic Grid Refresh on CRUD**: `useTableMutation` hooks manage CRUD operations, automatically refreshing data and invalidating cache.
- **Shared Schema**: Database types and validation schemas are defined once and shared.
- **PWA Auto-Update**: Service worker detects and applies updates with dynamic cache versioning.
- **Real-time Sync**: WebSocket connection provides real-time updates for key data.
- **Server-First Data Fetching**: Data is fetched directly from the server using TanStack React Query with caching.
- **MyWindow + TableDataContext Pattern**: `MyWindow` component provides `TableDataContext` for centralized data management and automatic loading.
- **Toast Delete Confirmation**: All delete actions use toast-based confirmation.
- **Generic CRUD API**: A generic API pattern at `/api/:tableName` handles CRUD operations for most tables.
- **Cross-Module Relationships**: Event-driven communication for linking records between modules (e.g., Bancos and Administracion).
- **MyDebug Window**: A floating, resizable debug window displays API calls, console errors, fetch errors, and rejected promises with readable endpoint descriptions.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: For database migrations.

### Frontend Libraries
- **Radix UI**: Accessible component primitives.
- **TanStack Query**: Data fetching and caching.
- **date-fns**: Date manipulation.
- **jsPDF**: PDF generation.
- **Lucide React**: Icon library.

### Build Tools
- **Vite**: Frontend development and bundling.
- **esbuild**: Production server bundling.
- **tsx**: TypeScript execution.