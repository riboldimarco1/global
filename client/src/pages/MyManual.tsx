import { useState } from "react";
import { Book, ChevronDown, ChevronRight, MousePointer2, Filter, Edit3, Upload, Keyboard, Settings } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ManualSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ManualSection({ title, icon, children, defaultOpen = false }: ManualSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-2">
      <CollapsibleTrigger 
        className="flex items-center gap-2 w-full p-3 hover-elevate"
        data-testid={`trigger-section-${sectionId}`}
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="text-blue-500">{icon}</span>
        <span className="font-medium text-sm">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2 text-sm text-muted-foreground space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface MyManualProps {
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function MyManual({ onClose, onFocus, zIndex = 200 }: MyManualProps) {
  return (
    <MyWindow
      id="manual-usuario"
      title="Manual de Usuario"
      icon={<Book className="h-4 w-4" />}
      initialPosition={{ x: 100, y: 50 }}
      initialSize={{ width: 500, height: 600 }}
      minSize={{ width: 400, height: 400 }}
      maxSize={{ width: 700, height: 800 }}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-blue-500/40"
      startMinimized={false}
      canClose={true}
    >
      <ScrollArea className="h-full p-4">
        <div className="space-y-4">
          <div className="text-center pb-4 border-b" data-testid="section-manual-header">
            <h1 className="text-lg font-bold">Sistema de Control Administrativo</h1>
            <p className="text-xs text-muted-foreground mt-1">Guia rapida de uso</p>
          </div>

          <ManualSection title="Modulos Disponibles" icon={<Settings className="h-4 w-4" />} defaultOpen={true}>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Parametros:</strong> Configuracion de unidades, actividades, proveedores, personal, etc.</li>
              <li><strong>Administracion:</strong> Registro de gastos, ingresos y movimientos financieros por unidad.</li>
              <li><strong>Bancos:</strong> Control de movimientos bancarios, conciliacion e importacion de estados de cuenta.</li>
              <li><strong>Cheques:</strong> Gestion de cheques emitidos y recibidos.</li>
              <li><strong>Cosecha:</strong> Registro de cosechas por cultivo, ciclo y destino.</li>
              <li><strong>Almacen:</strong> Control de inventario de insumos y productos.</li>
              <li><strong>Transferencias:</strong> Movimientos entre cuentas y unidades.</li>
              <li><strong>Agrodata:</strong> Monitoreo de equipos de red y conectividad.</li>
            </ul>
          </ManualSection>

          <ManualSection title="Sistema de Filtros" icon={<Filter className="h-4 w-4" />}>
            <p>Cada modulo tiene una barra de filtros con diferentes opciones:</p>
            <ul className="space-y-1.5 list-disc list-inside mt-2">
              <li><strong>Filtro de Unidad:</strong> Selector amarillo que filtra registros por unidad productiva.</li>
              <li><strong>Filtro de Fecha:</strong> Selector rojo para definir rango de fechas (inicio y fin).</li>
              <li><strong>Busqueda:</strong> Campo de texto para buscar en descripcion.</li>
              <li><strong>Filtros de texto:</strong> Selectores para filtrar por actividad, proveedor, etc.</li>
              <li><strong>Filtros Si/No:</strong> Botones para filtrar campos booleanos (capital, utility, etc.).</li>
            </ul>
            <p className="mt-2 text-xs bg-muted p-2 rounded">
              <strong>Tip:</strong> Los filtros se acumulan. Use "Quitar filtros" para limpiar todos.
            </p>
          </ManualSection>

          <ManualSection title="Filtros de Celda (Doble-Click)" icon={<MousePointer2 className="h-4 w-4" />}>
            <p>Puede filtrar rapidamente haciendo <strong>doble-click</strong> en cualquier celda de la grilla:</p>
            <ul className="space-y-1.5 list-disc list-inside mt-2">
              <li>El valor de la celda se agrega como filtro.</li>
              <li>Los filtros son acumulativos (puede agregar varios).</li>
              <li>Aparece un boton <strong>"Celdas (N)"</strong> en la barra de filtros.</li>
              <li>Click en el boton para ver y eliminar los filtros activos.</li>
            </ul>
            <p className="mt-2 text-xs bg-muted p-2 rounded">
              <strong>Ejemplo:</strong> Doble-click en "CREDITO" en la columna operacion filtra solo esos registros.
            </p>
          </ManualSection>

          <ManualSection title="Edicion de Registros" icon={<Edit3 className="h-4 w-4" />}>
            <p>Hay varias formas de editar registros:</p>
            <ul className="space-y-1.5 list-disc list-inside mt-2">
              <li><strong>Edicion inline:</strong> Click en una celda para editarla directamente.</li>
              <li><strong>Boton Editar:</strong> Seleccione un registro y use el boton de edicion.</li>
              <li><strong>Boton Copiar:</strong> Crea un nuevo registro basado en el seleccionado.</li>
              <li><strong>Boton Eliminar:</strong> Elimina el registro seleccionado (requiere confirmacion).</li>
              <li><strong>Boton Agregar:</strong> Crea un nuevo registro vacio.</li>
            </ul>
            <p className="mt-2 text-xs bg-amber-500/20 p-2 rounded border border-amber-500/30">
              <strong>Importante:</strong> Para editar, debe seleccionar una unidad especifica (no "Todas").
            </p>
          </ManualSection>

          <ManualSection title="Importacion de Datos" icon={<Upload className="h-4 w-4" />}>
            <p>El sistema soporta importacion de archivos:</p>
            <ul className="space-y-1.5 list-disc list-inside mt-2">
              <li><strong>Estados de cuenta TXT:</strong> Archivos de texto con formato fijo.</li>
              <li><strong>Excel/HTML:</strong> Formatos de Provincial y Bancamiga.</li>
              <li><strong>Archivos DBF:</strong> Migracion desde sistemas anteriores.</li>
            </ul>
            <p className="mt-2">Para importar estados de cuenta bancarios:</p>
            <ol className="space-y-1 list-decimal list-inside mt-1">
              <li>Abra el modulo Bancos</li>
              <li>Seleccione el banco destino</li>
              <li>Use el boton de importar archivo</li>
              <li>Seleccione el archivo (TXT, XLS, HTML)</li>
              <li>El sistema detecta duplicados automaticamente</li>
            </ol>
          </ManualSection>

          <ManualSection title="Atajos y Funciones" icon={<Keyboard className="h-4 w-4" />}>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Doble-click en celda:</strong> Agregar filtro de celda.</li>
              <li><strong>Click en encabezado:</strong> Ordenar columna (click repetido invierte orden).</li>
              <li><strong>Arrastrar ventanas:</strong> Todas las ventanas son movibles y redimensionables.</li>
              <li><strong>Minimizar:</strong> Boton en cada ventana para minimizar.</li>
              <li><strong>Popout:</strong> Abrir modulo en ventana externa del navegador.</li>
              <li><strong>Tema oscuro/claro:</strong> Toggle en el menu principal.</li>
            </ul>
          </ManualSection>

          <div className="text-center pt-4 border-t text-xs text-muted-foreground">
            <p>Sistema desarrollado para gestion administrativa integral</p>
            <p className="mt-1">Version 2025</p>
          </div>
        </div>
      </ScrollArea>
    </MyWindow>
  );
}
