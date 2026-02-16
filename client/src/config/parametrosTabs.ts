// IMPORTANTE: Los tabs deben mantenerse en orden alfabético por label
// REGLA: Los colores siguen secuencia arcoíris (red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose) repitiendo ciclo
// NOTA: Tabs movidos a sus módulos respectivos: Bancos (bancos, dolar, formadepago), Cosecha (chofer, ciclos, cultivo, destino, fincas, origen, placa, productos, tablones), Almacén (categorias, fincas, suministros), Agrodata (actividades, insumos, personal, proveedores, cargos_finca), Administración (clientes)
import type { TabConfig } from "@/components/MyTab";

export const parametrosTabs: TabConfig[] = [
  {
    id: "claves",
    label: "Claves",
    tipo: "claves",
    color: "red",
    columns: [
      { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "constantes",
    label: "Constantes",
    tipo: "constante",
    color: "orange",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
      { key: "descripcion", label: "Valor", defaultWidth: 250, type: "text" },
    ],
  },
  {
    id: "personaldelnucleo",
    label: "Personal del Núcleo",
    tipo: "personaldelnucleo",
    color: "yellow",
    columns: [
      { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula", defaultWidth: 120, type: "text" },
      { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
      { key: "categoria", label: "Cargo", defaultWidth: 120, type: "text" },
      { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "unidad",
    label: "Unidades",
    tipo: "unidad",
    color: "green",
    columns: [
      { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
    ],
  },
];
