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
        description: "Este módulo permite configurar todos los valores base del sistema. Aquí se definen unidades productivas, categorías, proveedores, clientes, personal, actividades y otros parámetros que se utilizan en los demás módulos del sistema."
      },
      {
        title: "Pestañas de Configuración",
        description: "El módulo está organizado en pestañas de colores. Cada color identifica un tipo de parámetro diferente: Actividades (púrpura), Almacén (violeta), Bancos (verde), Categorías (cyan), Choferes (teal), Clientes (azul), Cultivos (verde), entre otros. Haga clic en cualquier pestaña para ver sus registros."
      },
      {
        title: "Crear Nuevo Registro",
        description: "Para crear un nuevo parámetro: 1) Seleccione la pestaña correspondiente. 2) Use el botón verde 'Agregar' (símbolo +) en la barra de herramientas. 3) Complete los campos del formulario. 4) Haga clic en 'Guardar' para confirmar. El campo 'Propietario' se completa automáticamente con su usuario y fecha."
      },
      {
        title: "Edición Inline de Celdas",
        description: "Para editar cualquier valor existente, simplemente haga clic en la celda que desea modificar. La celda se convertirá en un campo editable. Escriba el nuevo valor y presione Enter o haga clic fuera para guardar. Los cambios se aplican inmediatamente."
      },
      {
        title: "Copiar Registros",
        description: "El botón azul 'Copiar' (símbolo de documentos) crea un duplicado del registro seleccionado. Esto es útil cuando necesita crear un parámetro similar a uno existente. El nuevo registro se crea con los mismos datos pero puede editarlos según necesite."
      },
      {
        title: "Eliminar Registros",
        description: "Para eliminar un registro, selecciónelo haciendo clic en su fila y luego use el botón rojo 'Eliminar' (símbolo de papelera). Se le pedirá confirmación antes de borrar definitivamente. Esta acción no se puede deshacer."
      },
      {
        title: "Campo Habilitado",
        description: "La columna 'H' (Habilitado) es un checkbox que permite activar o desactivar un parámetro. Los parámetros deshabilitados no aparecerán en los selectores de otros módulos pero se mantienen en el sistema para histórico. Haga clic en el checkbox para cambiar el estado."
      },
      {
        title: "Filtro de Unidad",
        description: "Algunos parámetros como Actividades, Almacén e Insumos tienen un campo 'Unidad'. Use el filtro amarillo de unidad en la barra superior para ver solo los parámetros de una unidad específica. Esto facilita la organización cuando tiene múltiples unidades productivas."
      },
      {
        title: "Ordenar y Buscar",
        description: "Haga clic en cualquier encabezado de columna para ordenar los datos. Un segundo clic invierte el orden. Para buscar, use el campo de búsqueda en la barra de filtros que busca en todas las columnas visibles."
      },
      {
        title: "Tasa del Dólar",
        description: "La pestaña amarilla 'Dólar' permite registrar las tasas de cambio por fecha. Esta información se usa automáticamente en otros módulos para calcular equivalentes en dólares. Ingrese la fecha y el valor de la tasa correspondiente."
      }
    ]
  },
  administracion: {
    moduleId: "administracion",
    moduleName: "Administración",
    steps: [
      {
        title: "Gestión de Operaciones",
        description: "Este módulo registra todas las operaciones administrativas de la empresa: gastos, ingresos, nóminas, compras y otros movimientos financieros. Cada registro incluye fecha, descripción, monto, proveedor/cliente y la unidad productiva correspondiente."
      },
      {
        title: "Filtro por Unidad (Amarillo)",
        description: "El selector amarillo 'Unidad' filtra todos los registros por unidad productiva. Seleccione una unidad para ver solo sus operaciones, o 'Todas' para ver el consolidado. Este filtro se recuerda al cerrar y reabrir la ventana."
      },
      {
        title: "Pestañas por Tipo de Operación",
        description: "Las pestañas organizan las operaciones por tipo. Cada pestaña muestra solo los registros de ese tipo (gastos operativos, nómina, compras, etc.). El tipo se asigna automáticamente según la pestaña activa al crear un nuevo registro."
      },
      {
        title: "Crear Nueva Operación",
        description: "Para registrar una operación: 1) Seleccione la unidad en el filtro amarillo. 2) Vaya a la pestaña del tipo de operación. 3) Use el botón verde 'Agregar'. 4) Complete: fecha, descripción, monto, actividad, proveedor/personal. La fecha y unidad se completan automáticamente."
      },
      {
        title: "Edición de Campos",
        description: "Haga clic en cualquier celda para editarla directamente. Los campos de texto permiten escritura libre. Los campos numéricos solo aceptan números. Los selectores (actividad, proveedor) muestran las opciones disponibles según los parámetros configurados."
      },
      {
        title: "Campos de Monto y Dólar",
        description: "El campo 'Monto' registra el valor en bolívares. El campo 'Monto $' puede calcularse automáticamente usando la tasa del dólar del día, o puede ingresarse manualmente. Use esto para llevar control en ambas monedas."
      },
      {
        title: "Filtro de Fechas (Rojo)",
        description: "El rango de fechas rojo filtra por período. Haga clic en 'Desde' para seleccionar fecha inicial, luego en 'Hasta' para la fecha final. Esto limita los registros visibles al período seleccionado. Útil para ver operaciones de un mes o año específico."
      },
      {
        title: "Filtros de Columna (Doble-Click)",
        description: "Haga doble-click en cualquier celda de la grilla para agregar su valor como filtro. Por ejemplo, doble-click en un proveedor filtra solo las operaciones de ese proveedor. Los filtros son acumulativos y aparece un botón 'Celdas' para administrarlos."
      },
      {
        title: "Copiar y Duplicar",
        description: "El botón azul 'Copiar' duplica el registro seleccionado. Esto es muy útil para operaciones recurrentes: copie la última y solo cambie la fecha y monto. Ahorra tiempo en registros repetitivos."
      },
      {
        title: "Exportar a Excel",
        description: "El botón verde de Excel exporta los datos visibles (con todos los filtros aplicados) a un archivo descargable. Use los filtros primero para obtener exactamente los datos que necesita en el reporte."
      },
      {
        title: "Relacionar con Bancos",
        description: "Desde el módulo Bancos puede usar 'Relacionar' para vincular un movimiento bancario con esta operación. Esto mantiene trazabilidad entre el estado de cuenta y los registros administrativos."
      },
      {
        title: "Campo Capital/Utility",
        description: "Los campos booleanos Capital y Utility permiten clasificar operaciones como inversión de capital o gastos operativos. Use los botones Si/No en la barra de filtros para ver solo operaciones de capital o solo gastos regulares."
      }
    ]
  },
  bancos: {
    moduleId: "bancos",
    moduleName: "Bancos",
    steps: [
      {
        title: "Control de Movimientos Bancarios",
        description: "Este módulo gestiona todos los movimientos de las cuentas bancarias: depósitos, retiros, transferencias, comisiones e intereses. Cada cuenta bancaria se configura primero en Parámetros > Bancos y luego aparece disponible aquí."
      },
      {
        title: "Filtro por Banco",
        description: "El selector principal filtra por cuenta bancaria. Debe seleccionar un banco específico para ver sus movimientos. El saldo de la cuenta se muestra y actualiza automáticamente con cada operación registrada."
      },
      {
        title: "Crear Nuevo Movimiento",
        description: "Para registrar un movimiento: 1) Seleccione el banco. 2) Use el botón 'Agregar'. 3) Complete: fecha, referencia, descripción, tipo de operación. 4) Ingrese el monto. El saldo se recalcula automáticamente."
      },
      {
        title: "Tipos de Operación",
        description: "Las operaciones se clasifican como DÉBITO (retiros, pagos, comisiones) o CRÉDITO (depósitos, transferencias recibidas). El sistema usa el campo 'operador' del tipo de operación para saber si suma o resta del saldo."
      },
      {
        title: "Cálculo Automático de Saldo",
        description: "El saldo se calcula en tiempo real basándose en todos los movimientos ordenados por fecha. Los créditos suman y los débitos restan. Si importa movimientos, el sistema recalcula todo el historial automáticamente."
      },
      {
        title: "Importar Estados de Cuenta TXT",
        description: "El botón 'Importar' permite cargar estados de cuenta desde archivos TXT. Seleccione el archivo, el sistema detecta el formato del banco y transforma los campos automáticamente. Los movimientos duplicados se detectan por número de referencia."
      },
      {
        title: "Importar Excel/HTML",
        description: "También puede importar desde archivos Excel o HTML exportados de la banca en línea. El sistema soporta formatos de Provincial, Bancamiga y otros bancos venezolanos. La transformación de campos es automática."
      },
      {
        title: "Detección de Duplicados",
        description: "Al importar, el sistema compara las referencias de los movimientos nuevos con los existentes. Los duplicados se marcan y puede elegir omitirlos o importarlos de todos modos. Esto evita registros repetidos."
      },
      {
        title: "Relacionar con Administración",
        description: "El botón 'Relacionar' vincula el movimiento bancario seleccionado con un registro de Administración. Primero seleccione el movimiento, luego haga clic en Relacionar. Se abrirá Administración para seleccionar el registro correspondiente."
      },
      {
        title: "Edición de Movimientos",
        description: "Haga clic en cualquier celda para editarla. Puede modificar fecha, referencia, descripción, tipo y monto. Al cambiar un monto, el saldo se recalcula automáticamente desde ese punto en adelante."
      },
      {
        title: "Eliminar Movimientos",
        description: "Use el botón rojo para eliminar movimientos. El sistema pedirá confirmación. Al eliminar, el saldo de todos los movimientos posteriores se recalcula automáticamente."
      },
      {
        title: "Exportar a Excel",
        description: "El botón de Excel en el menú principal exporta todos los movimientos del banco seleccionado a un archivo Excel. Incluye todas las columnas y el saldo calculado de cada movimiento."
      },
      {
        title: "Conciliación Bancaria",
        description: "Use el campo 'Conciliado' para marcar movimientos que ya fueron verificados contra el estado de cuenta oficial. Esto ayuda a identificar movimientos pendientes de conciliar y detectar discrepancias."
      }
    ]
  },
  cosecha: {
    moduleId: "cosecha",
    moduleName: "Cosecha",
    steps: [
      {
        title: "Registro de Producción Agrícola",
        description: "Este módulo registra toda la producción agrícola: cantidades cosechadas, fechas, cultivos, lotes y destinos. Es fundamental para el control de rendimientos y planificación de producción."
      },
      {
        title: "Crear Registro de Cosecha",
        description: "Para registrar una cosecha: 1) Seleccione la unidad productiva. 2) Use 'Agregar'. 3) Complete: fecha, cultivo, tablón/lote, cantidad cosechada, unidad de medida. 4) Indique el destino (venta, almacén, consumo)."
      },
      {
        title: "Filtro por Unidad",
        description: "El filtro amarillo de unidad muestra solo las cosechas de esa finca. Seleccione 'Todas' para ver el consolidado de todas las unidades productivas."
      },
      {
        title: "Filtro por Cultivo",
        description: "Use el filtro de cultivo para ver solo un tipo de producción. Por ejemplo, filtre por 'Maíz' para ver todo el historial de cosecha de maíz, sin importar la finca."
      },
      {
        title: "Filtro por Ciclo",
        description: "El ciclo agrícola (invierno, verano, ciclo corto) permite agrupar cosechas por temporada. Filtre por ciclo para comparar rendimientos entre temporadas similares."
      },
      {
        title: "Rango de Fechas",
        description: "El filtro rojo de fechas limita el período visible. Use esto para ver cosechas de un mes, trimestre o año específico. Útil para reportes periódicos de producción."
      },
      {
        title: "Campo Cantidad y Unidad",
        description: "Ingrese la cantidad en el campo numérico y seleccione la unidad de medida (kg, toneladas, sacos, etc.). La unidad de medida se configura en Parámetros y debe ser consistente para poder sumar totales."
      },
      {
        title: "Tablones y Lotes",
        description: "El campo 'Tablón' identifica el lote o sector específico donde se realizó la cosecha. Esto permite analizar rendimientos por área y detectar zonas más o menos productivas."
      },
      {
        title: "Destino de la Producción",
        description: "Indique a dónde va la cosecha: venta directa, almacén para venta posterior, procesamiento, o consumo interno. Esto ayuda a controlar el flujo de la producción."
      },
      {
        title: "Análisis de Rendimientos",
        description: "Relacione la cantidad cosechada con las hectáreas del tablón para calcular rendimientos (kg/ha). Compare entre lotes, cultivos y ciclos para identificar mejoras o problemas."
      },
      {
        title: "Exportar Datos",
        description: "Exporte a Excel para generar reportes de producción. Incluya gráficos y análisis en su hoja de cálculo. Los datos exportados incluyen todos los campos visibles."
      },
      {
        title: "Historial y Trazabilidad",
        description: "Cada registro incluye fecha, hora y usuario que lo creó en el campo 'Propietario'. Esto permite auditar los registros y verificar quién ingresó cada dato."
      }
    ]
  },
  almacen: {
    moduleId: "almacen",
    moduleName: "Almacén",
    steps: [
      {
        title: "Control de Inventario",
        description: "Este módulo controla el inventario de insumos, materiales, productos y herramientas. Registra entradas (compras, producción) y salidas (consumo, ventas) para mantener el stock actualizado."
      },
      {
        title: "Tipos de Movimiento",
        description: "Cada movimiento es ENTRADA (aumenta existencias) o SALIDA (disminuye existencias). El tipo se define al crear el registro y determina cómo afecta el inventario."
      },
      {
        title: "Registrar Entrada",
        description: "Para registrar entrada de inventario: 1) Seleccione la unidad/almacén. 2) Agregue nuevo registro. 3) Complete: fecha, producto, cantidad, proveedor (si es compra). 4) El stock se actualiza automáticamente."
      },
      {
        title: "Registrar Salida",
        description: "Para salida de inventario: 1) Agregue registro de tipo SALIDA. 2) Seleccione el producto que sale. 3) Indique cantidad y destino (actividad, proyecto, venta). 4) El sistema descuenta del stock."
      },
      {
        title: "Filtro por Unidad",
        description: "Cada almacén pertenece a una unidad. Use el filtro amarillo para ver solo el inventario de un almacén específico. Importante si tiene múltiples bodegas."
      },
      {
        title: "Filtro por Producto",
        description: "Filtre por producto para ver todas las entradas y salidas de un artículo específico. Esto muestra el kardex del producto con su historial de movimientos."
      },
      {
        title: "Control de Stock Mínimo",
        description: "Configure el stock mínimo de cada producto en Parámetros. El sistema puede alertar cuando un producto está por debajo del mínimo para que programe reabastecimiento."
      },
      {
        title: "Costos y Valorización",
        description: "Ingrese el costo unitario en cada entrada. El sistema puede calcular el valor total del inventario y el costo promedio ponderado de cada producto."
      },
      {
        title: "Transferencias entre Almacenes",
        description: "Para mover productos entre almacenes: registre una salida del almacén origen y una entrada en el almacén destino. El campo 'Transferencia' puede vincular ambos registros."
      },
      {
        title: "Relación con Administración",
        description: "Las compras de inventario pueden relacionarse con registros de Administración. Esto vincula el movimiento físico del producto con su registro contable."
      },
      {
        title: "Inventario Físico",
        description: "Periodicamente compare el stock del sistema con el conteo físico. Si hay diferencias, registre ajustes de inventario (entradas o salidas de ajuste) para corregir."
      },
      {
        title: "Exportar Inventario",
        description: "Exporte a Excel para obtener listados de existencias, movimientos por período, o valorización del inventario. Use los filtros antes de exportar."
      }
    ]
  },
  arrime: {
    moduleId: "arrime",
    moduleName: "Arrime",
    steps: [
      {
        title: "Control de Transporte",
        description: "Este módulo registra el transporte de producción agrícola desde las fincas hasta los destinos finales (centrales, molinos, compradores). Controla viajes, volúmenes y costos de flete."
      },
      {
        title: "Registrar Viaje",
        description: "Para registrar un viaje: 1) Agregue nuevo registro. 2) Complete: fecha, finca de origen, destino final, cantidad transportada. 3) Indique placa del vehículo y chofer responsable."
      },
      {
        title: "Datos del Vehículo",
        description: "Seleccione la placa del vehículo que realiza el transporte. Las placas se configuran en Parámetros con datos del proveedor de transporte o chofer propio."
      },
      {
        title: "Control de Peso",
        description: "Registre peso de salida (tara) y peso de llegada (bruto). La diferencia es el peso neto transportado. Esto es crucial para liquidaciones con transportistas y centrales."
      },
      {
        title: "Guía de Transporte",
        description: "El campo 'Guía' almacena el número de guía o remisión del viaje. Use esto para cruzar información con documentos físicos y comprobantes de entrega."
      },
      {
        title: "Filtros de Búsqueda",
        description: "Filtre por finca de origen, destino, placa, chofer o rango de fechas. Combine filtros para obtener reportes específicos como 'viajes del chofer X en enero'."
      },
      {
        title: "Costo del Flete",
        description: "Ingrese el costo del flete por viaje o por tonelada. El sistema puede calcular totales para liquidación con transportistas. Relacione con Administración para registro contable."
      },
      {
        title: "Estado del Viaje",
        description: "Los viajes pueden estar: EN TRÁNSITO, ENTREGADO, o RECHAZADO. Actualice el estado al confirmar la entrega en destino. Registre observaciones si hay novedades."
      },
      {
        title: "Reportes de Volumen",
        description: "Genere reportes de toneladas transportadas por período, finca, destino o transportista. Use Excel para análisis detallados y gráficos de volúmenes."
      },
      {
        title: "Liquidación de Transportistas",
        description: "Agrupe viajes por transportista y período para generar liquidaciones. El reporte incluye número de viajes, toneladas y montos a pagar."
      }
    ]
  },
  transferencias: {
    moduleId: "transferencias",
    moduleName: "Transferencias",
    steps: [
      {
        title: "Gestión de Transferencias Bancarias",
        description: "Este módulo facilita la creación y procesamiento de transferencias bancarias. Permite crear lotes de transferencias, asignar montos y generar los registros correspondientes en Bancos y Administración."
      },
      {
        title: "Crear Nueva Transferencia",
        description: "Para crear una transferencia: 1) Use 'Agregar'. 2) Seleccione personal o proveedor. 3) Ingrese monto, banco destino, número de cuenta. 4) Agregue concepto de pago."
      },
      {
        title: "Datos del Personal/Proveedor",
        description: "El personal o proveedor se selecciona de los parámetros configurados. Al seleccionar, se cargan automáticamente sus datos bancarios si están registrados (banco, tipo de cuenta, número)."
      },
      {
        title: "Lotes de Transferencias",
        description: "Agrupe varias transferencias en un lote para procesarlas juntas. Esto es útil para nóminas o pagos masivos a proveedores del mismo día."
      },
      {
        title: "Función Repartir",
        description: "El botón 'Repartir' distribuye un monto total entre varias personas. Ingrese el monto total y las personas, el sistema divide equitativamente o según porcentajes que indique."
      },
      {
        title: "Procesar Transferencias",
        description: "El botón 'Enviar' procesa las transferencias seleccionadas. Al procesar: 1) Se crea el movimiento en Bancos (débito). 2) Se crea el registro en Administración. 3) La transferencia queda marcada como enviada."
      },
      {
        title: "Estados de Transferencia",
        description: "Las transferencias pueden estar: PENDIENTE (recién creada), ENVIADA (procesada en el sistema), CONFIRMADA (verificada en banco). Actualice el estado según el proceso real."
      },
      {
        title: "Generar Recibos PDF",
        description: "El botón 'Recibos' genera documentos PDF de las transferencias seleccionadas. Incluye datos del personal/proveedor, monto, concepto y fecha. Úselos como comprobante de pago."
      },
      {
        title: "Filtrar por Estado",
        description: "Use las pestañas o filtros para ver transferencias por estado. Esto ayuda a identificar cuáles están pendientes de enviar o confirmar."
      },
      {
        title: "Relación con Bancos",
        description: "Al procesar, el sistema crea automáticamente el movimiento bancario. Puede ver el vínculo en ambos módulos para mantener trazabilidad completa."
      },
      {
        title: "Importar desde Excel",
        description: "Para pagos masivos, puede preparar un archivo Excel con los datos y usar la función de importación. El formato debe coincidir con las columnas del sistema."
      },
      {
        title: "Exportar Listado",
        description: "Exporte el listado de transferencias a Excel. Incluye todos los datos de personal, proveedores, montos y estados. Útil para reportes de pagos realizados."
      }
    ]
  },
  agrodata: {
    moduleId: "agrodata",
    moduleName: "Agrodata",
    steps: [
      {
        title: "Monitoreo de Red y Equipos",
        description: "Este módulo centraliza el monitoreo de equipos de red, conectividad y servicios tecnológicos. Permite visualizar el estado de routers, antenas, servidores y otros dispositivos."
      },
      {
        title: "Configurar Equipos",
        description: "Los equipos a monitorear se configuran en Parámetros > Equipos de Red. Ingrese nombre, dirección IP, tipo de equipo y ubicación. Luego aparecerán en este módulo para monitoreo."
      },
      {
        title: "Estado de Conectividad",
        description: "El sistema hace ping periódico a los equipos configurados. El estado se muestra como ONLINE (verde) u OFFLINE (rojo). El historial de conectividad se almacena para análisis."
      },
      {
        title: "Alertas de Desconexión",
        description: "Cuando un equipo se desconecta, el sistema genera una alerta. Las alertas se muestran en la interfaz y pueden enviarse por correo si está configurado."
      },
      {
        title: "Historial de Eventos",
        description: "Cada cambio de estado (online a offline y viceversa) queda registrado con fecha y hora. Consulte el historial para identificar patrones de fallas."
      },
      {
        title: "Filtrar por Ubicación",
        description: "Filtre equipos por unidad o ubicación para ver solo los dispositivos de una finca o sucursal específica. Útil cuando tiene equipos distribuidos geográficamente."
      },
      {
        title: "Filtrar por Tipo",
        description: "Filtre por tipo de equipo (router, switch, antena, servidor) para ver solo una categoría. Ayuda a identificar problemas en un tipo específico de infraestructura."
      },
      {
        title: "Tiempo de Respuesta",
        description: "El sistema registra el tiempo de respuesta (latencia) de cada ping. Esto permite detectar degradación en la red antes de que ocurra desconexión total."
      },
      {
        title: "Gráficos de Disponibilidad",
        description: "Genere reportes de porcentaje de disponibilidad por equipo y período. Esto muestra la confiabilidad de la infraestructura de red."
      },
      {
        title: "Exportar Datos",
        description: "Exporte el historial de monitoreo a Excel para análisis detallado. Incluye todos los eventos de conexión/desconexión con timestamps."
      },
      {
        title: "Acciones Remotas",
        description: "Algunos equipos permiten acciones remotas como reinicio. Si está configurado, aparece un botón para ejecutar la acción directamente desde el módulo."
      }
    ]
  },
  debug: {
    moduleId: "debug",
    moduleName: "MyDebug",
    steps: [
      {
        title: "Herramienta de Depuración",
        description: "Esta ventana es una herramienta técnica para diagnóstico y resolución de problemas del sistema. Muestra información detallada sobre llamadas al servidor, errores y rendimiento."
      },
      {
        title: "Monitor de API",
        description: "La sección de llamadas API muestra todas las peticiones al servidor: método (GET, POST, PUT, DELETE), endpoint, código de respuesta y tiempo de ejecución. Útil para identificar llamadas lentas o fallidas."
      },
      {
        title: "Códigos de Estado",
        description: "Los códigos de estado indican el resultado: 200 = éxito, 400 = error de datos, 401 = no autorizado, 404 = no encontrado, 500 = error del servidor. Los errores aparecen en rojo."
      },
      {
        title: "Tiempo de Respuesta",
        description: "La columna de duración muestra cuántos milisegundos tomó cada llamada. Tiempos superiores a 1000ms pueden indicar problemas de rendimiento o conexión lenta."
      },
      {
        title: "Errores de Consola",
        description: "La sección de errores captura errores JavaScript de la aplicación. Incluye el mensaje de error, archivo y línea donde ocurrió. Útil para reportar problemas a soporte técnico."
      },
      {
        title: "Errores de Red",
        description: "Los errores de fetch (llamadas fallidas al servidor) se registran con detalle. Muestran la URL intentada y el tipo de fallo (timeout, conexión rechazada, etc.)."
      },
      {
        title: "Limpiar Registros",
        description: "Use el botón 'Limpiar API' para borrar la lista de llamadas y empezar limpio. 'Limpiar Errores' borra solo los errores. Esto facilita aislar problemas específicos."
      },
      {
        title: "Descripción de Endpoints",
        description: "El monitor traduce las rutas técnicas a descripciones legibles. Por ejemplo '/api/bancos' aparece como 'Obtener movimientos bancarios'. Esto facilita entender qué hace cada llamada."
      },
      {
        title: "Redimensionar Ventana",
        description: "La ventana de debug es redimensionable. Arrastre los bordes para ampliarla si necesita ver más información. El tamaño se guarda para la próxima vez."
      },
      {
        title: "Uso para Soporte",
        description: "Cuando contacte soporte técnico, tome captura de esta ventana. La información aquí contenida ayuda a diagnosticar rápidamente la causa de cualquier problema."
      }
    ]
  }
};

export function getTutorial(moduleId: string): ModuleTutorial | undefined {
  return tutoriales[moduleId];
}
