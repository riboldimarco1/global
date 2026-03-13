# Overview
This project is an administrative control system for comprehensive agricultural management, aiming to centralize operations, enhance efficiency, ensure data integrity, and boost profitability for agricultural enterprises. Key capabilities include real-time data processing, a modular and intuitive user interface, extensive user permission management, and data-driven decision-making tools. The project seeks to be a robust, scalable, and user-friendly solution, targeting market leadership in integrated farm management software.

# User Preferences
- All dates use format **dd/mm/aa**. Dates are stored as text to avoid timezone issues.
- Always use local timezone for date/time display (never UTC). Server timezone: `America/Caracas` (UTC-4).
- Date input fields must auto-insert "/" separators as user types.
- **ALL dates displayed in the UI MUST be converted to dd/mm/aa format**. Use helper function `formatDateForDisplay(isoDate)` to convert.
- **NEVER show dates in yyyy-mm-dd or mm/dd/yy format to the user**.
- **ALL date inputs MUST be validated for correctness before saving**. Use helper function `isValidDate(dd, mm, aa)`.
- **ALL text data inserted into the database must be in lowercase**.
- When saving a new record without explicit values:
  - **unidad**: If the field exists, use the current `filtrodeunidad` value.
  - **fecha**: If the field exists, use the current date in dd/mm/aa format. **Dates stored in the database MUST be yyyy-mm-dd only (10 characters), NEVER include time/hour**. The field `secuencia` handles ordering within the same day.
  - **tipo**: If the field exists, use the current tab name.
- **After saving a new record, it must be automatically selected in the grid** via `onRecordSaved` callback.
- **ALL automatic inserts** must record `username dd/mm/yyyy hh:mi:ss` in the `propietario` field.
- **Regla general de cálculo de saldos**: For the first record, the balance equals the amount. For subsequent records, the balance is calculated by adding/subtracting the current record's amount from the **immediately preceding** record's balance in chronological order.
- **Regla de reportes HTML**: Todos los reportes del módulo Reportes deben generar una **vista HTML** (tabla en pantalla) con un **botón "Imprimir"** que abre una ventana de impresión. Usar `ReporteHTMLViewer` + funciones `prepare*` de `reportData.ts`. **NO generar PDFs con jsPDF para estos reportes**. Los PDFs de jsPDF solo se usan para propósitos especiales (recibos, listas de transferencias).
- **TODOS los PDFs especiales SIEMPRE en formato vertical (portrait)**.
- **PDFs SIN colores de fondo** (`fillColor: [255, 255, 255]`, `textColor: [0, 0, 0]`). Use visible borders (`lineWidth: 0.2, lineColor: [0, 0, 0]`).
- **Encabezados de columnas SIEMPRE alineados con sus valores**.
- **ALL notifications MUST use `MyPop`** (modal popup). **NEVER use `toast`**.
- **ALL popups and warnings (MyPop) MUST always appear centered on screen**. Every time a popup opens, it resets to center position regardless of previous drag position.
- **MyButtonStyle Component**: **ALL buttons in the entire application MUST use `MyButtonStyle`** for consistent styling.
- **ALL icons in menus and title bars** MUST use the following pattern for consistency:
  ```jsx
  <span className="p-1 rounded-md border-2 bg-{color}-600 border-{color}-700 flex items-center justify-center">
    <IconComponent className="h-4 w-4 text-white" />
  </span>
  ```
- **Tab seleccionado debe tener mayor contraste visual** respecto a los inactivos (active tab: `ring-2 ring-white`, `scale-105`).
- **Texto de tabs**: Always highly legible (`text-white` on dark, `text-black` on light).
- **Todos los botones deben hacer un flash de 300ms al ser presionados**.
- **Al hacer click sobre cualquier campo booleano en la grilla**, se selecciona el registro primero antes de enviar la actualización (para mantener la selección tras refetch).
- **NO direct click-to-sort or double-click-to-hide** on grid column headers. Column headers use a **context menu dropdown** (single click) with options "Ordenar" and "Ocultar columna".
- **NEVER hardcode table lists for export/import operations**. Always query `pg_tables WHERE schemaname = 'public'` to discover all existing tables dynamically.
- **Relación Bancos↔Administración**: Bidireccional simétrica. Al crear relación, AMBOS registros guardan el `codrel` del otro (`bancos.codrel = adminId` Y `administracion.codrel = bancoId`). Ambas tablas tienen `codrel` y `relacionado`. Botón "Relacionar" en ambos módulos. Al romper relación se limpian ambos lados. Al borrar un registro se limpia el lado opuesto y se verifica si quedan referencias antes de marcar `relacionado=false`. Herramienta "Arreglar relaciones" en Herramientas para poblar codrel desde relaciones existentes y reparar inconsistencias.
- **Relación Agronomía↔Almacén**: Bidireccional simétrica. Al crear relación, AMBOS registros guardan el `codrel` del otro (`almacen.codrel = agronomiaId` Y `agronomia.codrel = almacenId`). Ambas tablas tienen `codrel` y `relacionado`. Botón "Relacionar" en ambos módulos. Al romper relación se limpian ambos lados. Al borrar un registro se limpia el lado opuesto y se verifica si quedan referencias antes de marcar `relacionado=false`. Herramienta "Arreglar relaciones" cubre también Almacén↔Agronomía.
- **Transformación a minúsculas en CRUD**: `MyEditingForm.tsx` convierte todos los campos de texto a minúsculas antes de guardar (excepto `id`, `propietario`, `codrel`, `nrofactura` y campos `mac`/`ip`/`date`/`number`/`boolean`).
- **Herramienta "Corregir mayúsculas"**: En el submenú Herramientas, convierte todos los textos existentes en la BD a minúsculas. Endpoint: `POST /api/herramientas/corregir-mayusculas`. Excluye columnas `id`, `propietario`, `codrel`.
- **Always add indexes on columns used in WHERE clauses, ORDER BY, and JOIN conditions**.
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**.
- **Edición en bloque**: Ctrl+Click en el botón "Edi" abre un diálogo de edición en bloque que aplica cambios a todos los registros visibles (sortedData). Backend endpoint: `PUT /api/bulk-update` con `{table, ids[], fields{}}`. Campos bloqueados en servidor: id, saldo, saldo_conciliado, codrel, montodolares.
- **Copia en bloque**: Ctrl+Click en el botón "Cop" abre un diálogo de copia en bloque que crea copias de todos los registros visibles con los campos modificados. Los registros originales no se alteran. Backend endpoint: `POST /api/bulk-copy` con `{table, ids[], fields{}, username}`. Usa transacción DB (todo o nada). Incluye campo `unidad` editable para tablas: administracion, cosecha, almacen, agronomia, transferencias, reparaciones, bitacora, parametros.
- **Respaldos con nombre**: Al crear un respaldo (Salvar), se muestra un diálogo para ingresar el nombre. El archivo se genera como `respaldo_{nombre}_{dd-mm-aa}_{hh-mi-ss}_{usuario}.zip`. Backend `POST /api/backup` requiere `{name, username}`. Nombre sanitizado (solo letras, números, guiones, acentos).
- **Regla de actualización optimista (cache local)**: All CRUD operations in `MyEditingForm` and `MyGrid` must update the TanStack Query local cache **immediately** using `queryClient.setQueriesData`. **DO NOT use `invalidateQueries`** after a successful operation to avoid flickering.
- **All tabs in all modules MUST follow rainbow color sequence** (`red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose`).
- **Regla general de contraste de textos coloreados**: All colored texts must have high contrast in both themes (`text-{color}-800` for light theme, `dark:text-{color}-300` for dark theme, with `font-bold`).
- **Regla general de APIs utilitarias/administrativas**: All utility or administrative endpoints (fixes, migrations, data corrections) MUST use `GET` (not `POST`) so they can be executed directly from the browser. Use a `?dry=true` (default) / `?dry=false` query parameter to control whether changes are actually applied.
- **Regla general de filtros en MyFilter**: TODOS los filtros que se muestran en `MyFilter` (texto, booleanos, descripción, comprobante, rangos numéricos, etc.) SIEMPRE deben procesarse en el servidor (`buildAdvancedFiltersSQL` en `server/routes.ts`). Los valores se envían como `queryParams` al `MyWindow` y el servidor los aplica en la consulta SQL. **NUNCA filtrar datos de MyFilter en el cliente**. El único filtrado cliente permitido es el de `clientDateFilter` (click en celdas de fecha en la grilla).
- **Reportes sin límite**: Los endpoints `/api/bancos` y `/api/administracion` soportan `source=report` query param que elimina el límite de 500 registros para consultas de reportes. `fetchWithServerFilter` en `Reportes.tsx` envía `source=report`, `banco` y demás filtros al servidor.

# System Architecture
The system employs a client-server architecture. The frontend is a React application built with TypeScript, utilizing TanStack React Query for state management, Wouter for routing, and React Hook Form with Zod for robust form validation. UI/UX design adheres to Material Design 3 principles, implemented using shadcn/ui and Tailwind CSS. The backend, developed with Node.js and TypeScript, provides RESTful APIs, connecting to a PostgreSQL database via the Drizzle ORM and using Zod for data validation. A generic CRUD API manages database operations, supported by an `IStorage` abstraction layer, a comprehensive user permissions system, and server-side processing for complex tasks.

# External Dependencies
- PostgreSQL
- React
- TypeScript
- Wouter
- TanStack React Query
- @tanstack/react-virtual — virtualización de listas en MyGrid. Solo renderiza las filas visibles (~40 con overscan=20), mejorando rendimiento con datasets grandes. VirtualizedTableBody component maneja el renderizado virtualizado con padding spacers.
- React Hook Form
- Zod
- jsPDF
- xlsx (SheetJS) — unified bank file parser for HTML/XLS/XLSX imports. Comprobante generation uses hash of all row columns (fecha+descripcion+referencia+monto+operador) for uniqueness. Content-based detection distinguishes integer-only columns (referencia) from decimal columns (monto/saldo) by checking for decimal separators.
- Node.js
- Express.js
- Drizzle ORM

# Audit Log System
- **Table**: `audit_log` with columns: id (SERIAL PK), timestamp (TIMESTAMPTZ), tabla, operacion (insert/update/delete), registro_id, datos_anteriores (JSONB), datos_nuevos (JSONB), usuario, deshecho (BOOLEAN)
- **Retention**: Keeps only last 50 records (auto-cleanup on each insert)
- **Coverage**: All generic POST/PUT/DELETE routes, plus specific routes for bancos, administracion, parametros, almacen, transferencias
- **Undo endpoint**: POST `/api/herramientas/deshacer/:id` — reverts operations with domain-specific recalculations (bancos saldos, almacen existencia)
- **Historial endpoint**: GET `/api/herramientas/historial-crud` — returns last 50 non-undone operations
- **UI**: HistorialCRUD component accessible via Herramientas > "Deshacer operaciones" in FloatingMenu

# Multi-Instance Window System
- **openModules** in App.tsx is a `Map<string, string>` where key=instanceId (e.g. `"bancos"`, `"bancos_2"`), value=moduleKey (e.g. `"bancos"`)
- First instance uses moduleKey as instanceId (e.g. `"bancos"`); subsequent instances append `_N` suffix (e.g. `"bancos_2"`, `"bancos_3"`)
- Each instance has independent window state persisted via `window_state_${instanceId}` in localStorage
- **apiTable prop** on MyWindow: separates the API table name from instanceId — `fetchData` uses `apiTable || id` for API calls so `bancos_2` still fetches from `/api/bancos`
- **FloatingMenu**: Click brings existing instance to front; Ctrl+Click opens a new instance; shows `×N` badge when multiple instances open
- **Persistence**: `app_open_modules` stores unique moduleKeys (not instanceIds); on login restore, only single instances per module are opened
- Instance counter derives next number from `max(existing suffixes, counter state) + 1` to avoid ID collisions after close/reopen

# Portal Table
- **Table**: `portal` with columns: id (UUID PK), fecha (text), nombre (varchar), cedula (varchar), bancofuente (varchar), bancodestino (varchar), comprobante (varchar), estado (boolean)
- **bancofuente**: 19 Venezuelan banks (banco de venezuela, banco del tesoro, banesco, mercantil, bbva provincial, bancamiga, bnc, bancaribe, banplus, banco exterior, banco plaza, venezolano de crédito, bfc, 100% banco, delsur, banco activo, banco caroní, banco sofitasa, banco digital de los trabajadores, banco de la fuerza armada nacional bolivariana)
- **bancodestino**: only "bancamiga" or "banco de venezuela"
- Registered in tableConfig for generic CRUD via `/api/portal`

# Agrodata Extended Fields
- **Original fields**: id, plan, estado, descripcion, utility, propietario, equipo, nombre, ip, mac, latencia
- **Added fields**: usuario, direccion, zona, cedula, telefono, saldo (numeric), fechainstalacion, estadofacturas, diacorte, pagospendientes, pagosrealizados
- **Import tool**: Herramientas > "Importar clientes Agrodata" uploads .xlsx, upserts by nombre, converts text to lowercase
- **Endpoint**: `POST /api/herramientas/importar-clientes-agrodata` (multipart file upload)

# Recordatorio Feature
- **Field**: `recordatorio` (boolean, default false) on all main data tables: bancos, administracion, cosecha, almacen, agronomia, arrime, transferencias, agrodata, reparaciones, bitacora, portal
- **Button**: "Recordar"/"Olvidar" button in MyButtons (Bell/BellOff icon, red/yellow color)
- **Row styling**: Rows with `recordatorio=true` display with white text on red background (`bg-red-700 text-white`)
- **Auto-detection**: MyGrid automatically shows the Recordar button when `tableName` is one of the supported tables (no need to pass `showRecordar` explicitly, though it can be overridden)
- **Toggle**: PATCH to `/api/:tableName/:id` with `{ recordatorio: true/false }` via generic CRUD endpoint