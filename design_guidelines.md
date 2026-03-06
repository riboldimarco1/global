# Design Guidelines: Sistema de Registro de Centrales

## Design Approach
**System Selected:** Material Design 3 (Google)
**Rationale:** Data-entry applications require clear hierarchy, robust form components, and excellent information density management. Material Design excels at forms, tables, and action-driven interfaces.

## Design Principles
1. **Clarity First:** Every input and action must be immediately obvious
2. **Efficient Data Entry:** Minimize clicks and keyboard actions
3. **Scannable Data:** Grid design optimized for quick visual parsing
4. **Trustworthy Actions:** PDF generation and filtering feel solid and reliable

## Typography
- **Primary Font:** Inter (Google Fonts)
- **Headings:** 600 weight, sizes: 2xl for page titles, xl for section headers
- **Body:** 400 weight, base size for forms and table content
- **Data/Numbers:** 500 weight (tabular-nums) for cantidad and grado columns

## Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8
- Form padding: p-6
- Card spacing: gap-4
- Section margins: mb-8
- Input spacing: space-y-4

**Container Structure:**
- Max width: max-w-7xl for main content
- Form cards: max-w-2xl centered
- Grid: full width within container

## Component Library

### Navigation Bar
- Fixed top, full-width with subtle bottom border
- Logo/app name left-aligned
- Current week indicator right-aligned
- Height: h-16, px-6

### Data Entry Form (Primary Modal/Card)
- Elevated card with rounded corners (rounded-lg)
- Fields in vertical stack:
  - **Fecha:** Date picker with calendar icon
  - **Central:** Dropdown with three options (Portuguesa, Palmar, Otros)
  - **Cantidad:** Number input, right-aligned
  - **Grado:** Number input with decimal support, right-aligned
- Primary "Guardar Registro" button (full width on mobile, auto on desktop)
- Clear visual feedback on submission (subtle success state)

### Week Filter Bar
- Sticky below navigation (top-16)
- Horizontal layout with 3 elements:
  - Week selector dropdown (Semana 1, 2, 3...)
  - Date range display (read-only badge: "3 Nov - 9 Nov, 2025")
  - "Generar PDF" button (secondary style)
- Background color distinct from main content
- Padding: px-6 py-4

### Data Grid
- Clean table with alternating row backgrounds
- Columns: Fecha | Central | Cantidad | Grado | [Edit/Delete Actions]
- Column alignment: Dates left, Central left, numbers right
- Responsive: Stack into cards on mobile
- Row height: generous (h-12) for touch targets
- Hover state on rows for interactivity
- Empty state with illustration and "No hay registros" message

### Buttons & Actions
- **Primary:** Solid fill, medium prominence for main actions
- **Secondary:** Outlined for PDF generation
- **Icon buttons:** Small, circular for edit/delete in table rows
- All buttons: rounded-md, consistent height (h-10)

### PDF Generation
- Trigger from filter bar
- Loading state during generation
- Success notification with download link
- PDF includes: Week number, date range, complete data table, generation timestamp

## Interaction Patterns
- advertising and messages: allways in mypopup
- Form validation: Inline error messages below inputs
- Required fields: Asterisk indicators
- Dropdown menus: Native select styled consistently
- Date picker: Calendar popup, shows current week highlighted
- Modal behavior: Form can appear as overlay or dedicated page section
- Week navigation: Previous/Next week arrows flanking dropdown

## Responsive Behavior
- **Desktop (lg+):** Form in left column (40%), grid in right (60%)
- **Tablet (md):** Stacked: form top, grid below
- **Mobile:** Full-width stacked, table converts to card list

## Data Visualization
- Week totals card above grid showing: Total registros, Sum of cantidad by central
- Minimal charts if beneficial: Simple bar chart for cantidad per central in selected week

## No Images Required
This utility application doesn't need hero images or decorative photography. Focus on clean iconography from Material Icons for actions (calendar, download, edit, delete).

## Accessibility
- All form inputs with proper labels
- Keyboard navigation throughout
- Focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- High contrast text (WCAG AA minimum)