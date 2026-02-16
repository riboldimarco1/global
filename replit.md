# Overview

This project is an administrative control system designed for managing productive activities, particularly in agricultural contexts. It features a modular architecture with draggable, floating windows and handles denormalized tables from DBF files. The system includes 8 main modules: Parameters, Administration, Banks, Checks, Harvest, Warehouse, Transfers, and Agrodata. It offers progressive data loading with pagination, extensive filtering, and inline editing. Key capabilities include robust user permission control and the ability to open modules in external windows, aiming to enhance operational efficiency and support informed decision-making in agricultural management.

# User Preferences

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
- **Regla de actualización optimista (cache local)**: Toda operación CRUD en `MyEditingForm` y `MyGrid` debe actualizar el cache local de TanStack Query **inmediatamente** con `queryClient.setQueriesData`. **NO se hace `invalidateQueries`** después de una operación exitosa para evitar parpadeo (doble render).
  - **Agregar/Copiar (POST)**: Insertar el registro retornado por el servidor en el cache con `queryClient.setQueriesData` (`[...oldData, saved]`).
  - **Editar (PUT)**: Reemplazar el registro modificado en el cache con `queryClient.setQueriesData` (`oldData.map(r => r.id === saved.id ? saved : r)`).
  - **Borrar (DELETE)**: Remover el registro del cache con `queryClient.setQueriesData` (`oldData.filter(r => r.id !== deleted.id)`).
  - **Cambio booleano (habilitado)**: Actualizar el campo en el cache con `queryClient.setQueriesData` (`oldData.map(r => r.id === row.id ? { ...r, [field]: value } : r)`).
  - **NUNCA usar `invalidateQueries` después de una operación CRUD exitosa**. El refetch causa un doble render que produce parpadeo visible.
  - **Solo usar `invalidateQueries`** en estos casos: (1) si la operación falla y se necesita restaurar el estado real, (2) cuando el usuario presiona el botón de refrescar manualmente (`handleRefresh`).
  - El predicate para match de queries debe incluir tanto la key exacta (`/api/${tableName}`) como con query string (`/api/${tableName}?...`).
  - Esto aplica a TODAS las tablas y TODOS los módulos, no solo parametros.
- **All tabs in all modules MUST follow rainbow color sequence**.
- Color sequence: `red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose` (repeating cycle).
- Each tab config must include a `color` property from TabColor type.
- Available colors: red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose (and light variants).
- Example: First tab = red, second = orange, third = yellow, etc.
- When cycle completes (after rose), restart from red.
- **Regla general de contraste de textos coloreados**:
  - **TODOS los textos coloreados** (dinámicos con arcoíris o fijos) deben tener alto contraste en ambos temas.
  - **Tema claro**: usar `text-{color}-800` (tonos oscuros para máximo contraste sobre fondos claros).
  - **Tema oscuro**: usar `dark:text-{color}-300` (tonos claros/brillantes para máximo contraste sobre fondos oscuros).
  - **Amarillo** es excepción: usar `text-yellow-800 dark:text-yellow-200` por su baja luminosidad inherente.
  - **Peso de fuente**: siempre `font-bold` en textos coloreados para mayor visibilidad.
  - Aplica a: menú, tabs, subtabs, encabezados de ventanas, filtros, grids, formularios, permisos — cualquier lugar donde se muestre texto con color.
  - Cuando `rainbowEnabled` está desactivado, los textos usan color neutro (sin color especial).

# System Architecture

### Frontend
The frontend uses React and TypeScript with Vite, Wouter for routing, and TanStack React Query for state and data fetching. Forms are managed with React Hook Form and Zod for validation. UI components are built with shadcn/ui (on Radix UI) and styled with Tailwind CSS and Material Design 3-inspired CSS variables. PDF generation is handled by jsPDF.

### Backend
The backend is a Node.js Express.js application with TypeScript (ES modules), providing RESTful APIs. Drizzle ORM is used for database interactions, with Zod schemas enforcing validation.

### Data Storage
PostgreSQL is the primary data store. Database schema definitions are centralized in `shared/schema.ts`.

### Key Design Patterns
- **Generic CRUD API**: A flexible API (`/api/:tableName`) provides CRUD operations for simple tables.
- **Shared Schema**: Centralized database type and validation schema definitions.
- **Storage Interface**: `IStorage` in `server/storage.ts` abstracts database operations.
- **PWA Auto-Update**: Service worker for dynamic caching and app updates.
- **Real-time Sync**: WebSockets (`use-realtime-sync.ts`) for live data updates.
- **`MyWindow` & `TableDataContext`**: `MyWindow` component manages data loading and state for its children, with fullscreen toggling.
- **Automatic Grid Refresh**: `useTableMutation` hooks handle CRUD and data refreshing.
- **`MyDebug` Window**: A floating debug window (`client/src/pages/MyDebug.tsx`) displays API calls and errors.
- **Module Business Flows**: Includes specific logic for handling Cuentas por Cobrar/Pagar and a general user confirmation rule for deletions.

# External Dependencies

### Database
- **PostgreSQL**: Relational database.
- **Drizzle Kit**: Schema migrations.

### Frontend Libraries
- **Radix UI**: Foundational component primitives.
- **TanStack Query**: Data fetching, caching, synchronization.
- **date-fns**: Date manipulation.
- **jsPDF**: Client-side PDF generation.
- **Lucide React**: Icon set.

### Build Tools
- **Vite**: Frontend build tool and development server.
- **esbuild**: Bundler for production server assets.
- **tsx**: TypeScript execution for development.