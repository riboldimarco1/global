# Guia Completa de Uso - Registro de Centrales

## Introduccion

Esta aplicacion permite registrar y gestionar reportes semanales de centrales electricas. Puede funcionar sin conexion a internet y sincroniza los datos automaticamente cuando vuelve la conexion.

---

## 1. Acceso y Roles de Usuario

### Tipos de Usuario

| Rol | Permisos |
|-----|----------|
| **Administrador** | Crear, editar, eliminar registros. Acceso completo a configuracion. |
| **Invitado** | Solo puede ver los registros (modo lectura). |

### Como Iniciar Sesion

1. Haga clic en el boton de usuario en la esquina superior derecha
2. Seleccione "Admin" o "Invitado"
3. Si selecciona Admin, ingrese la contrasena configurada
4. El icono cambiara para mostrar su rol actual

### Cerrar Sesion

- Haga clic en el boton de cerrar sesion (icono de salida) en la esquina superior derecha

---

## 2. Crear Nuevos Registros

### Campos del Formulario

| Campo | Descripcion | Requerido |
|-------|-------------|-----------|
| **Fecha** | Fecha del registro | Si |
| **Central** | Seleccione la central electrica | Si |
| **Cantidad** | Valor numerico de produccion | Si |
| **Grado** | Valor de grado (opcional) | No |
| **Finca** | Seleccione la finca de origen | No |
| **Remesa** | Numero de remesa | No |

### Usar la Calculadora

Los campos Cantidad, Grado y Remesa tienen un boton de calculadora:

1. Haga clic en el icono de calculadora junto al campo
2. Ingrese valores en cada fila
3. Use "Agregar fila" para sumar mas valores
4. El total se calcula automaticamente
5. Haga clic en "Aplicar" para usar el total

### Guardar el Registro

1. Complete todos los campos requeridos
2. Haga clic en "Guardar Registro"
3. El registro aparecera en la tabla

---

## 3. Ver y Filtrar Registros

### Filtrar por Semana

- Use las flechas izquierda/derecha para navegar entre semanas
- El numero de semana se muestra en el centro
- Las fechas de inicio y fin de la semana aparecen debajo

### Filtrar por Central

1. Haga clic en el selector "Central"
2. Seleccione "Todas" o una central especifica
3. La tabla mostrara solo los registros de esa central

### Filtrar por Finca

1. Haga clic en el selector "Finca"
2. Seleccione "Todas" o una finca especifica
3. Las opciones de finca se generan automaticamente de los registros existentes

---

## 4. Editar y Eliminar Registros

### Editar un Registro

1. Encuentre el registro en la tabla
2. Haga clic en el icono de lapiz (editar)
3. Modifique los campos deseados
4. Haga clic en "Guardar Cambios"

### Eliminar un Registro

1. Encuentre el registro en la tabla
2. Haga clic en el icono de basura (eliminar)
3. Confirme la eliminacion en el mensaje emergente

**Nota:** Solo los administradores pueden editar y eliminar registros.

---

## 5. Tabla de Registros

### Informacion Mostrada

La tabla muestra:
- Fecha
- Central (con color identificador)
- Cantidad
- Grado (si aplica)
- Finca (si aplica)
- Remesa (si aplica)
- Acciones (editar/eliminar)

### Fila de Totales

Al final de la tabla aparece una fila de totales que muestra:
- **Total Cantidad:** Suma de todas las cantidades
- **Grado Promedio:** Promedio ponderado del grado (cantidad x grado / total cantidad)

---

## 6. Graficas y Visualizacion

### Tipos de Graficas

| Boton | Descripcion |
|-------|-------------|
| **Totales** | Grafica de barras con totales semanales por central |
| **Diario** | Grafica de lineas con cantidades diarias de la semana |
| **Acumulado** | Grafica de lineas con cantidad acumulada por central |
| **Grado** | Grafica de lineas con el grado promedio desde el primer registro |

### Como Ver una Grafica

1. Haga clic en el boton de la grafica deseada
2. La grafica se abrira en una ventana emergente
3. Haga clic fuera de la ventana o en X para cerrar

---

## 7. Generar Reportes PDF

### PDF de la Semana Actual

1. Asegurese de tener registros en la semana seleccionada
2. Haga clic en el boton "PDF"
3. El archivo se descargara automaticamente

### PDF de Todas las Semanas

1. Haga clic en el boton "PDF Todo"
2. Se generara un reporte completo con todas las semanas
3. El archivo se descargara automaticamente

### Contenido del PDF

- Encabezado con fechas de la semana
- Tabla de registros
- Resumen por central (cantidad total y grado promedio)
- Totales generales
- Graficas de datos

---

## 8. Cargar Datos desde Excel (Palmar)

### Formato del Archivo Excel

El archivo debe tener las siguientes columnas:
- Fecha
- Cantidad (o Kilos)
- Grado (o RTO/RTO Ajt)
- Finca (opcional)
- Remesa (opcional)

### Como Cargar el Archivo

1. Haga clic en el boton "Subir Excel"
2. Seleccione el archivo .xlsx o .xls
3. Espere mientras se procesan los datos
4. Los registros se crearan automaticamente con la central "Palmar"

---

## 9. Configuracion

### Acceder a Configuracion

1. Haga clic en el icono de engranaje en la esquina superior
2. Se abrira el panel de configuracion

### Opciones Disponibles

#### Gestion de Centrales
- Agregar nuevas centrales con nombre y color
- Editar centrales existentes
- Eliminar centrales (con confirmacion)
- Cambiar el orden arrastrando

#### Tema de la Aplicacion
- **Claro:** Fondo blanco
- **Oscuro:** Fondo oscuro
- **Sistema:** Sigue la configuracion del dispositivo

#### Esquema de Colores
Seleccione entre diferentes paletas de colores para personalizar la apariencia.

#### Fecha de Inicio
Configure la fecha desde la cual se calculan las semanas (por defecto: 3 de noviembre de 2025).

#### Cambiar Contrasena de Admin
1. Ingrese la contrasena actual
2. Ingrese la nueva contrasena (minimo 4 caracteres)
3. Haga clic en "Cambiar"

#### Eliminar Todos los Datos
- Esta opcion borra TODOS los registros de forma permanente
- Requiere confirmacion multiple
- Solo disponible para administradores

---

## 10. Modo Sin Conexion

### Como Funciona

La aplicacion puede funcionar sin internet:

1. **Sin conexion:** Los datos se guardan localmente en el dispositivo
2. **Indicador:** Aparece un icono de nube tachada cuando esta sin conexion
3. **Registros pendientes:** Se muestra el numero de registros por sincronizar
4. **Sincronizacion automatica:** Cuando vuelve la conexion, los datos se envian al servidor

### Indicadores de Estado

| Icono | Significado |
|-------|-------------|
| Nube con check | Conectado y sincronizado |
| Nube tachada | Sin conexion |
| Numero en circulo | Registros pendientes de sincronizar |

---

## 11. Instalar como Aplicacion (PWA)

### En Telefono Movil

**Android (Chrome):**
1. Abra la aplicacion en Chrome
2. Toque los tres puntos del menu
3. Seleccione "Agregar a pantalla de inicio"
4. Confirme la instalacion

**iPhone (Safari):**
1. Abra la aplicacion en Safari
2. Toque el boton de compartir
3. Seleccione "Agregar a pantalla de inicio"
4. Confirme la instalacion

### En Computadora

**Chrome/Edge:**
1. Abra la aplicacion
2. Haga clic en el icono de instalacion en la barra de direcciones
3. Confirme la instalacion

---

## 12. Consejos y Mejores Practicas

### Para Administradores

- Configure las centrales antes de comenzar a ingresar datos
- Use colores distintos para cada central para facilitar la identificacion
- Revise los totales periodicamente para verificar la precision
- Genere PDFs semanales para tener respaldo

### Para Todos los Usuarios

- Use la calculadora para sumas rapidas
- Filtre por central o finca para analisis especificos
- Revise la grafica de grado para monitorear tendencias
- Instale la aplicacion en su dispositivo para acceso rapido

---

## 13. Solucion de Problemas

### Los datos no aparecen

1. Verifique que esta en la semana correcta
2. Revise los filtros de central y finca
3. Si esta sin conexion, los datos pueden estar pendientes de sincronizar

### No puedo editar registros

- Verifique que haya iniciado sesion como Administrador
- Los invitados solo pueden ver, no modificar

### El PDF no se genera

- Asegurese de tener al menos un registro en la semana
- Espere a que las centrales carguen completamente

### Los datos no se sincronizan

- Verifique su conexion a internet
- Espere unos segundos, la sincronizacion es automatica
- Si persiste, recargue la pagina

---

## Soporte

Si tiene preguntas o problemas adicionales, contacte al administrador del sistema.
