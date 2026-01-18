import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Users, PlusCircle, Filter, Edit, BarChart3, FileText, Upload, Settings, Wifi, Download, AlertTriangle, Lightbulb, MessageCircle, RefreshCw, Trash2, DollarSign, Calculator, Building2 } from "lucide-react";

export default function Guia() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Guia de Uso</h1>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                1. Acceso y Roles de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Tipos de Usuario</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Administrador:</strong> Acceso completo a Arrime y Finanza. Puede crear, editar y eliminar registros.</li>
                  <li><strong>Invitado:</strong> Solo puede ver registros en el modulo Arrime (modo lectura). No tiene acceso a Finanza.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Como Iniciar Sesion</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Al abrir la aplicacion, aparece la pantalla de identificacion</li>
                  <li>Seleccione "Invitado" para entrar directamente a Arrime (solo lectura)</li>
                  <li>Seleccione "Administrador" e ingrese la contrasena</li>
                  <li>Como administrador, elija el modulo: Arrime o Finanza</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Modulos Disponibles</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Arrime:</strong> Registro semanal de centrales azucareras</li>
                  <li><strong>Finanza:</strong> Gestion financiera con fincas, pagos e ingresos (solo admin)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                2. Crear Nuevos Registros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Campos del Formulario</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Fecha:</strong> Fecha del registro (requerido)</li>
                  <li><strong>Central:</strong> Seleccione la central electrica (requerido)</li>
                  <li><strong>Cantidad:</strong> Valor numerico de produccion (requerido)</li>
                  <li><strong>Grado:</strong> Valor de grado (opcional)</li>
                  <li><strong>Finca:</strong> Seleccione la finca de origen (requerido)</li>
                  <li><strong>Remesa:</strong> Numero de remesa (requerido)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Usar la Calculadora</h4>
                <p className="text-muted-foreground">Los campos Cantidad, Grado y Remesa tienen un boton de calculadora:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-2">
                  <li>Haga clic en el icono de calculadora junto al campo</li>
                  <li>Ingrese valores en cada fila</li>
                  <li>Use "Agregar fila" para sumar mas valores</li>
                  <li>El total se calcula automaticamente</li>
                  <li>Haga clic en "Aplicar" para usar el total</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                3. Ver y Filtrar Registros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Filtrar por Semana</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Use las flechas izquierda/derecha para navegar entre semanas</li>
                  <li>El numero de semana se muestra en el centro</li>
                  <li>Las fechas de inicio y fin de la semana aparecen debajo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Filtrar por Central</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el selector "Central"</li>
                  <li>Seleccione "Todas" o una central especifica</li>
                  <li>La tabla mostrara solo los registros de esa central</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Filtrar por Finca</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el selector "Finca"</li>
                  <li>Seleccione "Todas" o una finca especifica</li>
                  <li>Las opciones de finca se generan automaticamente de los registros existentes</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                4. Editar y Eliminar Registros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Editar un Registro</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Encuentre el registro en la tabla</li>
                  <li>Haga clic en el icono de lapiz (editar)</li>
                  <li>Modifique los campos deseados</li>
                  <li>Haga clic en "Guardar Cambios"</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Eliminar un Registro</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Encuentre el registro en la tabla</li>
                  <li>Haga clic en el icono de basura (eliminar)</li>
                  <li>Confirme la eliminacion en el mensaje emergente</li>
                </ol>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400">Nota: Solo los administradores pueden editar y eliminar registros.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                5. Graficas y Visualizacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Tipos de Graficas</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Totales:</strong> Grafica de barras con totales semanales por central</li>
                  <li><strong>Diario:</strong> Grafica de lineas con cantidades diarias de la semana</li>
                  <li><strong>Acumulado:</strong> Grafica de lineas con cantidad acumulada por central</li>
                  <li><strong>Grado:</strong> Grafica de lineas con el grado promedio desde el primer registro</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Como Ver una Grafica</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el boton de la grafica deseada</li>
                  <li>La grafica se abrira en una ventana emergente</li>
                  <li>Haga clic fuera de la ventana o en X para cerrar</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                6. Generar Reportes PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">PDF de la Semana Actual</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Asegurese de tener registros en la semana seleccionada</li>
                  <li>Haga clic en el boton "PDF"</li>
                  <li>El archivo se descargara automaticamente</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">PDF de Todas las Semanas</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el boton "PDF Todo"</li>
                  <li>Se generara un reporte completo con todas las semanas</li>
                  <li>El archivo se descargara automaticamente</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Contenido del PDF</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Encabezado con fechas de la semana</li>
                  <li>Tabla de registros</li>
                  <li>Resumen por central (cantidad total y grado promedio)</li>
                  <li>Totales generales</li>
                  <li>Graficas de datos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                7. Cargar Datos desde Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Formato del Archivo Excel</h4>
                <p className="text-muted-foreground">El archivo debe tener las siguientes columnas:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                  <li>Fecha</li>
                  <li>Cantidad (o Kilos)</li>
                  <li>Grado (o RTO/RTO Ajt)</li>
                  <li>Finca (opcional)</li>
                  <li>Remesa (opcional)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Como Cargar el Archivo</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el boton "Subir Excel"</li>
                  <li>Seleccione el archivo .xlsx o .xls</li>
                  <li>Espere mientras se procesan los datos</li>
                  <li>Los registros se crearan automaticamente con la central "Palmar"</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                8. Configuracion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Opciones Disponibles</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Gestion de Centrales:</strong> Agregar, editar y eliminar centrales con colores</li>
                  <li><strong>Tema:</strong> Claro, Oscuro o Sistema</li>
                  <li><strong>Esquema de Colores:</strong> Diferentes paletas para personalizar</li>
                  <li><strong>Fecha de Inicio:</strong> Configura desde cuando se calculan las semanas</li>
                  <li><strong>Cambiar Contrasena:</strong> Modifica la contrasena de administrador</li>
                  <li><strong>Eliminar Datos:</strong> Borra todos los registros (requiere confirmacion)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                9. Modo Sin Conexion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Como Funciona</h4>
                <p className="text-muted-foreground">La aplicacion puede funcionar sin internet:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                  <li><strong>Sin conexion:</strong> Los datos se guardan localmente en el dispositivo</li>
                  <li><strong>Indicador:</strong> Aparece un icono de nube tachada cuando esta sin conexion</li>
                  <li><strong>Registros pendientes:</strong> Se muestra el numero de registros por sincronizar</li>
                  <li><strong>Sincronizacion automatica:</strong> Cuando vuelve la conexion, los datos se envian al servidor</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                10. Instalar como Aplicacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">En Telefono Movil</h4>
                <p className="text-muted-foreground"><strong>Android (Chrome):</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Abra la aplicacion en Chrome</li>
                  <li>Toque los tres puntos del menu</li>
                  <li>Seleccione "Agregar a pantalla de inicio"</li>
                </ol>
                <p className="text-muted-foreground mt-3"><strong>iPhone (Safari):</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-1">
                  <li>Abra la aplicacion en Safari</li>
                  <li>Toque el boton de compartir</li>
                  <li>Seleccione "Agregar a pantalla de inicio"</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">En Computadora</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Abra la aplicacion en Chrome o Edge</li>
                  <li>Haga clic en el icono de instalacion en la barra de direcciones</li>
                  <li>Confirme la instalacion</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                11. Modulo Finanza (Solo Admin)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descripcion General</h4>
                <p className="text-muted-foreground">
                  El modulo Finanza permite gestionar los aspectos financieros de las fincas: configurar costos e ingresos, registrar pagos, y generar reportes de ingresos y estado de cuenta.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Componentes Principales</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Fincas:</strong> Configuracion de parametros financieros por finca</li>
                  <li><strong>Pagos:</strong> Registro de pagos realizados</li>
                  <li><strong>Generar Ingresos:</strong> Calculo automatico de ingresos por arrimes</li>
                  <li><strong>Estado de Cuenta:</strong> Balance consolidado de ingresos y pagos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                12. Gestion de Fincas (Finanza)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Campos de Configuracion</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Nombre:</strong> Identificador de la finca</li>
                  <li><strong>Central:</strong> Central asociada (Portuguesa, Palmar, Otros)</li>
                  <li><strong>Costo Cosecha:</strong> Costo por tonelada de cosecha</li>
                  <li><strong>Comp. Flete:</strong> Compensacion de flete por tonelada</li>
                  <li><strong>Valor Ton. Azucar:</strong> Valor por tonelada de azucar</li>
                  <li><strong>Valor Melaza TC:</strong> Valor de melaza por tonelada de cana</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Finca Especial: Nucleo</h4>
                <p className="text-muted-foreground">
                  Al seleccionar "Nucleo" como finca, los reportes agrupan multiples fincas y muestran totalizacion por finca al final del Estado de Cuenta.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                13. Pagos (Finanza)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Registrar un Pago</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en "Agregar Pago"</li>
                  <li>Seleccione la fecha del pago</li>
                  <li>Elija la finca y central</li>
                  <li>Ingrese el monto (use la calculadora si necesita sumar)</li>
                  <li>Agregue un comentario opcional</li>
                  <li>Haga clic en "Agregar"</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Usar la Calculadora</h4>
                <p className="text-muted-foreground">
                  El campo de monto tiene un boton de calculadora que permite sumar varios valores antes de aplicar el total al pago.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                14. Generar Ingresos (Finanza)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Formula de Calculo</h4>
                <p className="text-muted-foreground mb-2">
                  El ingreso se calcula automaticamente usando los registros de Arrime y la configuracion de la finca:
                </p>
                <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                  Ingreso = (cantidad x grado x valor azucar / 100) + melaza + flete - cosecha
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Ajuste de Grado</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Portuguesa:</strong> Si grado real &gt; 8.47, usa grado real. Sino, min(grado+1, 8.47) hasta 31/12</li>
                  <li><strong>Palmar:</strong> Grado fijo 8.3 las primeras 6 semanas desde primer arrime</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Columnas del Reporte</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Fecha, Cantidad, Grado Original, Grado Ajustado</li>
                  <li>Ingreso Azucar, Ingreso Melaza, Comp. Flete, Costo Cosecha</li>
                  <li>Ingreso Total</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                15. Estado de Cuenta (Finanza)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Contenido del Reporte</h4>
                <p className="text-muted-foreground">
                  Muestra un balance consolidado con todos los ingresos y pagos ordenados cronologicamente, con saldo acumulado.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Totalizacion por Finca (Nucleo)</h4>
                <p className="text-muted-foreground">
                  Cuando el filtro de finca es "Nucleo", al final del reporte se muestra un resumen de ingresos totales agrupados por cada finca.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Descargar PDF</h4>
                <p className="text-muted-foreground">
                  Use el boton de descarga para guardar el estado de cuenta como PDF, incluyendo la totalizacion por finca si aplica.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                16. Consejos y Mejores Practicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Para Arrime</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Configure las centrales antes de comenzar a ingresar datos</li>
                  <li>Use colores distintos para cada central para facilitar la identificacion</li>
                  <li>Revise los totales periodicamente para verificar la precision</li>
                  <li>Genere PDFs semanales para tener respaldo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Para Finanza</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Configure los parametros de cada finca antes de generar ingresos</li>
                  <li>Use "Nucleo" como filtro para ver totales consolidados de todas las fincas</li>
                  <li>Registre los pagos con comentarios descriptivos</li>
                  <li>Descargue el Estado de Cuenta periodicamente como PDF</li>
                  <li>Verifique que los grados se ajusten correctamente segun la central</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Para Todos los Usuarios</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Use la calculadora para sumas rapidas</li>
                  <li>Filtre por central o finca para analisis especificos</li>
                  <li>Revise la grafica de grado para monitorear tendencias</li>
                  <li>Instale la aplicacion en su dispositivo para acceso rapido</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                17. Solucion de Problemas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Los datos no aparecen</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Verifique que esta en la semana correcta</li>
                  <li>Revise los filtros de central y finca</li>
                  <li>Si esta sin conexion, los datos pueden estar pendientes de sincronizar</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">No puedo editar registros</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verifique que haya iniciado sesion como Administrador</li>
                  <li>Los invitados solo pueden ver, no modificar</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">El PDF no se genera</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Asegurese de tener al menos un registro en la semana</li>
                  <li>Espere a que las centrales carguen completamente</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Los datos no se sincronizan</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verifique su conexion a internet</li>
                  <li>Espere unos segundos, la sincronizacion es automatica</li>
                  <li>Si persiste, recargue la pagina</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                18. Actualizar a Nueva Version (Limpiar Cache)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-3">
                  Cuando hay una nueva version de la aplicacion, es necesario limpiar el cache del navegador para que los cambios se apliquen correctamente.
                </p>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Metodo Mas Facil - Icono de Papelera
                </h4>
                <p className="text-muted-foreground text-sm mb-2">
                  En la barra superior de la aplicacion, junto al indicador de conexion, encontrara un icono de papelera (<Trash2 className="h-3 w-3 inline" />). Al presionarlo:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Se limpiara automaticamente el cache de la aplicacion</li>
                  <li>La pagina se recargara con la version mas reciente</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">En Chrome (Android y PC)</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Abra la aplicacion en el navegador</li>
                  <li>Presione F12 (o clic derecho y "Inspeccionar")</li>
                  <li>Vaya a la pestana "Application" o "Aplicacion"</li>
                  <li>En el menu izquierdo, busque "Storage" o "Almacenamiento"</li>
                  <li>Haga clic en "Clear site data" o "Borrar datos del sitio"</li>
                  <li>Recargue la pagina (F5 o Ctrl+R)</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Metodo Rapido (Todos los navegadores)</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Mantenga presionada la tecla Shift</li>
                  <li>Haga clic en el boton de recargar del navegador</li>
                  <li>Esto fuerza una recarga completa ignorando el cache</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">En Safari (iPhone/iPad)</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Abra Ajustes del dispositivo</li>
                  <li>Vaya a Safari</li>
                  <li>Toque "Borrar historial y datos de sitios web"</li>
                  <li>Confirme la accion</li>
                  <li>Vuelva a abrir la aplicacion</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">En Chrome (Android) - Aplicacion Instalada</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Abra Ajustes del telefono</li>
                  <li>Vaya a "Aplicaciones" o "Apps"</li>
                  <li>Busque la aplicacion "Arrime Nucleo RMW"</li>
                  <li>Toque "Almacenamiento" o "Storage"</li>
                  <li>Toque "Borrar cache" y luego "Borrar datos"</li>
                  <li>Vuelva a abrir la aplicacion</li>
                </ol>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Importante:</strong> Si tiene registros pendientes de sincronizar (sin conexion), asegurese de estar conectado a internet y esperar a que se sincronicen ANTES de limpiar el cache, o perdera esos datos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Soporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Si tiene preguntas o problemas adicionales, contacte al administrador del sistema.
              </p>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
}
