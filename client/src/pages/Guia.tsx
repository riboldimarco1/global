import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Users, PlusCircle, Filter, Edit, BarChart3, FileText, Upload, Settings, Wifi, Download, AlertTriangle, Lightbulb, MessageCircle } from "lucide-react";

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
                  <li><strong>Administrador:</strong> Crear, editar, eliminar registros. Acceso completo a configuracion.</li>
                  <li><strong>Invitado:</strong> Solo puede ver los registros (modo lectura).</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Como Iniciar Sesion</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Haga clic en el boton de usuario en la esquina superior derecha</li>
                  <li>Seleccione "Admin" o "Invitado"</li>
                  <li>Si selecciona Admin, ingrese la contrasena configurada</li>
                  <li>El icono cambiara para mostrar su rol actual</li>
                </ol>
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
                  <li><strong>Finca:</strong> Seleccione la finca de origen (opcional)</li>
                  <li><strong>Remesa:</strong> Numero de remesa (opcional)</li>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                11. Consejos y Mejores Practicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Para Administradores</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Configure las centrales antes de comenzar a ingresar datos</li>
                  <li>Use colores distintos para cada central para facilitar la identificacion</li>
                  <li>Revise los totales periodicamente para verificar la precision</li>
                  <li>Genere PDFs semanales para tener respaldo</li>
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
                12. Solucion de Problemas
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
