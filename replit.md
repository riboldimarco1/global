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
- Import: `import { useMyPop } from "@/components/MyPop"` then `const { showPop } = useMyPop()`

### UI Consistency
- **Buttons**: All buttons must have consistent styling throughout the application. Use the same variant, size, and spacing for similar actions across all modules.
- **MyButtonStyle Component**: **ALL buttons in the entire application MUST use `MyButtonStyle`** for consistent styling:
  - Import: `import { MyButtonStyle } from "@/components/MyButtonStyle"`
  - Colors: `green` (create/add), `blue` (restore/edit), `red` (delete), `yellow` (warning), `gray` (cancel/close), `cyan` (copy/import)
  - Props: `color`, `loading`, `disabled`, `onClick`
  - Example: `<MyButtonStyle color="green" loading={loading}>Crear</MyButtonStyle>`
  - **REGLA ESTRICTA**: Nunca usar `<Button>` directamente. Siempre usar `<MyButtonStyle>` para mantener consistencia visual.
  - Los botones tienen fondos sólidos con bordes gruesos para mayor visibilidad.

### Icon Styling Standard
- **ALL icons in menus and title bars** MUST use the following pattern for consistency:
  ```jsx
  <span className="p-1 rounded-md border-2 bg-{color}-600 border-{color}-700 flex items-center justify-center">
    <IconComponent className="h-4 w-4 text-white" />
  </span>
  ```
- Icon containers: `p-1 rounded-md border-2` with solid background and darker border
- Icon size: `h-4 w-4` (menu modules use `h-5 w-5` for slightly larger icons)
- Text color: Always `text-white` for visibility against colored backgrounds
- Tooltips: Match background color with icon container color, use `text-white text-xs`
- Color assignments:
  - Home/Navigation: teal-600
  - Refresh: blue-600
  - Popout/External: purple-600
  - Maximize/Fullscreen: green-600
  - Minimize: yellow-600
  - Close/Logout: red-600
  - Theme (dark): indigo-600, (light): amber-500, (system): slate-600
  - Background color picker: sky-600
  - Window color picker: pink-600
  - Propietario toggle: violet-600 (on), gray-500 (off)
  - Server status: green-600 (connected), red-600 (disconnected)
  - Export Excel: emerald-600
  - Backup/Database: blue-600
  - Tools: slate-600
  - Manual: sky-600
  - Font size controls (T-/T+): orange-600

### Tab Selection Visibility
- **Tab seleccionado debe tener mayor contraste visual** respecto a los inactivos
- Tab activo: anillo blanco (`ring-2 ring-white`), escala ligeramente mayor (`scale-105`), sin opacidad reducida
- Tabs inactivos: `opacity-70` para que el activo destaque claramente
- El objetivo es que el usuario identifique de un vistazo cuál tab está seleccionado
- **Texto de tabs**: El texto debe ser siempre altamente legible:
  - Sobre fondos oscuros: texto `text-white` brillante (nunca gris apagado)
  - Sobre fondos claros (ej. amarillo): texto `text-black` con fondo suficientemente claro para mantener contraste

### Button Flash on Click
- **Todos los botones deben hacer un flash de 300ms al ser presionados** para dar retroalimentación visual inmediata
- Se usa la clase CSS `animate-flash` definida en `index.css` con `@keyframes flash`
- Aplica a `MyButtonStyle` y a los `TabsTrigger` en `MyTab`
- El flash es un breve destello de brillo (brightness) que vuelve a la normalidad en 300ms

### Grid Header Interaction
- **NO direct click-to-sort or double-click-to-hide** on grid column headers
- Column headers use a **context menu dropdown** (single click) with options:
  - "Ordenar" (sort ascending/descending)
  - "Ocultar columna" (hide column)
- Menu is rendered via `ReactDOM.createPortal` at `document.body` level with fixed positioning and viewport boundary clamping
- Only one header menu open at a time (shared state at MyGrid level)
- Menu closes on outside click, scroll, or option selection
- Toggle behavior: clicking the same header closes the menu

### Cache Notifications
- **Show toast when cache is cleared**: When the service worker clears the cache (app update), display a toast notification to inform the user

### Tabs Order
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**
- When adding new tabs, insert them in the correct alphabetical position

### Tab Colors (Rainbow Rule)
- **All tabs in all modules MUST follow rainbow color sequence**
- Color sequence: `red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose` (repeating cycle)
- Each tab config must include a `color` property from TabColor type
- Available colors: red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose (and light variants)
- Example: First tab = red, second = orange, third = yellow, etc.
- When cycle completes (after rose), restart from red

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS with CSS variables (Material Design 3 inspired)
- **PDF Generation**: jsPDF with jspdf-autotable

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/`
- **Database ORM**: Drizzle ORM
- **Validation**: Zod schemas shared via drizzle-zod

### Data Storage
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Tables**: `users`, `registros`, `fincas_finanza`, `pagos_finanza`, `centrales`, `fincas`

### Project Structure
```
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Code shared between client/server
└── migrations/       # Drizzle database migrations
```

### Normalized Filter Options
All filter dropdowns use the centralized `parametros` table for options, mapping fields like `unidad` to `unidades`, `insumo` to `insumos`, etc.

### Persisted Filters
Filter values are persisted in `localStorage` using `filtro_{windowId}_{filterName}` keys for state restoration.

### Flexible Tipo Matching
The `matchesTipo` function handles singular/plural variations for parameter types (e.g., "chofer" matches "choferes").

### Key Design Patterns
- **Automatic Grid Refresh on CRUD**: `useTableMutation` hooks manage CRUD, automatically refreshing data, invalidating queries, and showing toasts.
- **Shared Schema**: Database types and validation schemas defined once in `shared/schema.ts`.
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations.
- **Week-based Filtering**: Custom date utilities in `client/src/lib/weekUtils.ts` for week calculations.
- **PWA Auto-Update**: Service worker detects and applies updates with dynamic caching and auto-reload.
- **Real-time Sync**: WebSocket connection (`use-realtime-sync.ts`) provides real-time updates for key data.
- **Server-First Data Fetching**: TanStack React Query handles data fetching with caching and background refetching. `MyWindow` with `autoLoadTable` provides `TableDataContext` for centralized data management.
- **MyWindow + TableDataContext Pattern**: `MyWindow` component provides `TableDataContext` to children, centralizing data loading and access.
- **MyWindow Fullscreen/Maximize**: `MyWindow` instances have a green maximize button for fullscreen toggling, with state persisted in `localStorage`.
- **Toast Delete Confirmation**: All delete actions in `Parametros` use toast-based confirmation to prevent accidental data loss.
- **Generic CRUD API**: A generic API pattern at `/api/:tableName` handles CRUD for simple tables, configured via `tableConfig` in `server/routes.ts`.
- **Cross-Module Relationships**: Bancos module can link records to Administracion via custom events.
- **MyDebug Window**: A floating, resizable debug window (`client/src/pages/MyDebug.tsx`) displays API calls and errors with readable descriptions.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: Database migrations.

### Frontend Libraries
- **Radix UI**: Accessible component primitives.
- **TanStack Query**: Data fetching and caching.
- **date-fns**: Date manipulation utilities.
- **jsPDF**: PDF document generation.
- **Lucide React**: Icon library.

### Build Tools
- **Vite**: Frontend development server and bundler.
- **esbuild**: Production server bundling.
- **tsx**: TypeScript execution for development.

### Replit-specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay.
- **@replit/vite-plugin-cartographer**: Development tooling.
- **@replit/vite-plugin-dev-banner**: Development environment indicator.