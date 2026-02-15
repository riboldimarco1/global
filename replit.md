# Global

## Overview

Sistema de control administrativo de actividades productivas con ventanas flotantes y arrastrables. La aplicación gestiona tablas desnormalizadas importadas de archivos DBF, organizadas en 8 módulos principales: Parámetros, Administración, Bancos, Cheques, Cosecha, Almacén, Transferencias, y Agrodata. Cada módulo ofrece carga progresiva de datos con paginación, filtrado completo y edición inline. El sistema incluye un robusto control de permisos de usuario y la capacidad de abrir módulos en ventanas externas. La visión es proporcionar una herramienta integral para la gestión agrícola, mejorando la eficiencia operativa y la toma de decisiones.

## User Preferences

- All dates use format **dd/mm/aa** (example: 26/01/25).
- Dates are stored as text to avoid timezone issues.
- Always use local timezone for date/time display (never UTC).
- **Server timezone**: `America/Caracas` (UTC-4) - used via `getLocalDate()` helper in `server/routes.ts` for filenames, timestamps, etc.
- Date input fields must auto-insert "/" separators as user types (e.g., typing "26" becomes "26/").
- **ALL dates displayed in the UI MUST be converted to dd/mm/aa format**.
- Database `date` columns return ISO format (`yyyy-mm-dd`); these MUST be converted before display.
- Use helper function `formatDateForDisplay(isoDate)` to convert: `"2026-02-12"` → `"12/02/26"`.
- This applies to: grids, tables, forms, PDFs, popups, labels — any place a date is shown to the user.
- **NEVER show dates in yyyy-mm-dd or mm/dd/yy format to the user**.
- **ALL date inputs MUST be validated for correctness before saving**.
- Validate that the date is a real, valid calendar date (e.g., reject 31/02/26, 02/17/26, 00/05/26).
- Day must be 1-31 (depending on month), month must be 1-12, year must be reasonable (00-99 for 2-digit).
- Use helper function `isValidDate(dd, mm, aa)` that checks with `new Date(fullYear, month-1, day)` and verifies the components match back.
- Show error message via `MyPop` if the date is invalid, do NOT save the record.
- This applies to: all forms, editing dialogs, inline editing, batch imports — any place a date is entered by the user.
- **ALL text data inserted into the database must be in lowercase** (minúsculas).
- This avoids confusion when applying filters, which are case-sensitive.
- Applies to: nombres, tipos, unidades, and any other text fields.
- When inserting via SQL or API, always use `LOWER()` or ensure values are lowercase.
- When saving a new record without explicit values:
  - **unidad**: If the field exists, use the current `filtrodeunidad` value.
  - **fecha**: If the field exists, use the current date in dd/mm/aa format.
  - **tipo**: If the field exists, use the current tab name.
- **After saving a new record, it must be automatically selected in the grid** via `onRecordSaved` callback.
- Pattern: `onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}`.
- If the module does not track `selectedRowDate`, only set `setSelectedRowId(record.id)`.
- This applies to ALL modules: Bancos, Cheques, Cosecha, Almacen, Transferencias, Arrime, Agrodata, Administracion, Parametros.
- For modules using `MyTab` (Administracion, Parametros), pass `onRecordSaved` as a prop to `MyTab`.
- **ALL automatic inserts** must record `username dd/mm/yyyy hh:mi:ss` in the `propietario` field.
- Backend uses `getLocalDate()` (America/Caracas timezone) for date/time.
- Username comes from frontend via `_username` field in request body (generic CRUD) or `username` field (batch operations).
- Frontend uses `getStoredUsername()` from `@/lib/auth` to retrieve the current user.
- Backend removes `_username` from body after extracting it (not stored in DB).
- If no username provided, defaults to `"sistema"`.
- Applies to: generic `POST /api/:tableName`, `POST /api/transferencias/batch`, and any future batch endpoints.
- Pattern in generic CRUD: `body.propietario = \`${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}\``.
- **Regla general de cálculo de saldos** (aplica a cuentas bancarias, deudas de empleados, movimientos de almacén, etc.):
  - **Primer registro** (en orden cronológico): el saldo es igual al monto del registro. No se suma ni resta nada.
  - **Registros siguientes**: el saldo se calcula sumando o restando el monto del registro actual sobre el saldo del registro **inmediatamente anterior** en orden de fecha.
  - Si un registro no tiene movimiento anterior, significa que es el primer registro (el más antiguo) y su saldo es simplemente su propio monto.
  - El orden siempre es por fecha (y opcionalmente por id para desempatar registros del mismo día).
  - Esto aplica a cualquier módulo que muestre saldos acumulados.
- **NEVER use `doc.save()`** to download PDFs to the user's computer.
- **ALWAYS open PDFs in a new browser tab** using: `window.open(doc.output("bloburl"), "_blank")`.
- This applies to ALL PDF generation in the application (nómina, reportes, etc.).
- Pattern: generate the PDF with jsPDF, then `window.open(doc.output("bloburl"), "_blank")`.
- **ALL notifications MUST use `MyPop`** (modal popup) - requires user acknowledgment.
- This includes errors, warnings, success messages, and informational messages.
- **NEVER use `toast`** for any notification - always use `MyPop` (`showPop`).
- Import: `import { useMyPop } from "@/components/MyPop"` then `const { showPop } = useMyPop()`.
- **Buttons**: All buttons must have consistent styling throughout the application. Use the same variant, size, and spacing for similar actions across all modules.
- **MyButtonStyle Component**: **ALL buttons in the entire application MUST use `MyButtonStyle`** for consistent styling:
  - Import: `import { MyButtonStyle } from "@/components/MyButtonStyle"`.
  - Colors: `green` (create/add), `blue` (restore/edit), `red` (delete), `yellow` (warning), `gray` (cancel/close), `cyan` (copy/import).
  - Props: `color`, `loading`, `disabled`, `onClick`.
  - Example: `<MyButtonStyle color="green" loading={loading}>Crear</MyButtonStyle>`.
  - **REGLA ESTRICTA**: Nunca usar `<Button>` directamente. Siempre usar `<MyButtonStyle>` para mantener consistencia visual.
  - Los botones tienen fondos sólidos con bordes gruesos para mayor visibilidad.
- **ALL icons in menus and title bars** MUST use the following pattern for consistency:
  ```jsx
  <span className="p-1 rounded-md border-2 bg-{color}-600 border-{color}-700 flex items-center justify-center">
    <IconComponent className="h-4 w-4 text-white" />
  </span>
  ```
- Icon containers: `p-1 rounded-md border-2` with solid background and darker border.
- Icon size: `h-4 w-4` (menu modules use `h-5 w-5` for slightly larger icons).
- Text color: Always `text-white` for visibility against colored backgrounds.
- Tooltips: Match background color with icon container color, use `text-white text-xs`.
- **Tab seleccionado debe tener mayor contraste visual** respecto a los inactivos.
- Tab activo: anillo blanco (`ring-2 ring-white`), escala ligeramente mayor (`scale-105`), sin opacidad reducida.
- Tabs inactivos: sin opacidad reducida (se usa fondo más claro vs el activo más oscuro para diferenciar).
- El objetivo es que el usuario identifique de un vistazo cuál tab está seleccionado.
- **Texto de tabs**: El texto debe ser siempre altamente legible:
  - Sobre fondos oscuros: texto `text-white` brillante (nunca gris apagado).
  - Sobre fondos claros (ej. amarillo): texto `text-black` con fondo suficientemente claro para mantener contraste.
- **Todos los botones deben hacer un flash de 300ms al ser presionados** para dar retroalimentación visual inmediata.
- Se usa la clase CSS `animate-flash` definida en `index.css` con `@keyframes flash`.
- Aplica a `MyButtonStyle` y a los `TabsTrigger` en `MyTab`.
- El flash es un breve destello de brillo (brightness) que vuelve a la normalidad en 300ms.
- **NO direct click-to-sort or double-click-to-hide** on grid column headers.
- Column headers use a **context menu dropdown** (single click) with options:
  - "Ordenar" (sort ascending/descending).
  - "Ocultar columna" (hide column).
- Menu is rendered via `ReactDOM.createPortal` at `document.body` level with fixed positioning and viewport boundary clamping.
- Only one header menu open at a time (shared state at MyGrid level).
- Menu closes on outside click, scroll, or option selection.
- Toggle behavior: clicking the same header closes the menu.
- **Show toast when cache is cleared**: When the service worker clears the cache (app update), display a toast notification to inform the user.
- **NEVER hardcode table lists for export/import operations**.
- Always query `pg_tables WHERE schemaname = 'public'` to discover all existing tables dynamically.
- **No tables are excluded** - ALL public tables are included in exports/imports.
- This ensures new tables added in the future are automatically included without code changes.
- **Always add indexes on columns used in WHERE clauses, ORDER BY, and JOIN conditions**.
- When creating or modifying tables, identify columns used for filtering/sorting and add appropriate indexes.
- Composite indexes should follow the order: equality filters first, then range/sort columns (e.g., `(banco, fecha)` for `WHERE banco = X ORDER BY fecha`).
- Indexes are defined in `shared/schema.ts` using Drizzle's `index()` function to persist through migrations.
- **Expression indexes** (e.g., `SUBSTR(fecha, 1, 10)`) cannot be defined in Drizzle schema — they are created directly in the DB and documented here.
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**.
- When adding new tabs, insert them in the correct alphabetical position.
- **All tabs in all modules MUST follow rainbow color sequence**.
- Color sequence: `red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose` (repeating cycle).
- Each tab config must include a `color` property from TabColor type.
- Available colors: red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose (and light variants).
- Example: First tab = red, second = orange, third = yellow, etc.
- When cycle completes (after rose), restart from red.

## System Architecture

### Frontend
The frontend is built with **React** and **TypeScript**, using **Vite** for tooling. **Wouter** handles routing, while **TanStack React Query** manages state and data fetching with caching and background refetching. Forms are managed with **React Hook Form** and **Zod** for validation. UI components leverage **shadcn/ui** built on **Radix UI**, styled with **Tailwind CSS** and CSS variables inspired by Material Design 3. PDF generation uses **jsPDF** with **jspdf-autotable**.

### Backend
The backend is a **Node.js** application using **Express.js** and **TypeScript** with ES modules. It provides **RESTful APIs** under `/api/`. **Drizzle ORM** is used for database interactions, and **Zod schemas** (shared via drizzle-zod) enforce validation.

### Data Storage
The primary data store is **PostgreSQL**. Database schema definitions reside in `shared/schema.ts`, including tables like `users`, `registros`, `fincas_finanza`, `pagos_finanza`, `centrales`, and `fincas`.

### Key Design Patterns
- **Generic CRUD API**: A flexible API at `/api/:tableName` provides CRUD operations for simple tables, configured through `tableConfig` in `server/routes.ts`.
- **Shared Schema**: Database types and validation schemas are centrally defined in `shared/schema.ts` for consistency.
- **Storage Interface**: The `IStorage` interface in `server/storage.ts` abstracts database operations.
- **PWA Auto-Update**: A service worker manages dynamic caching and auto-reloads the application upon updates.
- **Real-time Sync**: WebSocket connections (`use-realtime-sync.ts`) provide live data updates.
- **`MyWindow` & `TableDataContext`**: The `MyWindow` component centralizes data loading and management via `TableDataContext` for its children. It also supports fullscreen toggling with state persistence.
- **Automatic Grid Refresh**: `useTableMutation` hooks handle CRUD operations, automatically refreshing data and invalidating queries.
- **`MyDebug` Window**: A floating debug window (`client/src/pages/MyDebug.tsx`) displays API calls and errors.
- **Module Business Flows**:
    - **Cuentas por Cobrar → Enviar a Ventas**: Moves canceled CXC records to `ventas` and reassigns `codrel` in `bancos`. Includes user confirmation for deleting original CXC records.
    - **Cuentas por Pagar → Enviar a Facturas**: Similar logic for CXP records to `facturas`.
    - **General Deletion Rule**: Always prompts user for confirmation before deleting canceled records.

## External Dependencies

### Database
- **PostgreSQL**: Relational database.
- **Drizzle Kit**: Schema migrations.

### Frontend Libraries
- **Radix UI**: Foundational component primitives for accessibility.
- **TanStack Query**: Data fetching, caching, and synchronization.
- **date-fns**: Comprehensive date manipulation.
- **jsPDF**: Client-side PDF generation.
- **Lucide React**: Icon set.

### Build Tools
- **Vite**: Frontend build tool and development server.
- **esbuild**: Bundler for production server assets.
- **tsx**: TypeScript execution for development.