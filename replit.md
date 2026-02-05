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

### Cache Notifications
- **Show toast when cache is cleared**: When the service worker clears the cache (app update), display a toast notification to inform the user

### Tabs Order
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**
- When adding new tabs, insert them in the correct alphabetical position

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

### Normalized Filter Options
All filter dropdowns across modules now use the centralized `parametros` table instead of extracting unique values from each table's data.

**Field to Parametros Type Mapping** (in `client/src/hooks/useParametrosOptions.ts`):
- `unidad` → `unidades`
- `insumo` → `insumos`
- `operacion` → `formadepago`
- `categoria` → `categorias`
- `cultivo` → `cultivo`
- `ciclo` → `ciclo`
- `chofer` → `chofer`
- `destino` → `destino`
- `banco` → `bancos`
- `actividad` → `actividades`
- `proveedor` → `proveedores`
- `personal` → `personal`
- `producto` → `productos`
- `cliente` → `clientes`

### Persisted Filters
Filter values (filtrodeunidad, filtrodebanco) are persisted in localStorage so they restore when reopening a window:
- Hook: `client/src/hooks/usePersistedFilter.ts`
- Storage key format: `filtro_{windowId}_{filterName}` (e.g., `filtro_almacen_unidad`)
- Each module has its own persisted filter that survives window close/reopen

### Flexible Tipo Matching
The `matchesTipo` function handles singular/plural variations in parameter types:
- Located in: `useParametrosOptions.ts`, `ParametrosContext.tsx`, `MyFiltroDeUnidad.tsx`
- Examples: searching for "chofer" also finds tipo="choferes", "cultivo" finds "cultivos"
- Eliminates need to normalize all tipo values in database

### Key Design Patterns
- **Automatic Grid Refresh on CRUD**: Use `useTableMutation` hooks from `client/src/hooks/useTableMutation.ts` for all CRUD operations. These hooks automatically:
  1. Call `onRefresh()` from TableDataContext after successful operations
  2. Invalidate TanStack Query cache
  3. Show error toasts on failure
  - **useUpdateMutation(tableName?)**: For updating individual fields (`{ id, field, value }`)
  - **useDeleteMutation(tableName?)**: For deleting records (`{ id }`)
  - **useCreateMutation(tableName?)**: For creating new records
  - **useTableMutation(options)**: Base hook for custom mutation scenarios
  - These hooks get the tableName from TableDataContext if not provided explicitly
- **Shared Schema**: Database types and validation schemas defined once in `shared/schema.ts`, used by both frontend and backend
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Week-based Filtering**: Custom date utilities in `client/src/lib/weekUtils.ts` handle week calculations relative to a fixed start date
- **PWA Auto-Update**: Service worker automatically detects and applies updates. Uses dynamic cache versioning (Date.now()) and auto-reloads when new version is activated. Checks for updates every 60 seconds and on initial load.
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
- **Cross-Module Relationships**: The Bancos module can link records to Administracion via banco_id:
  - "Relacionar" button in Bancos dispatches a custom event ("setAdminBancoId") with the selected banco's ID
  - Administracion listens for this event and stores banco_id in state
  - When creating new records in Administracion while banco_id is set, the banco_id is included in the POST request
  - The /api/administracion endpoint supports filtering by banco_id query parameter
  - This event-driven approach works even when Administracion is already mounted/minimized
- **MyDebug Window**: Ventana de depuración flotante y redimensionable ubicada en `client/src/pages/MyDebug.tsx`:
  - **Características**: Ventana flotante con MyWindow, redimensionable con persistencia de tamaño en localStorage
  - **Llamadas API**: Muestra todas las llamadas API con método (GET/POST/PUT/DELETE), descripción del endpoint, código de estado y duración
  - **Errores**: Captura errores de consola, errores de fetch y promesas rechazadas
  - **Descripciones de Endpoints**: Mapa interno que traduce rutas API a descripciones legibles (ej: `/api/bancos` → "Obtener movimientos bancarios")
  - **Matching de Rutas**: Soporta rutas con parámetros (UUIDs, IDs numéricos, fechas, alfanuméricos)
  - **Fallback**: Si un endpoint no está mapeado, muestra el path completo de la API
  - **Limpieza**: Botones para limpiar llamadas API y errores independientemente

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