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
- **Always add indexes on columns used in WHERE clauses, ORDER BY, and JOIN conditions**.
- **Parametros module tabs**: All tabs in `client/src/config/parametrosTabs.ts` must be in **alphabetical order by label**.
- **Edición en bloque**: Ctrl+Click en el botón "Edi" abre un diálogo de edición en bloque que aplica cambios a todos los registros visibles (sortedData). Backend endpoint: `PUT /api/bulk-update` con `{table, ids[], fields{}}`. Campos bloqueados en servidor: id, saldo, saldo_conciliado, codrel, montodolares.
- **Regla de actualización optimista (cache local)**: All CRUD operations in `MyEditingForm` and `MyGrid` must update the TanStack Query local cache **immediately** using `queryClient.setQueriesData`. **DO NOT use `invalidateQueries`** after a successful operation to avoid flickering.
- **All tabs in all modules MUST follow rainbow color sequence** (`red → orange → yellow → green → teal → cyan → blue → indigo → violet → purple → pink → rose`).
- **Regla general de contraste de textos coloreados**: All colored texts must have high contrast in both themes (`text-{color}-800` for light theme, `dark:text-{color}-300` for dark theme, with `font-bold`).
- **Regla general de APIs utilitarias/administrativas**: All utility or administrative endpoints (fixes, migrations, data corrections) MUST use `GET` (not `POST`) so they can be executed directly from the browser. Use a `?dry=true` (default) / `?dry=false` query parameter to control whether changes are actually applied.

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
- xlsx (SheetJS) — unified bank file parser for HTML/XLS/XLSX imports. Comprobante generation uses hash of all row columns (fecha+descripcion+referencia+monto+operador) for uniqueness. Content-based detection distinguishes integer-only columns (referencia) from decimal columns (monto/saldo) by checking for decimal separators. Also used in ExcelMergeDialog (Herramientas → Unir archivos Excel) for client-side merging of multiple Excel files into one, and ExcelSummaryDialog (Herramientas → Resumen de archivos Excel) for generating a summary with file name, row count, and Caña column totals.
- Node.js
- Express.js
- Drizzle ORM