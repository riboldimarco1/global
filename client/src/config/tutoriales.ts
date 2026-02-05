export interface TutorialStep {
  title: string;
  description: string;
}

export interface ModuleTutorial {
  moduleId: string;
  moduleName: string;
  steps: TutorialStep[];
}

export const tutoriales: Record<string, ModuleTutorial> = {
  parametros: {
    moduleId: "parametros",
    moduleName: "Parámetros",
    steps: [
      {
        title: "Configuración del Sistema",
        description: "Este módulo permite configurar los valores base del sistema como unidades, categorías, proveedores, clientes y otros parámetros que se usan en los demás módulos."
      },
      {
        title: "Pestañas de Configuración",
        description: "Cada pestaña agrupa un tipo de parámetro diferente. Seleccione la pestaña correspondiente para ver y editar los valores disponibles."
      },
      {
        title: "Crear Nuevo Registro",
        description: "Use el botón 'Nuevo' para agregar un nuevo parámetro. Complete los campos requeridos y guarde los cambios."
      },
      {
        title: "Editar y Eliminar",
        description: "Haga doble clic en cualquier celda para editarla directamente. Use el botón de eliminar (rojo) para borrar un registro."
      }
    ]
  },
  administracion: {
    moduleId: "administracion",
    moduleName: "Administración",
    steps: [
      {
        title: "Gestión de Operaciones",
        description: "Este módulo registra todas las operaciones administrativas de la empresa, incluyendo ingresos, egresos y movimientos financieros."
      },
      {
        title: "Filtros por Unidad",
        description: "Use el filtro de unidad para ver solo las operaciones de una unidad específica. El filtro se mantiene al cerrar y reabrir la ventana."
      },
      {
        title: "Pestañas por Tipo",
        description: "Las pestañas organizan las operaciones por tipo (gastos, ingresos, etc.). Cada pestaña muestra solo los registros correspondientes."
      },
      {
        title: "Crear Registro",
        description: "Use el botón 'Nuevo' para crear una operación. La fecha y unidad se completan automáticamente según el filtro activo."
      },
      {
        title: "Exportar a Excel",
        description: "Use el botón de Excel para exportar los datos visibles a un archivo descargable."
      }
    ]
  },
  bancos: {
    moduleId: "bancos",
    moduleName: "Bancos",
    steps: [
      {
        title: "Movimientos Bancarios",
        description: "Este módulo gestiona todos los movimientos de las cuentas bancarias, incluyendo depósitos, retiros y transferencias."
      },
      {
        title: "Filtro por Banco",
        description: "Seleccione un banco del filtro para ver solo los movimientos de esa cuenta. El saldo se calcula automáticamente."
      },
      {
        title: "Importar Estados de Cuenta",
        description: "Use el botón 'Importar' para cargar estados de cuenta desde archivos TXT o Excel. El sistema transforma automáticamente los campos."
      },
      {
        title: "Relacionar con Administración",
        description: "El botón 'Relacionar' permite vincular un movimiento bancario con un registro de administración para mantener la trazabilidad."
      },
      {
        title: "Saldo Automático",
        description: "El saldo se recalcula automáticamente con cada operación. Los depósitos suman y los retiros restan del saldo anterior."
      }
    ]
  },
  cheques: {
    moduleId: "cheques",
    moduleName: "Cheques",
    steps: [
      {
        title: "Control de Cheques",
        description: "Este módulo lleva el registro de todos los cheques emitidos y recibidos, con seguimiento de su estado."
      },
      {
        title: "Estados de Cheque",
        description: "Cada cheque puede estar pendiente, cobrado, depositado o anulado. Use las pestañas para filtrar por estado."
      },
      {
        title: "Datos del Cheque",
        description: "Registre el número de cheque, banco, monto, beneficiario y fecha de emisión/vencimiento."
      },
      {
        title: "Seguimiento",
        description: "Actualice el estado del cheque cuando sea cobrado o depositado para mantener el control actualizado."
      }
    ]
  },
  cosecha: {
    moduleId: "cosecha",
    moduleName: "Cosecha",
    steps: [
      {
        title: "Registro de Cosecha",
        description: "Este módulo registra la producción agrícola, incluyendo cantidades cosechadas, fechas y destinos."
      },
      {
        title: "Filtros de Búsqueda",
        description: "Use los filtros por unidad, cultivo y fechas para encontrar registros específicos de cosecha."
      },
      {
        title: "Datos de Producción",
        description: "Registre la cantidad cosechada, el cultivo, la unidad productiva y el destino de la producción."
      },
      {
        title: "Reportes",
        description: "Exporte los datos a Excel para generar reportes de producción por período o por cultivo."
      }
    ]
  },
  almacen: {
    moduleId: "almacen",
    moduleName: "Almacén",
    steps: [
      {
        title: "Inventario de Insumos",
        description: "Este módulo controla el inventario de insumos y materiales, registrando entradas y salidas."
      },
      {
        title: "Movimientos de Inventario",
        description: "Cada registro indica si es entrada o salida de inventario, con cantidad, producto y ubicación."
      },
      {
        title: "Filtros por Unidad",
        description: "Filtre por unidad para ver solo los movimientos del almacén de esa ubicación."
      },
      {
        title: "Control de Stock",
        description: "El sistema permite llevar el control de existencias por producto y ubicación."
      }
    ]
  },
  arrime: {
    moduleId: "arrime",
    moduleName: "Arrime",
    steps: [
      {
        title: "Transporte de Producción",
        description: "Este módulo registra el transporte de la producción desde las fincas hasta los destinos finales."
      },
      {
        title: "Datos del Viaje",
        description: "Registre la finca de origen, el destino, la cantidad transportada y el chofer responsable."
      },
      {
        title: "Filtros",
        description: "Use los filtros por finca, destino o chofer para encontrar viajes específicos."
      },
      {
        title: "Reportes de Transporte",
        description: "Exporte los datos para generar reportes de volúmenes transportados y costos de flete."
      }
    ]
  },
  transferencias: {
    moduleId: "transferencias",
    moduleName: "Transferencias",
    steps: [
      {
        title: "Gestión de Transferencias",
        description: "Este módulo facilita la creación y envío de transferencias bancarias, generando registros automáticos."
      },
      {
        title: "Crear Transferencia",
        description: "Ingrese los datos de la transferencia: beneficiario, monto, banco destino y concepto."
      },
      {
        title: "Enviar Transferencias",
        description: "El botón 'Enviar' procesa las transferencias seleccionadas y crea los registros correspondientes en Bancos y Administración."
      },
      {
        title: "Repartir Montos",
        description: "Use 'Repartir' para distribuir un monto total entre varios beneficiarios de forma proporcional."
      },
      {
        title: "Generar Recibos",
        description: "El botón 'Recibos' genera documentos PDF de las transferencias para respaldo y envío."
      }
    ]
  },
  agrodata: {
    moduleId: "agrodata",
    moduleName: "Agrodata",
    steps: [
      {
        title: "Datos Agrícolas",
        description: "Este módulo centraliza información agrícola para análisis y consulta, con datos de producción y operaciones."
      },
      {
        title: "Consulta de Datos",
        description: "Navegue por las pestañas para acceder a diferentes tipos de información agrícola."
      },
      {
        title: "Filtros y Búsqueda",
        description: "Use los filtros disponibles para encontrar información específica por período, cultivo o unidad."
      },
      {
        title: "Exportación",
        description: "Exporte los datos a Excel para análisis externo o generación de reportes personalizados."
      }
    ]
  },
  debug: {
    moduleId: "debug",
    moduleName: "MyDebug",
    steps: [
      {
        title: "Depuración del Sistema",
        description: "Esta ventana muestra información técnica para diagnóstico y resolución de problemas."
      },
      {
        title: "Llamadas API",
        description: "Lista todas las llamadas al servidor con su método, ruta, código de estado y tiempo de respuesta."
      },
      {
        title: "Errores",
        description: "Muestra los errores de consola y llamadas fallidas para facilitar la identificación de problemas."
      },
      {
        title: "Limpiar Registros",
        description: "Use los botones para limpiar la lista de llamadas o errores independientemente."
      }
    ]
  }
};

export function getTutorial(moduleId: string): ModuleTutorial | undefined {
  return tutoriales[moduleId];
}
