import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeftRight, Split, FileText, Printer, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyFiltroDeBanco, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMyPop } from "@/components/MyPop";
import { useMyProgress } from "@/components/MyProgressModal";
import { Label } from "@/components/ui/label";
import { generateRecibosTransferencias, generateListaTransferencias } from "@/lib/pdfReports";
import { useStyleMode } from "@/contexts/StyleModeContext";

type RowHandler = (row: Record<string, any>) => void;

type TransferenciasTab = "nomina" | "proveedores";

const nominaColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "monto", label: "Monto", defaultWidth: 90, align: "right", type: "number" },
  { key: "prestamo", label: "Préstamo", defaultWidth: 80, align: "right", type: "number" },
  { key: "descuento", label: "Descuento", defaultWidth: 80, align: "right", type: "number" },
  { key: "resta", label: "Resta", defaultWidth: 80, align: "right", type: "number" },
  { key: "deuda", label: "Falta a Cancelar", defaultWidth: 100, align: "right", type: "number" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "personal", label: "Personal", defaultWidth: 100, type: "text" },
  { key: "rifced", label: "Cédula/RIF", defaultWidth: 110, type: "text" },
  { key: "numcuenta", label: "Nro Cuenta", defaultWidth: 160, type: "text" },
  { key: "email", label: "Correo", defaultWidth: 160, type: "text" },
  { key: "transferido", label: "Transferida", defaultWidth: 55, type: "boolean" },
  { key: "contabilizado", label: "Contabilizada", defaultWidth: 80, type: "boolean" },
  { key: "descripcion", label: "Beneficiario", defaultWidth: 200 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const proveedoresColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "monto", label: "Monto Bs", defaultWidth: 90, align: "right", type: "number" },
  { key: "montodolares", label: "Monto $", defaultWidth: 90, align: "right", type: "number" },
  { key: "resta", label: "Resta", defaultWidth: 80, align: "right", type: "number" },
  { key: "deuda", label: "Falta a Cancelar", defaultWidth: 100, align: "right", type: "number" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 100, type: "text" },
  { key: "rifced", label: "Cédula/RIF", defaultWidth: 110, type: "text" },
  { key: "numcuenta", label: "Nro Cuenta", defaultWidth: 160, type: "text" },
  { key: "email", label: "Correo", defaultWidth: 160, type: "text" },
  { key: "nrofactura", label: "Nro Factura", defaultWidth: 110, type: "text" },
  { key: "anticipo", label: "Anticipo", defaultWidth: 70, type: "boolean" },
  { key: "transferido", label: "Transferida", defaultWidth: 55, type: "boolean" },
  { key: "contabilizado", label: "Contabilizada", defaultWidth: 80, type: "boolean" },
  { key: "descripcion", label: "Beneficiario", defaultWidth: 200 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "transferido", label: "Transferida", value: "all" },
  { field: "contabilizado", label: "Contabilizada", value: "all" },
];

interface TransferenciasContentProps {
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  bancoFilter: string;
  onBancoChange: (value: string) => void;
  activeTab: TransferenciasTab;
  onTabChange: (tab: TransferenciasTab) => void;
}

function TransferenciasContent({
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  bancoFilter,
  onBancoChange,
  activeTab,
  onTabChange,
}: TransferenciasContentProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { showProgress, updateProgress, completeProgress, errorProgress, closeProgress } = useMyProgress();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [showEnviarDialog, setShowEnviarDialog] = useState(false);
  const [enviarFecha, setEnviarFecha] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  });
  const [enviarReferencia, setEnviarReferencia] = useState<number>(0);
  const [enviarTipo, setEnviarTipo] = useState<"uno" | "todos" | null>(null);
  const [showArchivoDialog, setShowArchivoDialog] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoContenido, setArchivoContenido] = useState("");
  const [pendingUpdateIds, setPendingUpdateIds] = useState<string[]>([]);
  const [pendingComprobante, setPendingComprobante] = useState<number>(0);
  const [isEnviando, setIsEnviando] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [enviarLog, setEnviarLog] = useState<string[]>([]);
  const [recibosPdfUrl, setRecibosPdfUrl] = useState<string | null>(null);
  const [recibosFilename, setRecibosFilename] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const enviarLogRef = useRef<string[]>([]);
  const currentRequestIdRef = useRef<string | null>(null);
  const wsCompletedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Conectar WebSocket para recibir progreso en tiempo real
  useEffect(() => {
    isMountedRef.current = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      if (!isMountedRef.current) return;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "enviar_progreso" && data.data) {
            const progreso = data.data;
            
            // Solo procesar mensajes que coincidan con el requestId actual
            if (progreso.requestId !== currentRequestIdRef.current) return;
            
            if (progreso.tipo === "registro") {
              // Agregar registro procesado al log
              const d = progreso.detalle;
              const nombre = progreso.nombre;
              let acciones = [];
              if (d.bancoCreado) acciones.push(`banco: ${d.resta.toLocaleString('es-VE')}`);
              if (d.adminCreado) acciones.push(`admin: ${d.monto.toLocaleString('es-VE')}`);
              if (d.descuentoCreado) acciones.push(`desc: ${d.descuento.toLocaleString('es-VE')}`);
              const linea = `✓ ${nombre}: ${acciones.join(", ")}`;
              
              enviarLogRef.current = [...enviarLogRef.current, linea];
              setEnviarLog([...enviarLogRef.current]);
              
              // Actualizar barra de progreso en tiempo real
              updateProgress({
                current: progreso.procesados,
                currentItem: nombre,
                logLine: linea
              });
            } else if (progreso.tipo === "completado") {
              wsCompletedRef.current = true;
              // Resumen final via WebSocket
              const result = progreso.resultados;
              mostrarResumenFinal(result);
            }
          }
        } catch (e) {
          // Ignorar mensajes no JSON
        }
      };
      
      ws.onclose = () => {
        if (isMountedRef.current) {
          setTimeout(connect, 3000);
        }
      };
      
      ws.onerror = () => {
        ws.close();
      };
    };
    
    connect();
    
    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [showPop]);
  
  const mostrarResumenFinal = (result: any) => {
    const logFinal = [...enviarLogRef.current];
    
    if (result.errores && result.errores.length > 0) {
      logFinal.push("");
      logFinal.push("Advertencias:");
      result.errores.forEach((e: string) => logFinal.push(`⚠ ${e}`));
    }
    
    const totalMonto = result.detalles?.reduce((sum: number, d: any) => sum + (d.monto || 0), 0) || 0;
    const totalResta = result.detalles?.reduce((sum: number, d: any) => sum + (d.resta || 0), 0) || 0;
    const totalDescuento = result.detalles?.reduce((sum: number, d: any) => sum + (d.descuento || 0), 0) || 0;
    
    logFinal.push("");
    logFinal.push("═══════════════════════════════");
    logFinal.push(`Procesados: ${result.procesados}`);
    logFinal.push(`Bancos creados: ${result.bancos}`);
    logFinal.push(`Administración creados: ${result.administracion}`);
    logFinal.push("");
    logFinal.push(`Total Monto: ${totalMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    logFinal.push(`Total Resta: ${totalResta.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    logFinal.push(`Total Descuento: ${totalDescuento.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    
    setEnviarLog(logFinal);
    completeProgress({ 
      title: "Contabilización Completada", 
      log: logFinal
    });
  };

  const handleEnviarBancosAdmin = async () => {
    // Filtrar registros que tengan transferido=true Y contabilizado=false
    const registrosPendientes = filteredData.filter(r => {
      const esTransferido = r.transferido === true || r.transferido === "t" || r.transferido === "true";
      const noContabilizado = r.contabilizado !== true && r.contabilizado !== "t" && r.contabilizado !== "true";
      return esTransferido && noContabilizado;
    });
    
    if (registrosPendientes.length === 0) {
      showPop({ title: "Sin registros", message: "No hay registros transferidos pendientes de contabilizar." });
      return;
    }
    
    // Generar requestId único para correlacionar mensajes WebSocket
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    currentRequestIdRef.current = requestId;
    wsCompletedRef.current = false;
    
    // Inicializar log y abrir modal de progreso
    enviarLogRef.current = [];
    setEnviarLog([]);
    showProgress({ 
      title: "Enviando a Bancos y Administración", 
      total: registrosPendientes.length
    });
    
    setIsEnviando(true);
    try {
      const ids = registrosPendientes.map(r => r.id);
      const response = await fetch("/api/transferencias/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, requestId, unidad: unidadFilter })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Fallback: Si WebSocket no envió el resumen, mostrarlo desde la respuesta HTTP
      if (!wsCompletedRef.current) {
        mostrarResumenFinal(result);
      }
      
      onRefresh();
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && (key === "/api/bancos" || key.startsWith("/api/bancos?"));
      }});
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key !== "string") return false;
        if (key.startsWith("/api/administracion/cuentasporpagar-pendientes")) return false;
        return key === "/api/administracion" || key.startsWith("/api/administracion?") || key.startsWith("/api/administracion/");
      }});
      queryClient.refetchQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/administracion/cuentasporpagar-pendientes");
      }});
    } catch (error) {
      console.error("Error enviando a bancos/admin:", error);
      errorProgress((error as Error).message);
    } finally {
      setIsEnviando(false);
      currentRequestIdRef.current = null;
    }
  };

  const handleClearFilters = () => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const handleEnviarClick = async () => {
    if (!bancoFilter || bancoFilter === "all" || bancoFilter === "") {
      showPop({ title: "Advertencia", message: "Primero seleccione un banco" });
      return;
    }
    // Obtener máximo número de referencia del servidor
    try {
      const response = await fetch("/api/transferencias/max-numero");
      const data = await response.json();
      setEnviarReferencia((data.maxNumero || 0) + 1);
    } catch (error) {
      console.error("Error fetching max numero:", error);
      setEnviarReferencia(1);
    }
    setShowEnviarDialog(true);
  };

  const handleEnviarCorreos = async () => {
    if (activeTab !== "proveedores") {
      showPop({ title: "aviso", message: "enviar correos solo aplica para proveedores" });
      return;
    }
    const pendientes = filteredData.filter(r => !r.ejecutada || r.ejecutada === "f" || r.ejecutada === "false");
    if (pendientes.length === 0) {
      showPop({ title: "aviso", message: "no hay registros pendientes de envío" });
      return;
    }
    setSendingEmails(true);
    try {
      const nombresUnicos = Array.from(new Set(pendientes.map(r => ((r.proveedor || "") as string).toLowerCase())));
      const correoResp = await fetch("/api/proveedores-correos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedores: nombresUnicos }),
      });
      if (!correoResp.ok) throw new Error("error al buscar correos de proveedores");
      const { correos: correoMap } = await correoResp.json() as { correos: Record<string, string> };

      const conCorreo: typeof pendientes = [];
      const sinCorreo: string[] = [];
      for (const r of pendientes) {
        const nombre = ((r.proveedor || "") as string).toLowerCase();
        const email = (r.email as string)?.trim() || correoMap[nombre] || "";
        if (email) {
          conCorreo.push({ ...r, _correoResuelto: email });
        } else {
          if (!sinCorreo.includes(nombre)) sinCorreo.push(nombre);
        }
      }

      if (conCorreo.length === 0) {
        const listaSin = sinCorreo.join(", ");
        showPop({ title: "aviso", message: `ningún proveedor tiene correo registrado:\n${listaSin}` });
        setSendingEmails(false);
        return;
      }

      let tasaDolar = 0;
      const primeraFecha = conCorreo[0]?.fecha;
      if (primeraFecha) {
        try {
          const tasaResp = await fetch(`/api/tasa-cambio/${primeraFecha}`);
          if (tasaResp.ok) {
            const tasaData = await tasaResp.json();
            tasaDolar = typeof tasaData.tasa === "number" ? tasaData.tasa : parseFloat(tasaData.tasa) || 0;
          }
        } catch {}
      }

      const emailPayloads = conCorreo.map(r => ({
        proveedor: r.proveedor || "",
        correo: (r as any)._correoResuelto || "",
        cedRif: r.rifced || "",
        nroFactura: r.nrofactura || "",
        fechaFactura: r.fecha || "",
        montoDolares: parseFloat(r.montodolares) || 0,
        abonoDolares: parseFloat(r.montodolares) || 0,
        abonoBs: parseFloat(r.monto) || 0,
        deudaDolares: parseFloat(r.deuda) || 0,
        esParcial: (parseFloat(r.deuda) || 0) > 0.01,
        unidad: r.unidad || unidadFilter,
        fecha: r.fecha || "",
        tasaDolar,
        banco: r.banco || "",
        numCuenta: r.numcuenta || "",
        comprobante: r.comprobante || "",
        descripcion: r.descripcion || "",
      }));

      const resp = await fetch("/api/enviar-comprobantes-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagos: emailPayloads }),
      });
      if (!resp.ok) throw new Error("error al enviar correos");
      const result = await resp.json();
      onRefresh();

      let mensaje = `${result.enviados} comprobantes enviados por correo`;
      if (sinCorreo.length > 0) {
        mensaje += `\n\nsin correo (${sinCorreo.length}): ${sinCorreo.join(", ")}`;
      }
      if (result.errores > 0) {
        mensaje += `\n\n${result.errores} errores al enviar`;
      }
      showPop({ title: "listo", message: mensaje });
    } catch (err: any) {
      showPop({ title: "error", message: err.message || "error al enviar correos" });
    } finally {
      setSendingEmails(false);
    }
  };

  const handleGenerarRecibos = () => {
    if (filteredData.length === 0) {
      showPop({ title: "Advertencia", message: "No hay registros para generar recibos" });
      return;
    }
    
    const result = generateRecibosTransferencias(filteredData);
    const url = URL.createObjectURL(result.blob);
    
    // Abrir en nueva pestaña para vista previa
    window.open(url, "_blank");
    
    // Guardar referencia para descarga
    setRecibosPdfUrl(url);
    setRecibosFilename(result.filename);
  };



  const handleImprimirTransferencias = () => {
    if (filteredData.length === 0) {
      showPop({ title: "Advertencia", message: "No hay registros para imprimir" });
      return;
    }
    const result = generateListaTransferencias(filteredData, { banco: bancoFilter });
    const url = URL.createObjectURL(result.blob);
    window.open(url, "_blank");
  };

  const generarArchivoTexto = (registros: Record<string, any>[], tipoBanco: string) => {
    if (registros.length === 0) return "";
    
    const T = registros.length;
    const fechaOp = enviarFecha; // dd/mm/aa
    const fechaSinBarras = fechaOp.replace(/\//g, "");
    const now = new Date();
    const hora = String(now.getHours()).padStart(2, "0");
    const minuto = String(now.getMinutes()).padStart(2, "0");
    const segundo = String(now.getSeconds()).padStart(2, "0");
    
    // Calcular total
    let total = 0;
    registros.forEach(reg => {
      total += parseFloat(reg.resta || reg.monto || 0);
    });
    
    const lines: string[] = [];
    let refop = enviarReferencia;
    
    if (tipoBanco.includes("exterior")) {
      // EXTERIOR LUVICA format
      const totalStr = total.toFixed(2).replace(".", "").replace(",", "").padStart(13, "0");
      lines.push(
        "J30275527101150037411000697836".toUpperCase() +
        String(T).padStart(4, "0") +
        totalStr +
        fechaSinBarras +
        "01" +
        " ".repeat(19)
      );
      
      registros.forEach(reg => {
        const beneficiar = (reg.personal || reg.proveedor || "").substring(0, 50).padEnd(50, " ").toUpperCase();
        const resta = parseFloat(reg.resta || reg.monto || 0).toFixed(2).replace(".", "").replace(",", "").padStart(12, "0");
        const descripcio = (reg.descripcion || "").substring(0, 120).padEnd(120, " ").toUpperCase();
        const numcuenta = reg.cuenta || reg.numcuenta || "01340000000000000000";
        const email = (reg.email || "").substring(0, 50).padEnd(50, " ");
        const rifced = (reg.rifced || reg.rif || reg.cedula || "").substring(0, 10).padEnd(10, " ");
        
        lines.push(
          beneficiar +
          resta +
          descripcio +
          numcuenta.substring(1, 4) +
          numcuenta +
          email +
          String(refop).padStart(8, "0") +
          "n" +
          rifced
        );
        refop++;
      });
    } else {
      // BANESCO LUVICA format
      const fechaYMD = `20${fechaOp.split("/")[2]}${fechaOp.split("/")[1]}${fechaOp.split("/")[0]}`;
      
      lines.push("HDRBANESCO        ED  95BPAYMULP");
      
      const temprefop = refop;
      lines.push(
        "01SCV" +
        " ".repeat(32) +
        "9  " +
        String(refop) +
        " ".repeat(35 - String(refop).length) +
        fechaYMD +
        hora + minuto + segundo
      );
      
      const totalStr = total.toFixed(2).replace(".", "").replace(",", "").padStart(15, "0");
      lines.push(
        "02" +
        String(refop).padStart(8, "0") +
        " ".repeat(22) +
        "J302755271" +
        " ".repeat(7) +
        "AGROPECUARIA LUVICA" +
        " ".repeat(16) +
        totalStr +
        "VES 01341021690001000182" +
        " ".repeat(14) +
        "BANESCO" +
        fechaYMD.padStart(12, " ")
      );
      refop++;
      
      registros.forEach(reg => {
        const resta = parseFloat(reg.resta || reg.monto || 0).toFixed(2).replace(".", "").replace(",", "").padStart(15, "0");
        const numcuenta = reg.cuenta || reg.numcuenta || "01340000000000000000";
        const rifced = (reg.rifced || reg.rif || reg.cedula || "").substring(0, 17).padEnd(17, " ").toUpperCase();
        const beneficiar = (reg.descripcion || reg.personal || reg.proveedor || "").substring(0, 70).padEnd(70, " ").toUpperCase();
        const email = (reg.email || "").substring(0, 201).padEnd(201, " ").toUpperCase();
        const sufijo = numcuenta.substring(0, 4) === "0134" ? "42 " : "425";
        
        lines.push(
          "03" +
          String(refop).padStart(8, "0") +
          " ".repeat(22) +
          resta +
          "VES" +
          numcuenta +
          " ".repeat(10) +
          numcuenta.substring(0, 4) +
          " ".repeat(10) +
          rifced +
          beneficiar +
          email +
          sufijo
        );
        refop++;
      });
      
      lines.push(
        "06000000000000001" +
        String(T).padStart(15, "0") +
        totalStr
      );
    }
    
    return lines.join("\n");
  };

  const generarTextoProvincial = (registros: Record<string, any>[]) => {
    const lines: string[] = [];
    registros.forEach(reg => {
      const rifcedRaw = (reg.rifced || reg.rif || reg.cedula || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const tipoDoc = rifcedRaw.charAt(0) || "V";
      const rifNumeros = rifcedRaw.replace(/[^0-9]/g, "").substring(0, 10).padEnd(10, "0");
      const nombreRaw = (reg.personal || reg.proveedor || "").toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nombre = nombreRaw.substring(0, 40).padEnd(40, " ");
      const numcuenta = (reg.cuenta || reg.numcuenta || "01080000000000000000").replace(/\s+/g, "").substring(0, 20).padEnd(20, "0");
      const monto = parseFloat(reg.resta || reg.monto || 0);
      const montoEntero = Math.round(monto * 100);
      const montoStr = String(montoEntero).padStart(15, "0").substring(0, 15);
      const comprobante = (reg.comprobante || reg.nrofactura || "0").replace(/[^0-9]/g, "") || "0";
      const referencia = ("1" + comprobante.padStart(14, "0")).substring(0, 15);
      const emailRaw = (reg.email || "");
      const email = emailRaw.substring(0, 50).padEnd(50, " ");
      lines.push(
        tipoDoc +
        rifNumeros +
        nombre +
        numcuenta +
        montoStr +
        "0" +
        referencia +
        email
      );
    });
    return lines.join("\n");
  };

  const handleGenerarProvincial = () => {
    if (!bancoFilter || bancoFilter === "all" || bancoFilter === "") {
      showPop({ title: "Advertencia", message: "Primero seleccione un banco" });
      return;
    }
    const registrosPendientes = filteredData.filter(r => !r.transferido);
    const registrosOmitidos = filteredData.filter(r => r.transferido);
    if (registrosOmitidos.length > 0) {
      const nombres = registrosOmitidos.map(r => r.personal || r.proveedor || "Sin nombre").join("\n");
      showPop({
        title: "Registros omitidos",
        message: `Los siguientes ${registrosOmitidos.length} registro(s) ya fueron transferidos y no se incluirán:\n\n${nombres}`
      });
    }
    if (registrosPendientes.length === 0) {
      showPop({ title: "Sin registros", message: "No hay registros pendientes para generar archivo." });
      return;
    }
    const now = new Date();
    const hora = now.getHours();
    const minuto = now.getMinutes();
    const segundo = now.getSeconds();
    const tabNombre = activeTab === "nomina" ? "nomina" : "proveedores";
    const nombreArchivo = `provincial${hora}${minuto}${segundo}${tabNombre}.txt`;
    const contenido = generarTextoProvincial(registrosPendientes);
    const ids = registrosPendientes.map(r => r.id);
    setPendingUpdateIds(ids);
    setPendingComprobante(enviarReferencia);
    setArchivoNombre(nombreArchivo);
    setArchivoContenido(contenido);
    setShowArchivoDialog(true);
  };

  const handleEnviarConfirm = (tipo: "uno" | "todos") => {
    setEnviarTipo(tipo);
    setShowEnviarDialog(false);
    
    if (tipo === "uno") {
      const selectedRow = filteredData.find(r => r.id === selectedRowId);
      if (!selectedRow) {
        showPop({ title: "Error", message: "Seleccione un registro primero" });
        return;
      }
      
      // Verificar si ya está transferido
      if (selectedRow.transferido) {
        showPop({ 
          title: "Registro ya transferido", 
          message: `El registro de ${selectedRow.personal || selectedRow.proveedor || "sin nombre"} ya fue transferido anteriormente.` 
        });
        return;
      }
      
      const bancoNombre = (bancoFilter || "banco").toLowerCase().replace(/\s+/g, "");
      const now = new Date();
      const hora = now.getHours();
      const minuto = now.getMinutes();
      const segundo = now.getSeconds();
      const nombreArchivo = `${bancoNombre}${hora}${minuto}${segundo}proveedores.txt`;
      
      const contenido = generarArchivoTexto([selectedRow], bancoNombre);
      
      // Guardar IDs y comprobante para actualizar cuando el usuario confirme
      setPendingUpdateIds([selectedRow.id]);
      setPendingComprobante(enviarReferencia);
      
      setArchivoNombre(nombreArchivo);
      setArchivoContenido(contenido);
      setShowArchivoDialog(true);
    } else {
      // Filtrar registros que NO están transferidos
      const registrosPendientes = filteredData.filter(r => !r.transferido);
      const registrosOmitidos = filteredData.filter(r => r.transferido);
      
      // Mostrar popup si hay registros omitidos
      if (registrosOmitidos.length > 0) {
        const nombres = registrosOmitidos.map(r => r.personal || r.proveedor || "Sin nombre").join("\n");
        showPop({ 
          title: "Registros omitidos", 
          message: `Los siguientes ${registrosOmitidos.length} registro(s) ya fueron transferidos y no se incluirán:\n\n${nombres}` 
        });
      }
      
      if (registrosPendientes.length === 0) {
        showPop({ title: "Sin registros", message: "Todos los registros ya fueron transferidos anteriormente." });
        return;
      }
      
      const ids = registrosPendientes.map(r => r.id);
      
      const bancoNombre = (bancoFilter || "banco").toLowerCase().replace(/\s+/g, "");
      const now = new Date();
      const hora = now.getHours();
      const minuto = now.getMinutes();
      const segundo = now.getSeconds();
      const nombreArchivo = `${bancoNombre}${hora}${minuto}${segundo}proveedores.txt`;
      
      const contenido = generarArchivoTexto(registrosPendientes, bancoNombre);
      
      // Guardar IDs y comprobante para actualizar cuando el usuario confirme
      setPendingUpdateIds(ids);
      setPendingComprobante(enviarReferencia);
      
      setArchivoNombre(nombreArchivo);
      setArchivoContenido(contenido);
      setShowArchivoDialog(true);
    }
  };
  
  // Filtrado local solo para fecha cliente (click en celdas) y por tipo (tab activo)
  // Los demás filtros (descripcion, textFilters, booleanFilters) ahora se envían al servidor
  const filteredData = useMemo(() => {
    let result = tableData;

    // Filtrar por tipo según tab activo
    result = result.filter(row => {
      const rowTipo = ((row.tipo || "") as string).toLowerCase();
      if (activeTab === "nomina") return rowTipo === "nomina";
      if (activeTab === "proveedores") return rowTipo === "proveedores";
      return true;
    });

    if (clientDateFilter.start || clientDateFilter.end) {
      result = result.filter((row) => {
        const rowDate = row.fecha;
        if (!rowDate) return false;
        if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
        if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
        return true;
      });
    }

    return result.map(row => {
      return { ...row, _disabledFields: ["deuda"] } as Record<string, any>;
    });
  }, [tableData, clientDateFilter, activeTab]);

  const currentColumns = activeTab === "nomina" ? nominaColumns : proveedoresColumns;

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="transferencias-filtro-unidad"
        />
        <MyFiltroDeBanco
          value={bancoFilter}
          onChange={onBancoChange}
          showLabel={true}
          testId="transferencias-filtro-banco"
          soloTransferencia={true}
          allowAll={true}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <MyFilter
          onClearFilters={handleClearFilters}
          clientDateFilter={clientDateFilter}
          showDateFilter={false}
          showDescripcionFilter={false}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
          unidadFilter={unidadFilter}
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          className={`px-3 py-1 text-xs font-bold rounded-md border-2 transition-all duration-150 ${
            activeTab === "nomina"
              ? "bg-red-600 border-red-700 text-white ring-2 ring-white scale-105"
              : "bg-red-400/50 border-red-500/50 text-white"
          }`}
          onClick={() => onTabChange("nomina")}
          data-testid="tab-pago-nomina"
        >
          Pago Nómina
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded-md border-2 transition-all duration-150 ${
            activeTab === "proveedores"
              ? "bg-orange-600 border-orange-700 text-white ring-2 ring-white scale-105"
              : "bg-orange-400/50 border-orange-500/50 text-white"
          }`}
          onClick={() => onTabChange("proveedores")}
          data-testid="tab-pago-proveedores"
        >
          Pago Proveedores
        </button>
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-rose-500/5 to-rose-600/10 border-rose-500/20">
        <MyGrid
          tableId={`transferencias-${activeTab}`}
          tableName="transferencias"
          columns={currentColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}
          currentTabName={activeTab === "nomina" ? "nomina" : "proveedores"}
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}

          extraButtons={
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="blue" onClick={handleEnviarBancosAdmin} disabled={isEnviando} data-testid="btn-enviar-bancos-admin">
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {isEnviando ? "Contabilizando..." : "Contabilizar"}
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Enviar a bancos y administración</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="cyan" onClick={() => {}} data-testid="btn-repartir">
                    <Split className="h-3.5 w-3.5 mr-1" />
                    Repartir
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Repartir monto entre personas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="gray" onClick={handleEnviarClick} data-testid="btn-generar-texto">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Texto Banesco
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Generar texto para Banesco</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="blue" onClick={handleGenerarProvincial} data-testid="btn-generar-provincial">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Texto Provincial
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Generar texto para Banco Provincial</TooltipContent>
              </Tooltip>
              {activeTab === "proveedores" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MyButtonStyle color="orange" onClick={handleEnviarCorreos} loading={sendingEmails} data-testid="btn-enviar-correos">
                      <Mail className="h-3.5 w-3.5 mr-1" />
                      Correos
                    </MyButtonStyle>
                  </TooltipTrigger>
                  <TooltipContent>Enviar comprobantes por correo a proveedores</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="green" onClick={handleGenerarRecibos} data-testid="btn-imprimir-recibos">
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Recibos
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Imprimir recibos individuales</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MyButtonStyle color="purple" onClick={handleImprimirTransferencias} data-testid="btn-imprimir-transferencias">
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Imprimir
                  </MyButtonStyle>
                </TooltipTrigger>
                <TooltipContent>Imprimir transferencias con resumen por banco</TooltipContent>
              </Tooltip>
            </div>
          }
        />
      </div>

      <Dialog open={showEnviarDialog} onOpenChange={setShowEnviarDialog}>
        <DialogContent className={`sm:max-w-md ${windowStyle}`}>
          <DialogHeader>
            <DialogTitle>Enviar Transferencias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enviar-fecha">Fecha de la operación</Label>
              <Input
                id="enviar-fecha"
                value={enviarFecha}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d]/g, "");
                  if (val.length > 6) val = val.slice(0, 6);
                  if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2);
                  if (val.length >= 5) val = val.slice(0, 5) + "/" + val.slice(5);
                  setEnviarFecha(val);
                }}
                placeholder="dd/mm/aa"
                maxLength={8}
                data-testid="input-enviar-fecha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enviar-referencia">Referencia</Label>
              <Input
                id="enviar-referencia"
                type="number"
                value={enviarReferencia}
                onChange={(e) => setEnviarReferencia(parseInt(e.target.value) || 0)}
                placeholder="Número de referencia"
                data-testid="input-enviar-referencia"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => handleEnviarConfirm("uno")}
              data-testid="btn-enviar-uno"
            >
              Un solo proveedor
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleEnviarConfirm("todos")}
              data-testid="btn-enviar-todos"
            >
              Todos los proveedores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchivoDialog} onOpenChange={setShowArchivoDialog}>
        <DialogContent className={`sm:max-w-2xl max-h-[80vh] ${windowStyle}`}>
          <DialogHeader>
            <DialogTitle>{archivoNombre}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[50vh] bg-muted p-3 rounded-md">
            <pre className="text-xs font-mono whitespace-pre">{archivoContenido}</pre>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(archivoContenido);
                toast({ title: "Copiado", description: "Contenido copiado al portapapeles" });
                setShowArchivoDialog(false);
              }}
              data-testid="btn-copiar-archivo"
            >
              Copiar
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={async () => {
                const blob = new Blob([archivoContenido], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = archivoNombre;
                a.click();
                URL.revokeObjectURL(url);
                if (pendingUpdateIds.length > 0) {
                  try {
                    for (let i = 0; i < pendingUpdateIds.length; i++) {
                      await fetch(`/api/transferencias/${pendingUpdateIds[i]}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transferido: true, comprobante: String(pendingComprobante + i) })
                      });
                    }
                    onRefresh();
                  } catch (error) {
                    console.error("Error marcando transferido:", error);
                  }
                }
                setPendingUpdateIds([]);
                setPendingComprobante(0);
                setShowArchivoDialog(false);
              }}
              data-testid="btn-descargar-archivo"
            >
              Descargar
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => {
                setPendingUpdateIds([]);
                setPendingComprobante(0);
                setShowArchivoDialog(false);
              }}
              data-testid="btn-cerrar-archivo"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TransferenciasProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Transferencias({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: TransferenciasProps) {
  const { toast } = useToast();
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("transferencias", "unidad", "all");
  const [bancoFilter, setBancoFilter] = usePersistedFilter("transferencias", "banco", "all");

  useEffect(() => {
    const handler = (e: CustomEvent<{ tab?: string }>) => {
      setBancoFilter("all");
      if (e.detail?.tab === "nomina" || e.detail?.tab === "proveedores") {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener("resetTransferenciasBanco", handler as EventListener);
    return () => window.removeEventListener("resetTransferenciasBanco", handler as EventListener);
  }, [setBancoFilter]);

  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [activeTab, setActiveTab] = useState<TransferenciasTab>("nomina");

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/transferencias/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/transferencias"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const [textFilters, setTextFilters] = useState<TextFilter[]>([]);

  const textFiltersWithOptions = useMemo(() => [] as TextFilter[], []);

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const handleTextFilterChange = (field: string, value: string) => {
    setTextFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  if (activeTab) {
    queryParams.tipo = activeTab;
  }
  if (bancoFilter && bancoFilter !== "all") {
    queryParams.banco = bancoFilter;
  }
  if (unidadFilter !== "all") {
    queryParams.unidad = unidadFilter;
  }
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }
  
  // Agregar filtro de descripción al servidor
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  
  // Agregar textFilters al servidor
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
    }
  }
  
  // Agregar booleanFilters al servidor
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="transferencias"
      title="Transferencias"
      icon={<ArrowLeftRight className="h-4 w-4 text-rose-800 dark:text-rose-300" />}
      tutorialId="transferencias"
      initialPosition={{ x: 240, y: 180 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-rose-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/transferencias"
    >
      <TransferenciasContent
        unidadFilter={unidadFilter}
        onUnidadChange={setUnidadFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFiltersWithOptions}
        onTextFilterChange={handleTextFilterChange}
        bancoFilter={bancoFilter}
        onBancoChange={setBancoFilter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </MyWindow>
  );
}
