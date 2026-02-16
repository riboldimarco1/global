import { useState, useRef, useCallback } from "react";
import {
  Book, Building2, Landmark, Warehouse, Truck, CreditCard, Scissors,
  Wheat, Settings, ArrowLeftRight, Wifi, Filter, Edit3, Upload,
  Keyboard, Shield, BarChart3, MousePointer2, ChevronRight, Users, Mail
} from "lucide-react";
import MyWindow from "@/components/MyWindow";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV_SECTIONS = [
  { id: "inicio", label: "Inicio", icon: Book },
  { id: "administracion", label: "Administracion", icon: Building2, color: "text-red-800 dark:text-red-300" },
  { id: "agrodata", label: "Agrodata", icon: Wifi, color: "text-orange-800 dark:text-orange-300" },
  { id: "almacen", label: "Almacen", icon: Warehouse, color: "text-yellow-800 dark:text-yellow-200" },
  { id: "arrime", label: "Arrime", icon: Truck, color: "text-green-800 dark:text-green-300" },
  { id: "bancos", label: "Bancos", icon: Landmark, color: "text-teal-800 dark:text-teal-300" },
  { id: "cheques", label: "Cheques", icon: CreditCard, color: "text-cyan-800 dark:text-cyan-300" },
  { id: "cosecha", label: "Cosecha", icon: Wheat, color: "text-blue-800 dark:text-blue-300" },
  { id: "parametros", label: "Parametros", icon: Settings, color: "text-indigo-800 dark:text-indigo-300" },
  { id: "transferencias", label: "Transferencias", icon: ArrowLeftRight, color: "text-violet-800 dark:text-violet-300" },
  { id: "nomina-finca", label: "Nomina Semanal Finca", icon: Users, color: "text-purple-800 dark:text-purple-300" },
  { id: "pago-proveedores", label: "Pago Semanal Proveedores", icon: Scissors, color: "text-pink-800 dark:text-pink-300" },
  { id: "filtros", label: "Sistema de Filtros", icon: Filter },
  { id: "edicion", label: "Edicion de Registros", icon: Edit3 },
  { id: "importacion", label: "Importacion de Datos", icon: Upload },
  { id: "reportes", label: "Reportes PDF", icon: BarChart3 },
  { id: "permisos", label: "Permisos de Usuario", icon: Shield },
  { id: "enviar-correos", label: "Enviar Correos", icon: Mail, color: "text-rose-800 dark:text-rose-300" },
  { id: "atajos", label: "Atajos y Funciones", icon: Keyboard },
];

interface MyManualProps {
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function MyManual({ onClose, onFocus, zIndex = 200 }: MyManualProps) {
  const [activeSection, setActiveSection] = useState("inicio");
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`manual-section-${sectionId}`);
    if (el && contentRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <MyWindow
      id="manual-usuario"
      title="Manual de Usuario"
      icon={<Book className="h-4 w-4" />}
      initialPosition={{ x: 60, y: 30 }}
      initialSize={{ width: 900, height: 650 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1200, height: 900 }}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-blue-500/40"
      startMinimized={false}
      canMinimize={false}
      canClose={true}
      minimizedRight={true}
    >
      <div className="flex h-full" data-testid="container-manual">
        <div className="w-52 border-r flex-shrink-0 flex flex-col bg-muted/30">
          <div className="p-3 border-b">
            <h2 className="font-bold text-sm text-center">Contenido</h2>
          </div>
          <ScrollArea className="flex-1">
            <nav className="p-2 space-y-0.5">
              {NAV_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-primary/15 font-semibold"
                        : "hover-elevate"
                    }`}
                    data-testid={`nav-manual-${section.id}`}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${section.color || "text-muted-foreground"}`} />
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1" ref={contentRef}>
          <div className="p-6 space-y-8 max-w-[650px]">

            <section id="manual-section-inicio">
              <div className="text-center pb-6 border-b">
                <h1 className="text-xl font-bold">Sistema de Control Administrativo</h1>
                <p className="text-sm text-muted-foreground mt-2">Manual completo de usuario</p>
                <p className="text-xs text-muted-foreground mt-1">Version 2025</p>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  Este sistema permite gestionar de forma integral las actividades productivas y administrativas
                  de su organizacion. Cuenta con 9 modulos principales, cada uno especializado en un area de trabajo.
                </p>
                <p>
                  Todas las ventanas son <strong>flotantes y arrastrables</strong>. Puede abrir varios modulos
                  simultaneamente, minimizarlos, redimensionarlos y organizarlos segun su preferencia. Tambien puede
                  abrir cualquier modulo en una <strong>ventana externa</strong> del navegador.
                </p>
                <div className="bg-muted/50 rounded-md p-3 border">
                  <p className="font-semibold text-xs mb-2">Modulos disponibles:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {NAV_SECTIONS.filter(s => s.color).map(section => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="flex items-center gap-1.5 text-xs hover-elevate rounded px-1.5 py-1"
                          data-testid={`link-module-${section.id}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${section.color}`} />
                          <span className="underline">{section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-administracion">
              <SectionHeader title="Administracion" icon={<Building2 className="h-5 w-5" />} color="text-red-800 dark:text-red-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Modulo principal de gestion financiera. Registra todos los movimientos economicos
                  de la organizacion organizados por unidad productiva.
                </p>
                <SubSection title="Pestanas disponibles">
                  <ul className="space-y-1.5">
                    <li><strong className="text-red-800 dark:text-red-300">Facturas:</strong> Registro de gastos con proveedor, insumo, actividad, operacion, monto en bolivares y dolares. Incluye marcadores de capital y anticipo.</li>
                    <li><strong className="text-orange-800 dark:text-orange-300">Nomina:</strong> Pagos a personal con campos especificos para empleado, actividad y tipo de operacion.</li>
                    <li><strong className="text-yellow-800 dark:text-yellow-200">Ventas:</strong> Ingresos por ventas con cliente, producto, cantidad y montos.</li>
                    <li><strong className="text-green-800 dark:text-green-300">Cuentas por Cobrar:</strong> Seguimiento de deudas de clientes pendientes de cobro.</li>
                    <li><strong className="text-cyan-800 dark:text-cyan-300">Cuentas por Pagar:</strong> Control de obligaciones pendientes con proveedores.</li>
                    <li><strong className="text-blue-800 dark:text-blue-300">Prestamos:</strong> Registro de prestamos otorgados y recibidos con indicador de utilidad.</li>
                  </ul>
                </SubSection>
                <SubSection title="Filtros especiales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Filtro de <strong>unidad productiva</strong> (obligatorio para crear registros)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Filtro de <strong>rango de fechas</strong> (inicio y fin)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Busqueda por <strong>descripcion</strong></li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Filtros booleanos: capital, anticipo, utilidad</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Filtros de texto: proveedor, personal, actividad, operacion, cliente, producto</li>
                  </ul>
                </SubSection>
                <SubSection title="Relacion con Bancos">
                  <p>
                    Los registros de Administracion pueden vincularse con movimientos bancarios. Desde el modulo Bancos,
                    use el boton <strong>"Relacionar"</strong> para asociar un movimiento bancario con un registro administrativo.
                    Los registros relacionados muestran un indicador <strong>"Rel"</strong> en la grilla.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-agrodata">
              <SectionHeader title="Agrodata" icon={<Wifi className="h-5 w-5" />} color="text-orange-800 dark:text-orange-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Modulo de monitoreo de equipos de red y conectividad. Permite supervisar el estado
                  de dispositivos de red en tiempo real.
                </p>
                <SubSection title="Funcionalidades">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Monitoreo de estado de equipos (en linea / fuera de linea)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Configuracion de equipos en el tab <strong>"Equipos de Red"</strong> de Parametros</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Visualizacion del estado de conectividad en tiempo real</li>
                  </ul>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-almacen">
              <SectionHeader title="Almacen" icon={<Warehouse className="h-5 w-5" />} color="text-yellow-800 dark:text-yellow-200" />
              <div className="space-y-3 text-sm">
                <p>
                  Control de inventario de insumos y productos. Registra entradas y salidas de almacen
                  por unidad productiva.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha:</strong> Fecha del movimiento</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Insumo/Producto:</strong> Articulo que entra o sale</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Cantidad:</strong> Unidades del movimiento</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto:</strong> Valor en bolivares y dolares</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Proveedor:</strong> Origen del insumo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Categoria:</strong> Clasificacion del articulo</li>
                  </ul>
                </SubSection>
                <SubSection title="Filtros disponibles">
                  <p>Filtro de unidad, rango de fechas, busqueda por descripcion, y filtros de texto por insumo, proveedor y categoria.</p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-arrime">
              <SectionHeader title="Arrime" icon={<Truck className="h-5 w-5" />} color="text-green-800 dark:text-green-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Modulo de gestion de transporte de cana de azucar. Controla las operaciones de arrime
                  incluyendo rutas, fletes, choferes, proveedores y datos de calidad.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha y Ruta:</strong> Dia y ruta del viaje</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Placa y Chofer:</strong> Vehiculo y conductor asignado</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Proveedor:</strong> Proveedor de la cana</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Flete / Flete chofer:</strong> Tarifas de transporte</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Remesa y Ticket:</strong> Numeros de control</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Peso:</strong> Tonelaje transportado</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Grado, Brix, Pol, Torta:</strong> Datos de calidad de la cana</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Finca, Nucleo, Tablon:</strong> Origen de la cana</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Azucar:</strong> Produccion estimada de azucar</li>
                  </ul>
                </SubSection>
                <SubSection title="Marcadores booleanos">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Feriado (Fe):</strong> Indica si el dia es feriado (tarifa diferente)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Cancelado (Ca):</strong> Marca si el flete fue pagado</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Pago Chofer (Pa):</strong> Marca si se pago al chofer</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Utilidad (Uti):</strong> Marca de utilidad</li>
                  </ul>
                </SubSection>
                <SubSection title="Reportes PDF (13 tipos)">
                  <p>El modulo incluye un completo sistema de reportes en PDF:</p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Completo:</strong> Listado detallado de todos los registros</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Por Proveedor (ordenado/resumido):</strong> Agrupado y totalizado por proveedor</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Por Chofer (ordenado/resumido):</strong> Agrupado y totalizado por chofer</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Grado por Finca:</strong> Analisis de calidad por origen</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Placas por Nucleo:</strong> Vehiculos asignados por zona</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Estadisticas:</strong> Resumen estadistico general</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Toneladas por Nucleo:</strong> Produccion por zona</li>
                  </ul>
                </SubSection>
                <SubSection title="Carga masiva">
                  <p>
                    El boton <strong>"Cargar Arrime"</strong> permite importar datos masivos de arrime.
                    Requiere seleccionar un central previamente.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-bancos">
              <SectionHeader title="Bancos" icon={<Landmark className="h-5 w-5" />} color="text-teal-800 dark:text-teal-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Control completo de movimientos bancarios. Permite registrar debitos y creditos,
                  importar estados de cuenta de multiples bancos, y relacionar movimientos con registros
                  administrativos.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha:</strong> Fecha del movimiento</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descripcion:</strong> Detalle del movimiento</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Debito / Credito:</strong> Monto del movimiento</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Saldo:</strong> Balance calculado automaticamente</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Operacion:</strong> Tipo de transaccion</li>
                  </ul>
                </SubSection>
                <SubSection title="Importacion de estados de cuenta">
                  <p>El sistema soporta importacion automatica de estados de cuenta en multiples formatos:</p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Archivos TXT:</strong> Formato de texto con separacion fija</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Archivos Excel/HTML:</strong> Formatos de Provincial y Bancamiga</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />El sistema detecta <strong>duplicados automaticamente</strong></li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Los campos se <strong>transforman automaticamente</strong> al formato del sistema</li>
                  </ul>
                  <div className="bg-muted/50 rounded p-2 mt-2 border text-xs">
                    <strong>Pasos para importar:</strong> 1) Seleccione el banco destino en el filtro, 
                    2) Use el boton de importar, 3) Seleccione el archivo, 4) Revise los registros importados.
                  </div>
                </SubSection>
                <SubSection title="Relacionar con Administracion">
                  <p>
                    El boton <strong>"Relacionar"</strong> permite vincular un movimiento bancario con registros
                    del modulo Administracion. Esto facilita la conciliacion bancaria al conectar movimientos
                    de banco con sus correspondientes gastos o ingresos.
                  </p>
                </SubSection>
                <SubSection title="Saldo automatico">
                  <p>
                    El saldo se recalcula automaticamente al agregar, editar o eliminar registros.
                    Se ordena cronologicamente y aplica debitos y creditos de forma acumulativa.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-cheques">
              <SectionHeader title="Cheques" icon={<CreditCard className="h-5 w-5" />} color="text-cyan-800 dark:text-cyan-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Gestion de cheques emitidos y recibidos. Lleva el control de cheques pendientes,
                  cobrados y anulados.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha:</strong> Fecha de emision</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Numero:</strong> Numero del cheque</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Banco:</strong> Banco emisor</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Beneficiario:</strong> A quien se emite</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto:</strong> Valor del cheque</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descripcion:</strong> Concepto del pago</li>
                  </ul>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-cosecha">
              <SectionHeader title="Cosecha" icon={<Wheat className="h-5 w-5" />} color="text-blue-800 dark:text-blue-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Registro de operaciones de cosecha. Controla la produccion agricola por cultivo,
                  ciclo y destino, con seguimiento de cantidades y costos.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha:</strong> Fecha de la cosecha</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Cultivo:</strong> Tipo de cultivo cosechado</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Ciclo:</strong> Ciclo productivo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Destino:</strong> Lugar de entrega</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Cantidad:</strong> Volumen cosechado</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto:</strong> Valor de la cosecha</li>
                  </ul>
                </SubSection>
                <SubSection title="Filtros">
                  <p>Filtros por unidad, rango de fechas, cultivo, ciclo y destino.</p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-parametros">
              <SectionHeader title="Parametros" icon={<Settings className="h-5 w-5" />} color="text-indigo-800 dark:text-indigo-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Modulo de configuracion central del sistema. Aqui se definen todas las listas maestras
                  que alimentan los demas modulos. Cada pestana gestiona un tipo de dato diferente.
                </p>
                <SubSection title="Pestanas disponibles (26 tipos)">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-red-800 dark:text-red-300">Actividades:</strong> Tipos de actividad</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-orange-800 dark:text-orange-300">Bancos:</strong> Cuentas bancarias</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-yellow-800 dark:text-yellow-200">Cargas:</strong> Tipos de carga</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-green-800 dark:text-green-300">Categorias:</strong> Clasificaciones</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-teal-800 dark:text-teal-300">Central:</strong> Plantas centrales</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-cyan-800 dark:text-cyan-300">Choferes:</strong> Conductores</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-blue-800 dark:text-blue-300">Ciclos:</strong> Ciclos productivos</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-indigo-800 dark:text-indigo-300">Claves:</strong> Usuarios y permisos</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-violet-800 dark:text-violet-300">Clientes:</strong> Compradores</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-purple-800 dark:text-purple-300">Cultivos:</strong> Tipos de cultivo</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-pink-800 dark:text-pink-300">Destino:</strong> Destinos de entrega</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-rose-800 dark:text-rose-300">Dolar:</strong> Tasas de cambio</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-red-800 dark:text-red-300">Equipos de Red:</strong> Dispositivos</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-orange-800 dark:text-orange-300">Fincas:</strong> Fincas de origen</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-yellow-800 dark:text-yellow-200">Insumos:</strong> Materiales</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-green-800 dark:text-green-300">Operaciones:</strong> Formas de pago</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-teal-800 dark:text-teal-300">Origen:</strong> Procedencias</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-cyan-800 dark:text-cyan-300">Personal:</strong> Empleados</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-blue-800 dark:text-blue-300">Placas:</strong> Vehiculos</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-indigo-800 dark:text-indigo-300">Planes:</strong> Planes de servicio</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-violet-800 dark:text-violet-300">Productos:</strong> Articulos de venta</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-purple-800 dark:text-purple-300">Proveedores:</strong> Suplidores</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-pink-800 dark:text-pink-300">Suministros:</strong> Materiales</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-rose-800 dark:text-rose-300">Tablones:</strong> Parcelas</div>
                    <div><ChevronRight className="h-3 w-3 inline mr-1" /><strong className="text-red-800 dark:text-red-300">Unidad:</strong> Unidades productivas</div>
                  </div>
                </SubSection>
                <SubSection title="Campo Habilitado (H)">
                  <p>
                    Cada registro tiene un campo <strong>"H"</strong> (habilitado). Solo los registros habilitados
                    aparecen en los selectores y filtros de los demas modulos. Esto permite desactivar opciones
                    sin eliminarlas.
                  </p>
                </SubSection>
                <SubSection title="Campo Propietario">
                  <p>
                    El campo <strong>"Propietario"</strong> permite asociar registros con un propietario especifico.
                    Use el filtro de propietario (icono violeta en la barra del titulo) para ver solo los registros
                    del propietario seleccionado.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-transferencias">
              <SectionHeader title="Transferencias" icon={<ArrowLeftRight className="h-5 w-5" />} color="text-violet-800 dark:text-violet-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Registro de transferencias monetarias entre cuentas bancarias y entre unidades productivas.
                </p>
                <SubSection title="Campos principales">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha:</strong> Fecha de la transferencia</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Origen / Destino:</strong> Cuentas involucradas</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto:</strong> Cantidad transferida</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descripcion:</strong> Concepto de la transferencia</li>
                  </ul>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-nomina-finca">
              <SectionHeader title="Nomina Semanal Finca" icon={<Users className="h-5 w-5" />} color="text-purple-800 dark:text-purple-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Herramienta para calcular y gestionar la nomina semanal del personal de finca.
                  Permite registrar asistencia, horas extras, premios, prestamos y descuentos,
                  con calculo automatico de totales y envio directo a transferencias.
                </p>

                <SubSection title="1. Carga inicial de datos">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Al abrir la nomina, se carga automaticamente el personal filtrado por la <strong>unidad seleccionada</strong>.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Para cada persona se obtiene su <strong>cargo</strong> desde la tabla de personal en parametros.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />El <strong>sueldo por dia</strong> se calcula buscando el cargo en la tabla "cargos finca" de parametros.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Se consulta automaticamente la <strong>deuda</strong> de cada trabajador desde administracion.</li>
                  </ul>
                </SubSection>

                <SubSection title="2. Semana de referencia">
                  <p>
                    La nomina siempre corresponde a la <strong>semana anterior</strong> (lunes a domingo).
                    Las fechas de cada dia se muestran en los encabezados de las columnas.
                  </p>
                </SubSection>

                <SubSection title="3. Llenado de la nomina">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Asistencia (lun-vie):</strong> Marcar el checkbox de cada dia que el trabajador asistio.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Horas extra (lun-dom):</strong> Ingresar la cantidad de horas extras de cada dia.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Premio:</strong> Monto adicional que se suma al salario base para generar el total salario.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Prestamo:</strong> Monto que se suma al total neto (adelanto al trabajador).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descuento:</strong> Monto que se resta del total neto.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descripcion:</strong> Texto libre para observaciones.</li>
                  </ul>
                </SubSection>

                <SubSection title="4. Calculos automaticos">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Total salario</strong> = (sueldo/dia x dias asistidos) + premio</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Horas extra</strong> = horas x (sueldo/dia / 8) x multiplicador</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Total neto</strong> = total salario + horas extra + prestamo - descuento</li>
                  </ul>
                </SubSection>

                <SubSection title="5. Acciones disponibles">
                  <ul className="space-y-2">
                    <li>
                      <strong>Nueva nomina:</strong> Limpia todos los valores (asistencia, horas, prestamos, etc.)
                      manteniendo los nombres, cargos y sueldos. Recarga las deudas actualizadas.
                    </li>
                    <li>
                      <strong>Imprimir nomina:</strong> Genera un PDF en formato horizontal con todos los datos
                      de la nomina, incluyendo totales generales al final.
                    </li>
                    <li>
                      <strong>Enviar a transferencias:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Consulta la tasa del dolar vigente desde parametros.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Convierte los montos de dolares a bolivares usando esa tasa.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Obtiene el siguiente numero de comprobante disponible.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Busca la cedula y cuenta bancaria de cada trabajador.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Crea registros en transferencias (tipo "nomina") con: fecha, comprobante, personal, cedula, cuenta, monto en Bs, prestamo en Bs, descuento en Bs, total neto en Bs, descripcion y unidad.</li>
                      </ul>
                    </li>
                  </ul>
                </SubSection>

                <SubSection title="6. Flujo completo tipico">
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Seleccionar la unidad (finca).</li>
                    <li>Marcar asistencia de cada trabajador dia por dia.</li>
                    <li>Agregar horas extras si corresponde.</li>
                    <li>Agregar premios, prestamos o descuentos si aplica.</li>
                    <li>Verificar los totales calculados.</li>
                    <li>Imprimir la nomina para archivo.</li>
                    <li>Enviar a transferencias para procesar el pago.</li>
                  </ol>
                </SubSection>

                <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30 text-xs">
                  <strong>Tip:</strong> Al enviar a transferencias, los montos se convierten automaticamente
                  a bolivares usando la tasa del dolar mas reciente registrada en parametros.
                </div>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-pago-proveedores">
              <SectionHeader title="Pago Semanal Proveedores" icon={<Scissors className="h-5 w-5" />} color="text-pink-800 dark:text-pink-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Herramienta para gestionar los pagos semanales a proveedores. Permite revisar las cuentas
                  por pagar pendientes, ingresar abonos con conversion automatica de dolares a bolivares,
                  y enviar los pagos a transferencias.
                </p>

                <SubSection title="1. Carga inicial de datos">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Al abrir, se cargan automaticamente las <strong>cuentas por pagar pendientes</strong> (no canceladas) filtradas por la unidad seleccionada.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Para cada cuenta se busca la <strong>cedula/RIF</strong> y <strong>numero de cuenta</strong> del proveedor desde la tabla de proveedores en parametros.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Se consulta la <strong>tasa del dolar</strong> mas reciente registrada en parametros para la conversion automatica.</li>
                  </ul>
                </SubSection>

                <SubSection title="2. Columnas de la grilla">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Nombre:</strong> Nombre del proveedor.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Cedula / RIF:</strong> Documento del proveedor (obtenido de parametros).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Nro cuenta:</strong> Cuenta bancaria del proveedor.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Descripcion:</strong> Concepto de la cuenta por pagar.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Fecha factura:</strong> Fecha de la factura original.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Nro factura:</strong> Numero de la factura.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto $:</strong> Deuda pendiente en dolares.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Monto Bs:</strong> Monto original en bolivares.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Abono $:</strong> Campo editable donde se ingresa el monto a pagar en dolares.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Abono Bs:</strong> Se calcula automaticamente (abono $ x tasa del dolar).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Deuda $:</strong> Se calcula automaticamente (monto $ - abono $).</li>
                  </ul>
                </SubSection>

                <SubSection title="3. Ingreso de abonos">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Solo se edita la columna <strong>abono $</strong> (dolares).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />El <strong>abono Bs</strong> se calcula automaticamente usando la tasa del dolar vigente.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />La <strong>deuda $</strong> se recalcula automaticamente al ingresar el abono.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Se puede abonar <strong>parcialmente</strong> (menos que el monto) o <strong>totalmente</strong> (igual al monto).</li>
                  </ul>
                </SubSection>

                <SubSection title="4. Acciones disponibles">
                  <ul className="space-y-2">
                    <li>
                      <strong>Nuevos pagos:</strong> Recarga las cuentas por pagar pendientes desde la base de datos,
                      limpiando los abonos ingresados.
                    </li>
                    <li>
                      <strong>Imprimir pago:</strong> Genera un PDF en formato horizontal con todos los proveedores,
                      montos, abonos y totales generales.
                    </li>
                    <li>
                      <strong>Enviar a transferencias</strong> (desde Pago Semanal Proveedores):
                      <ul className="ml-4 mt-1 space-y-1">
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Toma solo las filas con abono mayor a cero.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Crea registros en transferencias (tipo "proveedores") con: proveedor, cedula, cuenta, descripcion, monto en Bs, monto en dolares, deuda restante, unidad y numero de factura.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Procesa el pago en administracion: actualiza el restacancelar de cada cuenta por pagar.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Si el restacancelar llega a cero, la factura se marca como <strong>cancelada</strong>.</li>
                        <li><ChevronRight className="h-3 w-3 inline mr-1" />Si queda saldo pendiente, la factura queda con <strong>pago parcial</strong>.</li>
                      </ul>
                    </li>
                  </ul>
                </SubSection>

                <SubSection title="5. Flujo completo tipico">
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Seleccionar la unidad.</li>
                    <li>Revisar las cuentas por pagar pendientes que aparecen.</li>
                    <li>Ingresar el abono en dolares para cada proveedor que se va a pagar.</li>
                    <li>Verificar los montos convertidos a bolivares y la deuda restante.</li>
                    <li>Imprimir el reporte de pagos para archivo.</li>
                    <li><strong>Enviar a transferencias</strong> (desde Pago Semanal Proveedores) — registra los pagos y actualiza las cuentas por pagar.</li>
                    <li><strong>Enviar a bancos</strong> (desde el modulo Transferencias) — crea los registros bancarios a partir de las transferencias.</li>
                    <li><strong>Enviar a facturas</strong> (desde el modulo Administracion, tab cuentas por pagar) — toma las cuentas canceladas, crea el registro de factura, vincula los registros de bancos a la nueva factura y elimina las cuentas por pagar canceladas.</li>
                  </ol>
                </SubSection>

                <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30 text-xs">
                  <strong>Tip:</strong> Los montos se convierten automaticamente a bolivares usando la tasa del dolar
                  mas reciente de parametros. Asegurese de que la tasa este actualizada antes de enviar los pagos.
                </div>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-filtros">
              <SectionHeader title="Sistema de Filtros" icon={<Filter className="h-5 w-5" />} color="text-emerald-800 dark:text-emerald-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Cada modulo cuenta con una barra de filtros en la parte superior que permite
                  refinar los datos mostrados. Los filtros se <strong>acumulan</strong> y se pueden
                  combinar libremente.
                </p>
                <SubSection title="Tipos de filtro">
                  <ul className="space-y-2">
                    <li>
                      <strong>Filtro de Unidad (verde):</strong> Selector que filtra registros por unidad
                      productiva. Es necesario seleccionar una unidad especifica para poder crear nuevos registros.
                    </li>
                    <li>
                      <strong>Filtro de Fecha (rojo):</strong> Define un rango de fechas con campos de inicio y fin.
                      Solo muestra registros dentro del rango seleccionado. Las fechas usan formato dd/mm/aa.
                    </li>
                    <li>
                      <strong>Busqueda por Descripcion:</strong> Campo de texto libre que filtra registros
                      cuya descripcion contenga el texto buscado.
                    </li>
                    <li>
                      <strong>Filtros de Texto:</strong> Selectores desplegables que filtran por campos especificos
                      como proveedor, actividad, personal, operacion, etc. Las opciones provienen del modulo Parametros.
                    </li>
                    <li>
                      <strong>Filtros Si/No:</strong> Botones de tres estados (Todos/Si/No) para campos booleanos
                      como capital, anticipo, utilidad, cancelado, etc.
                    </li>
                  </ul>
                </SubSection>
                <SubSection title="Filtros de Celda (doble-click)">
                  <p>
                    Puede filtrar rapidamente haciendo <strong>doble-click</strong> en cualquier celda de la grilla.
                    El valor de esa celda se agrega como filtro activo. Los filtros de celda son acumulativos:
                    puede agregar varios simultaneamente.
                  </p>
                  <p className="mt-1">
                    Cuando hay filtros de celda activos, aparece un boton <strong>"Celdas (N)"</strong> en la barra
                    de filtros. Haga click en el para ver y eliminar los filtros activos individualmente.
                  </p>
                </SubSection>
                <SubSection title="Persistencia de filtros">
                  <p>
                    Los filtros de unidad y banco se guardan automaticamente y se restauran al reabrir
                    la ventana del modulo, incluso despues de cerrar y volver a abrir el navegador.
                  </p>
                </SubSection>
                <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30 text-xs">
                  <strong>Tip:</strong> Use el boton "Quitar filtros" para limpiar todos los filtros activos de una vez.
                </div>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-edicion">
              <SectionHeader title="Edicion de Registros" icon={<Edit3 className="h-5 w-5" />} color="text-amber-800 dark:text-amber-300" />
              <div className="space-y-3 text-sm">
                <SubSection title="Formas de editar">
                  <ul className="space-y-2">
                    <li>
                      <strong>Edicion inline:</strong> Haga click directamente en una celda de la grilla para editarla.
                      El cambio se guarda automaticamente al presionar Enter o al hacer click fuera de la celda.
                    </li>
                    <li>
                      <strong>Agregar registro:</strong> Use el boton verde "Agregar" para crear un nuevo registro vacio.
                      La fecha y unidad se auto-completan con los valores actuales.
                    </li>
                    <li>
                      <strong>Copiar registro:</strong> Seleccione un registro y use el boton "Copiar" para crear una
                      copia. Util para registros similares con pequenas diferencias.
                    </li>
                    <li>
                      <strong>Eliminar registro:</strong> Seleccione un registro y use el boton "Eliminar". Requiere
                      confirmacion antes de proceder.
                    </li>
                  </ul>
                </SubSection>
                <SubSection title="Reglas importantes">
                  <ul className="space-y-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Debe seleccionar una <strong>unidad especifica</strong> (no "Todas") para crear registros</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Las fechas se ingresan en formato <strong>dd/mm/aa</strong> con separadores automaticos</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Los campos de seleccion (proveedor, actividad, etc.) ofrecen opciones del modulo Parametros</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Los campos numericos aceptan decimales con punto o coma</li>
                  </ul>
                </SubSection>
                <SubSection title="Ordenar columnas">
                  <p>
                    Haga click en el encabezado de cualquier columna para ordenar por ese campo.
                    Un segundo click invierte el orden (ascendente/descendente).
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-importacion">
              <SectionHeader title="Importacion de Datos" icon={<Upload className="h-5 w-5" />} color="text-sky-800 dark:text-sky-300" />
              <div className="space-y-3 text-sm">
                <SubSection title="Estados de cuenta bancarios">
                  <p>El sistema puede importar estados de cuenta de bancos en multiples formatos:</p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>TXT:</strong> Archivos de texto con formato fijo (Banesco, Venezuela, etc.)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Excel/HTML:</strong> Formatos de Provincial y Bancamiga</li>
                  </ul>
                  <div className="bg-muted/50 rounded p-2 mt-2 border text-xs space-y-1">
                    <p><strong>Proceso de importacion:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Abra el modulo <strong>Bancos</strong></li>
                      <li>Seleccione el banco destino en el filtro</li>
                      <li>Presione el boton de importar (icono de archivo)</li>
                      <li>Seleccione el archivo desde su computadora</li>
                      <li>El sistema procesa el archivo y detecta duplicados</li>
                      <li>Los registros nuevos se agregan automaticamente</li>
                    </ol>
                  </div>
                </SubSection>
                <SubSection title="Transformacion automatica">
                  <p>
                    Al importar, el sistema transforma automaticamente los campos del archivo al formato
                    interno: fechas se convierten a dd/mm/aa, montos se normalizan, y las descripciones
                    se limpian de caracteres especiales.
                  </p>
                </SubSection>
                <SubSection title="Deteccion de duplicados">
                  <p>
                    El sistema compara cada registro importado con los existentes para evitar duplicados.
                    Si un registro ya existe (misma fecha, descripcion y monto), se omite automaticamente.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-reportes">
              <SectionHeader title="Reportes PDF" icon={<BarChart3 className="h-5 w-5" />} color="text-purple-800 dark:text-purple-300" />
              <div className="space-y-3 text-sm">
                <p>
                  Varios modulos incluyen generacion de reportes en formato PDF que se descargan directamente
                  al dispositivo.
                </p>
                <SubSection title="Reportes de Arrime">
                  <p>El modulo Arrime ofrece 13 tipos de reportes PDF especializados que cubren diferentes perspectivas de analisis:</p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Listados completos y ordenados</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Resumenes por proveedor y por chofer</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Analisis de grado por finca</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Placas por nucleo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Estadisticas generales</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Toneladas por nucleo</li>
                  </ul>
                </SubSection>
                <SubSection title="Exportar a Excel">
                  <p>
                    Todos los modulos permiten exportar los datos visibles a formato Excel mediante
                    el boton de exportar (icono verde en la barra de titulo). Los datos exportados
                    respetan los filtros aplicados.
                  </p>
                </SubSection>
                <SubSection title="Como generar reportes">
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>Aplique los filtros deseados (unidad, fechas, etc.)</li>
                    <li>Presione el boton <strong>"Reportes"</strong></li>
                    <li>Seleccione el tipo de reporte deseado</li>
                    <li>El PDF se genera y descarga automaticamente</li>
                  </ol>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-permisos">
              <SectionHeader title="Permisos de Usuario" icon={<Shield className="h-5 w-5" />} color="text-rose-800 dark:text-rose-300" />
              <div className="space-y-3 text-sm">
                <p>
                  El sistema incluye un control de permisos que restringe el acceso de cada usuario
                  a modulos, bancos, pestanas de parametros y unidades productivas especificas.
                </p>
                <SubSection title="Configuracion de permisos">
                  <p>
                    Los permisos se configuran en el tab <strong>"Claves"</strong> del modulo Parametros (solo accesible
                    para el usuario administrador). Cada usuario tiene 4 categorias de permisos:
                  </p>
                  <ul className="space-y-2 mt-2">
                    <li>
                      <strong>Bancos:</strong> Define cuales cuentas bancarias puede ver el usuario.
                      Si no se selecciona ninguna, el usuario ve todas.
                    </li>
                    <li>
                      <strong>Tabs Parametros:</strong> Define cuales pestanas del modulo Parametros
                      puede acceder. Si no se selecciona ninguna, tiene acceso a todas.
                    </li>
                    <li>
                      <strong>Menu Principal:</strong> Define cuales modulos aparecen en el menu
                      del usuario. Si no se selecciona ninguno, ve todos los modulos.
                    </li>
                    <li>
                      <strong>Unidades:</strong> Define cuales unidades productivas puede ver el usuario
                      en el filtro de unidad. Si no se selecciona ninguna, ve todas las unidades.
                    </li>
                  </ul>
                </SubSection>
                <SubSection title="Regla de permisos vacios">
                  <p>
                    <strong>Importante:</strong> Si una categoria de permisos esta vacia (ningun item seleccionado),
                    el usuario tiene acceso completo a esa categoria. Los permisos solo restringen cuando se
                    seleccionan items especificos.
                  </p>
                </SubSection>
                <SubSection title="Herramientas y Debug">
                  <p>
                    El menu de <strong>Herramientas</strong> y la ventana de <strong>Debug</strong> solo
                    estan disponibles para el usuario administrador.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-atajos">
              <SectionHeader title="Atajos y Funciones" icon={<Keyboard className="h-5 w-5" />} color="text-slate-800 dark:text-slate-300" />
              <div className="space-y-3 text-sm">
                <SubSection title="Interaccion con la grilla">
                  <ul className="space-y-1.5">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Click en celda:</strong> Selecciona el registro y permite edicion inline</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Doble-click en celda:</strong> Agrega filtro de celda por ese valor</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Click en encabezado:</strong> Ordena por esa columna (click repetido invierte)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Enter:</strong> Confirma edicion de celda</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Escape:</strong> Cancela edicion de celda</li>
                  </ul>
                </SubSection>
                <SubSection title="Ventanas">
                  <ul className="space-y-1.5">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Arrastrar barra de titulo:</strong> Mueve la ventana</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Arrastrar bordes:</strong> Redimensiona la ventana</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Boton Minimizar (amarillo):</strong> Minimiza la ventana a la barra inferior</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Boton Cerrar (rojo):</strong> Cierra la ventana del modulo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Boton Popout (morado):</strong> Abre el modulo en una ventana externa</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Boton Refrescar (azul):</strong> Recarga los datos del modulo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Boton Home (teal):</strong> Vuelve al menu principal</li>
                  </ul>
                </SubSection>
                <SubSection title="Apariencia">
                  <ul className="space-y-1.5">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Tema oscuro/claro:</strong> Toggle en la barra del titulo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Color de fondo:</strong> Selector de color en la barra del titulo</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Tamano de fuente (T-/T+):</strong> Ajusta el tamano del texto</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Estilo Alegre/Minimizado:</strong> Alterna entre diseno 3D y plano</li>
                  </ul>
                </SubSection>
                <SubSection title="Tutoriales">
                  <p>
                    Cada modulo tiene un boton de <strong>tutorial</strong> (icono de graduacion) en la barra de titulo.
                    Al activarlo, aparecen instrucciones paso a paso sobre como usar ese modulo especifico.
                  </p>
                </SubSection>
              </div>
            </section>

            <SectionDivider />

            <section id="manual-section-enviar-correos">
              <SectionHeader title="Enviar Correos" icon={<Mail className="h-5 w-5" />} color="text-rose-800 dark:text-rose-300" />
              <div className="space-y-3 text-sm">
                <p>
                  El sistema permite enviar comprobantes de pago por correo electronico a los proveedores
                  directamente desde el modulo de <strong>Transferencias</strong>. Los correos se envian
                  a traves de una cuenta de Gmail configurada en Parametros.
                </p>

                <SubSection title="1. Configuracion de Gmail en Parametros">
                  <p>
                    Antes de poder enviar correos, debe configurar las credenciales de Gmail en el modulo
                    <strong> Parametros</strong>, pestana <strong>"Constantes"</strong>:
                  </p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>gmail empresa:</strong> La direccion de correo de Gmail desde donde se enviaran los comprobantes (ejemplo: miempresa@gmail.com).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>gmail clave:</strong> La clave de aplicacion de Gmail (NO es la clave normal de Gmail).</li>
                  </ul>
                  <div className="bg-amber-500/10 rounded p-2 mt-2 border border-amber-500/30 text-xs space-y-1">
                    <p><strong>Importante:</strong> La clave debe ser una <strong>clave de aplicacion</strong> generada desde la cuenta de Google:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Ir a la cuenta de Google (myaccount.google.com)</li>
                      <li>Ir a <strong>Seguridad</strong></li>
                      <li>Activar la <strong>verificacion en dos pasos</strong> (si no esta activa)</li>
                      <li>Buscar <strong>"Contrasenas de aplicaciones"</strong></li>
                      <li>Crear una nueva clave de aplicacion para "Correo"</li>
                      <li>Copiar la clave generada (16 caracteres) y pegarla en <strong>gmail clave</strong></li>
                    </ol>
                    <p className="mt-1">La clave se muestra enmascarada (con puntos) en la grilla por seguridad.</p>
                  </div>
                </SubSection>

                <SubSection title="2. Configuracion de correos de proveedores">
                  <p>
                    Para que el sistema sepa a que correo enviar el comprobante de cada proveedor, configure el
                    correo en el modulo <strong>Parametros</strong>, pestana <strong>"Proveedores"</strong>:
                  </p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Cada proveedor tiene un campo <strong>"email"</strong> donde se coloca su correo electronico.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Si el registro de transferencia tiene un correo en su campo <strong>"email"</strong>, se usa ese correo directamente.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Si el campo email de la transferencia esta vacio, el sistema busca automaticamente el correo del proveedor en <strong>Parametros</strong> usando el nombre del proveedor.</li>
                  </ul>
                </SubSection>

                <SubSection title="3. Envio de comprobantes desde Transferencias">
                  <p>
                    En el modulo <strong>Transferencias</strong>, pestana <strong>"Pago Proveedores"</strong>:
                  </p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Use el boton <strong>"Enviar correos"</strong> para enviar comprobantes a los proveedores.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Solo se envian correos de las transferencias que <strong>no han sido enviadas</strong>.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Al finalizar, se muestra un resumen con la cantidad de correos enviados, errores (si hubo), y proveedores sin correo configurado.</li>
                  </ul>
                </SubSection>

                <SubSection title="4. Contenido del comprobante">
                  <p>Cada correo de comprobante incluye:</p>
                  <ul className="space-y-1 mt-1">
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Tipo de pago:</strong> Indica si es pago total o pago parcial.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Datos del proveedor:</strong> Nombre, cedula/RIF, numero de factura, fecha de factura, unidad y fecha de pago.</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Datos bancarios:</strong> Banco, numero de cuenta, comprobante y descripcion (solo se muestran los campos que tengan valor).</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" /><strong>Montos:</strong> Monto de la factura en dolares, abono en dolares, abono en bolivares, tasa del dolar utilizada, y deuda pendiente (si es pago parcial).</li>
                  </ul>
                </SubSection>

                <SubSection title="5. Flujo completo para enviar correos">
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Configurar <strong>gmail empresa</strong> y <strong>gmail clave</strong> en Parametros (Constantes).</li>
                    <li>Configurar el correo electronico de cada proveedor en Parametros (Proveedores).</li>
                    <li>Realizar los pagos a proveedores desde <strong>Pago Semanal Proveedores</strong> y enviar a transferencias.</li>
                    <li>Ir a <strong>Transferencias</strong>, pestana <strong>"Pago Proveedores"</strong>.</li>
                    <li>Presionar el boton <strong>"Enviar correos"</strong>.</li>
                    <li>Revisar el resumen de envio.</li>
                  </ol>
                </SubSection>

                <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30 text-xs">
                  <strong>Tip:</strong> Si un proveedor no tiene correo configurado, el sistema lo reporta al final
                  del envio para que pueda agregarlo en Parametros y reenviar.
                </div>
              </div>
            </section>

            <SectionDivider />

            <div className="text-center pt-6 pb-4 border-t text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Sistema de Control Administrativo</p>
              <p>Desarrollado para gestion administrativa integral</p>
              <p>Version 2025</p>
            </div>

          </div>
        </ScrollArea>
      </div>
    </MyWindow>
  );
}

function SectionHeader({ title, icon, color = "text-primary" }: { title: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b" data-testid={`text-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className={color}>{icon}</span>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <div className="text-muted-foreground pl-1">{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-t border-border/50" />;
}
