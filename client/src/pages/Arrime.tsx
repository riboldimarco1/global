import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Upload, FileSpreadsheet, Loader2, X, ClipboardList, Weight, Send, DollarSign, MapPin, Users, ShoppingCart, RefreshCw, Settings, Factory } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { type ReportFilters } from "@/components/MyFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import MySubTabs, { getSubTabColor } from "@/components/MySubTabs";
import { getStoredUsername } from "@/lib/auth";
import NominaSemanalNucleo from "@/components/NominaSemanalNucleo";
import * as XLSX from "xlsx";

const arrimeColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "central", label: "Central", defaultWidth: 100 },
  { key: "feriado", label: "Fe", defaultWidth: 40, type: "boolean" },
  { key: "ruta", label: "Ruta", defaultWidth: 100 },
  { key: "flete", label: "Flete", defaultWidth: 70, align: "right", type: "number" },
  { key: "fletechofer", label: "Flete chofer", defaultWidth: 90, align: "right", type: "number" },
  { key: "remesa", label: "Remesa", defaultWidth: 100, type: "text" },
  { key: "ticket", label: "Ticket", defaultWidth: 100, type: "text" },
  { key: "placa", label: "Placa Camión", defaultWidth: 100 },
  { key: "chofer", label: "Chofer", defaultWidth: 120 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 120 },
  { key: "cantidad", label: "Peso", defaultWidth: 70, align: "right", type: "number" },
  { key: "monto", label: "Monto", defaultWidth: 80, align: "right", type: "number" },
  { key: "montochofer", label: "Monto chofer", defaultWidth: 95, align: "right", type: "number" },
  { key: "cancelado", label: "Ca", defaultWidth: 40, type: "boolean" },
  { key: "pagochofer", label: "Pa", defaultWidth: 40, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 40, type: "boolean" },
  { key: "grado", label: "Grado", defaultWidth: 60, align: "right", type: "number" },
  { key: "brix", label: "Brix", defaultWidth: 55, align: "right", type: "number" },
  { key: "pol", label: "Pol", defaultWidth: 55, align: "right", type: "number" },
  { key: "torta", label: "Torta", defaultWidth: 55, align: "right", type: "number" },
  { key: "tablon", label: "Tablon", defaultWidth: 70 },
  { key: "finca", label: "Finca", defaultWidth: 120 },
  { key: "nucleo", label: "Nucleo", defaultWidth: 80 },
  { key: "codigofinca", label: "Cod.Finca", defaultWidth: 90 },
  { key: "cedulachofer", label: "Cédula", defaultWidth: 100 },
  { key: "placaremolque", label: "Placa Remolque", defaultWidth: 110 },
  { key: "pesobruto", label: "P.Bruto", defaultWidth: 75, align: "right", type: "number" },
  { key: "tara", label: "Tara", defaultWidth: 70, align: "right", type: "number" },
  { key: "horaentrada", label: "H.Entrada", defaultWidth: 80 },
  { key: "horasalida", label: "H.Salida", defaultWidth: 80 },
  { key: "fechaquema", label: "F.Quema", defaultWidth: 85, type: "date" },
  { key: "tipocosecha", label: "Cosecha", defaultWidth: 100 },
  { key: "nucleocorte", label: "N.Corte", defaultWidth: 80 },
  { key: "nucleoalce", label: "N.Alce", defaultWidth: 80 },
  { key: "nucleoarrime", label: "N.Arrime", defaultWidth: 80 },
  { key: "operador", label: "Operador", defaultWidth: 120 },
  { key: "remesero", label: "Remesero", defaultWidth: 120 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 180 },
  { key: "azucar", label: "Azucar", defaultWidth: 65, align: "right", type: "number" },
  { key: "transporte", label: "Transporte", defaultWidth: 80, align: "right", type: "number" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "cancelado", label: "Cancelado", value: "all" },
  { field: "feriado", label: "Feriado", value: "all" },
  { field: "pagochofer", label: "Pago Chofer", value: "all" },
];

interface RemesaTicketFormData {
  finca: string;
  codigoFinca: string;
  remesa: string;
  ticket: string;
  fecha: string;
  chofer: string;
  cedulaChofer: string;
  placaCamion: string;
  placaRemolque: string;
  pesoBruto: string;
  tara: string;
  pesoNeto: string;
  horaEntrada: string;
  horaSalida: string;
  fechaQuema: string;
  tablon: string;
  tipoCosechaModo: string;
  tipoCosechaEstado: string;
  nucleoCorte: string;
  nucleoAlce: string;
  nucleoArrime: string;
  operador: string;
  remesero: string;
  proveedor: string;
}

const emptyFormData: RemesaTicketFormData = {
  finca: "", codigoFinca: "", remesa: "", ticket: "", fecha: "",
  chofer: "", cedulaChofer: "", placaCamion: "", placaRemolque: "",
  pesoBruto: "", tara: "", pesoNeto: "",
  horaEntrada: "", horaSalida: "", fechaQuema: "",
  tablon: "", tipoCosechaModo: "", tipoCosechaEstado: "",
  nucleoCorte: "", nucleoAlce: "", nucleoArrime: "",
  operador: "", remesero: "", proveedor: "",
};

interface ParametroFull {
  id: string;
  tipo: string;
  nombre: string;
  habilitado: boolean | string;
  descripcion?: string;
  ced_rif?: string;
  cuenta?: string;
  categoria?: string;
}

function SelectField({ label, value, onChange, options, placeholder, testId, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; testId: string; disabled?: boolean;
}) {
  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
  const selectClass = `w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border-border ${disabled ? "bg-muted opacity-70 cursor-not-allowed" : "bg-background"}`;
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={selectClass} value={value} onChange={e => onChange(e.target.value)} data-testid={testId} disabled={disabled}>
        <option value="">{placeholder || "-- seleccionar --"}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

interface RemesaTicketFormProps {
  centralFilter: string;
  onSwitchToTotal: () => void;
  editingRecord?: Record<string, any> | null;
  onDoneEditing?: () => void;
}

function RemesaTicketForm({ centralFilter, onSwitchToTotal, editingRecord, onDoneEditing }: RemesaTicketFormProps) {
  const isEditing = !!editingRecord;

  const buildFormFromRecord = (rec: Record<string, any>): RemesaTicketFormData => {
    const tipoCosechaRaw = (rec.tipocosecha || "").toLowerCase();
    let modo = "";
    let estado = "";
    if (tipoCosechaRaw.includes("manual")) modo = "manual";
    else if (tipoCosechaRaw.includes("mecanizada")) modo = "mecanizada";
    if (tipoCosechaRaw.includes("quema")) estado = "quema";
    else if (tipoCosechaRaw.includes("verde")) estado = "verde";
    const pesoNeto = rec.cantidad ? String(rec.cantidad) : "";
    return {
      finca: rec.finca || "",
      codigoFinca: rec.codigofinca || "",
      remesa: rec.remesa || "",
      ticket: rec.ticket || "",
      fecha: rec.fecha || "",
      chofer: rec.chofer || "",
      cedulaChofer: rec.cedulachofer || "",
      placaCamion: rec.placa || "",
      placaRemolque: rec.placaremolque || "",
      pesoBruto: rec.pesobruto ? String(rec.pesobruto) : "",
      tara: rec.tara ? String(rec.tara) : "",
      pesoNeto,
      horaEntrada: rec.horaentrada || "",
      horaSalida: rec.horasalida || "",
      fechaQuema: rec.fechaquema || "",
      tablon: rec.tablon || "",
      tipoCosechaModo: modo,
      tipoCosechaEstado: estado,
      nucleoCorte: rec.nucleocorte || "",
      nucleoAlce: rec.nucleoalce || "",
      nucleoArrime: rec.nucleoarrime || "",
      operador: rec.operador || "",
      remesero: rec.remesero || "",
      proveedor: rec.proveedor || "",
    };
  };

  const [form, setForm] = useState<RemesaTicketFormData>({ ...emptyFormData });
  const [isSaving, setIsSaving] = useState(false);
  const { showPop } = useMyPop();

  const lockedFieldsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (editingRecord) {
      const built = buildFormFromRecord(editingRecord);
      setForm(built);
      const locked = new Set<string>();
      const allFields: (keyof RemesaTicketFormData)[] = [
        "finca", "codigoFinca", "remesa", "ticket", "fecha",
        "chofer", "cedulaChofer", "placaCamion", "placaRemolque",
        "pesoBruto", "tara", "horaEntrada", "horaSalida", "fechaQuema",
        "tablon", "tipoCosechaModo", "tipoCosechaEstado",
        "nucleoCorte", "nucleoAlce", "nucleoArrime", "operador", "remesero", "proveedor",
      ];
      for (const f of allFields) {
        if (built[f]) locked.add(f);
      }
      lockedFieldsRef.current = locked;
    } else {
      setForm({ ...emptyFormData });
      lockedFieldsRef.current = new Set();
    }
  }, [editingRecord]);

  const isLocked = (field: string) => isEditing && lockedFieldsRef.current.has(field);

  const { data: allParametros = [] } = useQuery<ParametroFull[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const fincasData = useMemo(() =>
    allParametros.filter(p => (p.tipo === "fincas" || p.tipo === "finca") && (p.habilitado === true || p.habilitado === "t")),
    [allParametros]
  );
  const fincaOptions = useMemo(() => fincasData.map(p => p.nombre).filter(Boolean), [fincasData]);

  const placaOptions = useMemo(() =>
    allParametros
      .filter(p => (p.tipo === "placa" || p.tipo === "placas") && (p.habilitado === true || p.habilitado === "t"))
      .map(p => p.nombre).filter(Boolean),
    [allParametros]
  );

  const personalNucleo = useMemo(() =>
    allParametros.filter(p => p.tipo === "personaldelnucleo" && (p.habilitado === true || p.habilitado === "t")),
    [allParametros]
  );
  const choferOptions = useMemo(() => personalNucleo.filter(p => p.categoria === "chofer").map(p => p.nombre).filter(Boolean), [personalNucleo]);
  const operadorOptions = useMemo(() => personalNucleo.filter(p => p.categoria === "operador").map(p => p.nombre).filter(Boolean), [personalNucleo]);
  const remeseroOptions = useMemo(() => personalNucleo.filter(p => p.categoria === "remesero").map(p => p.nombre).filter(Boolean), [personalNucleo]);
  const proveedorNucleoOptions = useMemo(() =>
    allParametros.filter(p => p.tipo === "proveedoresnucleo" && (p.habilitado === true || p.habilitado === "t")).map(p => p.nombre).filter(Boolean),
    [allParametros]
  );

  const updateField = (field: keyof RemesaTicketFormData, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "finca") {
        const match = fincasData.find(f => f.nombre === value);
        next.codigoFinca = match?.descripcion || "";
      }
      if (field === "chofer") {
        const match = personalNucleo.find(p => p.nombre === value && p.categoria === "chofer");
        next.cedulaChofer = match?.ced_rif || "";
      }
      if (field === "pesoBruto" || field === "tara") {
        const bruto = parseFloat(next.pesoBruto);
        const tara = parseFloat(next.tara);
        if (!isNaN(bruto)) {
          next.pesoNeto = String(bruto - (isNaN(tara) ? 0 : tara));
        } else {
          next.pesoNeto = "";
        }
      }
      return next;
    });
  };

  const handleDateInput = (field: keyof RemesaTicketFormData, value: string) => {
    let cleaned = value.replace(/[^0-9/]/g, "");
    const prev = form[field];
    if (cleaned.length === 2 && !cleaned.includes("/") && prev.length < cleaned.length) cleaned += "/";
    if (cleaned.length === 5 && cleaned.split("/").length === 2 && prev.length < cleaned.length) cleaned += "/";
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    updateField(field, cleaned);
  };

  const handleSendToTotal = async () => {
    if (!form.remesa && !form.ticket) {
      showPop({ title: "Datos incompletos", message: "Debe ingresar al menos la remesa o el ticket" });
      return;
    }
    if (!centralFilter) {
      showPop({ title: "Central requerido", message: "Debe seleccionar un central antes de enviar" });
      return;
    }

    setIsSaving(true);
    try {
      const username = getStoredUsername();
      const record: Record<string, any> = {
        finca: form.finca.toLowerCase() || undefined,
        codigofinca: form.codigoFinca.toLowerCase() || undefined,
        remesa: form.remesa.toLowerCase() || undefined,
        ticket: form.ticket.toLowerCase() || undefined,
        fecha: form.fecha || undefined,
        chofer: form.chofer.toLowerCase() || undefined,
        cedulachofer: form.cedulaChofer.toLowerCase() || undefined,
        placa: form.placaCamion.toLowerCase() || undefined,
        placaremolque: form.placaRemolque.toLowerCase() || undefined,
        pesobruto: form.pesoBruto ? parseFloat(form.pesoBruto) : undefined,
        tara: form.tara ? parseFloat(form.tara) : undefined,
        cantidad: form.pesoNeto ? parseFloat(form.pesoNeto) : undefined,
        horaentrada: form.horaEntrada.toLowerCase() || undefined,
        horasalida: form.horaSalida.toLowerCase() || undefined,
        fechaquema: form.fechaQuema || undefined,
        tablon: form.tablon.toLowerCase() || undefined,
        tipocosecha: [form.tipoCosechaModo, form.tipoCosechaEstado].filter(Boolean).join(" ").toLowerCase() || undefined,
        nucleocorte: form.nucleoCorte.toLowerCase() || undefined,
        nucleoalce: form.nucleoAlce.toLowerCase() || undefined,
        nucleoarrime: form.nucleoArrime.toLowerCase() || undefined,
        operador: form.operador.toLowerCase() || undefined,
        remesero: form.remesero.toLowerCase() || undefined,
        proveedor: form.proveedor.toLowerCase() || undefined,
        central: centralFilter.toLowerCase(),
        _username: username,
      };

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      record.propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

      Object.keys(record).forEach(k => { if (record[k] === undefined) delete record[k]; });

      const url = (isEditing && editingRecord) ? `/api/arrime/${editingRecord.id}` : "/api/arrime";
      const method = (isEditing && editingRecord) ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        showPop({ title: isEditing ? "Registro actualizado" : "Registro creado", message: isEditing ? "Los datos fueron guardados exitosamente" : "El registro fue enviado exitosamente a Total" });
        setForm({ ...emptyFormData });
        queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
        if (isEditing && onDoneEditing) {
          onDoneEditing();
        }
        onSwitchToTotal();
      } else {
        const err = await res.json().catch(() => ({ message: "Error desconocido" }));
        showPop({ title: "Error", message: err.message || "No se pudo crear el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 border-border";
  const disabledInputClass = "w-full px-2 py-1.5 text-sm border rounded-md bg-muted opacity-70 cursor-not-allowed border-border";
  const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
  const sectionTitleClass = "text-sm font-bold text-white px-3 py-1.5 rounded-md";

  const getInputClass = (field: string, extra?: string) => {
    const base = isLocked(field) ? disabledInputClass : inputClass;
    return extra ? `${base} ${extra}` : base;
  };

  return (
    <div className="flex flex-col h-full p-3 overflow-auto">
      <div className="max-w-3xl mx-auto w-full space-y-4">
        {isEditing && (
          <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-600 rounded-md p-2 text-sm text-amber-800 dark:text-amber-200">
            Editando registro {editingRecord!.ticket ? `Ticket #${editingRecord!.ticket}` : editingRecord!.remesa ? `Remesa #${editingRecord!.remesa}` : `#${editingRecord!.id?.substring(0, 8)}`} — Los campos con datos existentes están deshabilitados
          </div>
        )}
        <div className="bg-blue-600 rounded-md p-3">
          <h3 className={`${sectionTitleClass} bg-transparent p-0`}>1. Información Principal del Viaje</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 px-1">
          <SelectField label="Finca" value={form.finca} onChange={v => updateField("finca", v)} options={fincaOptions} testId="select-remesa-finca" disabled={isLocked("finca")} />
          <div>
            <label className={labelClass}>Código Finca</label>
            <input className={`${disabledInputClass}`} value={form.codigoFinca} readOnly placeholder="(se autocompleta)" data-testid="input-remesa-codigo-finca" />
          </div>
          <div>
            <label className={labelClass}>Nro. Remesa</label>
            <input className={getInputClass("remesa")} value={form.remesa} onChange={e => updateField("remesa", e.target.value)} placeholder="ej: 0982539" disabled={isLocked("remesa")} data-testid="input-remesa-remesa" />
          </div>
          <div>
            <label className={labelClass}>Nro. Boleto de Peso</label>
            <input className={getInputClass("ticket")} value={form.ticket} onChange={e => updateField("ticket", e.target.value)} placeholder="ej: 2798666" disabled={isLocked("ticket")} data-testid="input-remesa-ticket" />
          </div>
          <div>
            <label className={labelClass}>Fecha del Viaje</label>
            <input className={getInputClass("fecha")} value={form.fecha} onChange={e => handleDateInput("fecha", e.target.value)} placeholder="dd/mm/aa" maxLength={8} disabled={isLocked("fecha")} data-testid="input-remesa-fecha" />
          </div>
        </div>

        <div className="bg-green-600 rounded-md p-3">
          <h3 className={`${sectionTitleClass} bg-transparent p-0`}>2. Datos del Vehículo y Conductor</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 px-1">
          <SelectField label="Chofer" value={form.chofer} onChange={v => updateField("chofer", v)} options={choferOptions} testId="select-remesa-chofer" disabled={isLocked("chofer")} />
          <div>
            <label className={labelClass}>Cédula del Chofer</label>
            <input className={disabledInputClass} value={form.cedulaChofer} readOnly placeholder="(se autocompleta)" data-testid="input-remesa-cedula" />
          </div>
          <SelectField label="Placa Camión" value={form.placaCamion} onChange={v => updateField("placaCamion", v)} options={placaOptions} testId="select-remesa-placa-camion" disabled={isLocked("placaCamion")} />
          <SelectField label="Placa Remolque" value={form.placaRemolque} onChange={v => updateField("placaRemolque", v)} options={placaOptions} testId="select-remesa-placa-remolque" disabled={isLocked("placaRemolque")} />
          <SelectField label="Operador" value={form.operador} onChange={v => updateField("operador", v)} options={operadorOptions} testId="select-remesa-operador" disabled={isLocked("operador")} />
          <SelectField label="Remesero" value={form.remesero} onChange={v => updateField("remesero", v)} options={remeseroOptions} testId="select-remesa-remesero" disabled={isLocked("remesero")} />
          <SelectField label="Proveedor" value={form.proveedor} onChange={v => updateField("proveedor", v)} options={proveedorNucleoOptions} testId="select-remesa-proveedor" disabled={isLocked("proveedor")} />
        </div>

        <div className="bg-amber-600 rounded-md p-3">
          <h3 className={`${sectionTitleClass} bg-transparent p-0`}>3. Datos de Peso (Ticket)</h3>
        </div>
        <div className="px-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left text-xs font-semibold p-2 border border-border">Concepto</th>
                <th className="text-right text-xs font-semibold p-2 border border-border">Peso (KGS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-sm p-2 border border-border">Peso Bruto</td>
                <td className="p-1 border border-border">
                  <input className={getInputClass("pesoBruto", "text-right")} type="number" value={form.pesoBruto} onChange={e => updateField("pesoBruto", e.target.value)} placeholder="0" disabled={isLocked("pesoBruto")} data-testid="input-remesa-peso-bruto" />
                </td>
              </tr>
              <tr>
                <td className="text-sm p-2 border border-border">Tara (Peso camión vacío)</td>
                <td className="p-1 border border-border">
                  <input className={getInputClass("tara", "text-right")} type="number" value={form.tara} onChange={e => updateField("tara", e.target.value)} placeholder="0" disabled={isLocked("tara")} data-testid="input-remesa-tara" />
                </td>
              </tr>
              <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold">
                <td className="text-sm p-2 border border-border font-bold">PESO NETO (Caña)</td>
                <td className="text-right text-sm p-2 border border-border font-bold" data-testid="text-peso-neto">
                  {form.pesoNeto ? Number(form.pesoNeto).toLocaleString("es-VE") : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-purple-600 rounded-md p-3">
          <h3 className={`${sectionTitleClass} bg-transparent p-0`}>4. Tiempos y Operatividad</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 px-1">
          <div>
            <label className={labelClass}>Entrada al Central</label>
            <input className={getInputClass("horaEntrada")} value={form.horaEntrada} onChange={e => updateField("horaEntrada", e.target.value)} placeholder="ej: 15:01" disabled={isLocked("horaEntrada")} data-testid="input-remesa-hora-entrada" />
          </div>
          <div>
            <label className={labelClass}>Salida del Central</label>
            <input className={getInputClass("horaSalida")} value={form.horaSalida} onChange={e => updateField("horaSalida", e.target.value)} placeholder="ej: 17:18" disabled={isLocked("horaSalida")} data-testid="input-remesa-hora-salida" />
          </div>
          <div>
            <label className={labelClass}>Fecha de Quema</label>
            <input className={getInputClass("fechaQuema")} value={form.fechaQuema} onChange={e => handleDateInput("fechaQuema", e.target.value)} placeholder="dd/mm/aa" maxLength={8} disabled={isLocked("fechaQuema")} data-testid="input-remesa-fecha-quema" />
          </div>
          <div>
            <label className={labelClass}>Tablón</label>
            <input className={getInputClass("tablon")} value={form.tablon} onChange={e => updateField("tablon", e.target.value)} placeholder="ej: 5" disabled={isLocked("tablon")} data-testid="input-remesa-tablon" />
          </div>
          <SelectField label="Cosecha (modo)" value={form.tipoCosechaModo} onChange={v => updateField("tipoCosechaModo", v)} options={["manual", "mecanizada"]} testId="select-remesa-cosecha-modo" disabled={isLocked("tipoCosechaModo")} />
          <SelectField label="Cosecha (estado)" value={form.tipoCosechaEstado} onChange={v => updateField("tipoCosechaEstado", v)} options={["quema", "verde"]} testId="select-remesa-cosecha-estado" disabled={isLocked("tipoCosechaEstado")} />
          <div>
            <label className={labelClass}>Núcleo Corte</label>
            <input className={getInputClass("nucleoCorte")} value={form.nucleoCorte} onChange={e => updateField("nucleoCorte", e.target.value)} placeholder="ej: 1013" disabled={isLocked("nucleoCorte")} data-testid="input-remesa-nucleo-corte" />
          </div>
          <div>
            <label className={labelClass}>Núcleo Alce</label>
            <input className={getInputClass("nucleoAlce")} value={form.nucleoAlce} onChange={e => updateField("nucleoAlce", e.target.value)} placeholder="ej: 1013" disabled={isLocked("nucleoAlce")} data-testid="input-remesa-nucleo-alce" />
          </div>
          <div>
            <label className={labelClass}>Núcleo Arrime</label>
            <input className={getInputClass("nucleoArrime")} value={form.nucleoArrime} onChange={e => updateField("nucleoArrime", e.target.value)} placeholder="ej: 1013" disabled={isLocked("nucleoArrime")} data-testid="input-remesa-nucleo-arrime" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 pb-4 px-1">
          {isEditing && (
            <MyButtonStyle color="gray" onClick={() => { if (onDoneEditing) onDoneEditing(); onSwitchToTotal(); }} data-testid="button-cancelar-edicion">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </MyButtonStyle>
          )}
          {!isEditing && (
            <MyButtonStyle color="gray" onClick={() => setForm({ ...emptyFormData })} data-testid="button-limpiar-remesa">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </MyButtonStyle>
          )}
          <MyButtonStyle color="green" onClick={handleSendToTotal} loading={isSaving} data-testid="button-enviar-total">
            <Send className="h-4 w-4 mr-1" />
            {isEditing ? "Guardar" : "Enviar a Total"}
          </MyButtonStyle>
        </div>
      </div>
    </div>
  );
}


const centralesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Código", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const fincasNucleoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "costo", label: "Corte", defaultWidth: 100, type: "number", align: "right" },
  { key: "precio", label: "Alce", defaultWidth: 100, type: "number", align: "right" },
  { key: "valor", label: "Arrime", defaultWidth: 100, type: "number", align: "right" },
  { key: "descripcion", label: "Código", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const personalNucleoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "ced_rif", label: "Cédula", defaultWidth: 120, type: "text" },
  { key: "categoria", label: "Cargo", defaultWidth: 120, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const placasNucleoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Proveedor", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const proveedoresNucleoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const subGridColorMap: Record<string, string> = {
  red: "bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20",
  orange: "bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20",
  yellow: "bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20",
  green: "bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20",
  teal: "bg-gradient-to-br from-teal-500/5 to-teal-500/10 border-teal-500/20",
  cyan: "bg-gradient-to-br from-cyan-500/5 to-cyan-500/10 border-cyan-500/20",
  indigo: "bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border-indigo-500/20",
  violet: "bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20",
};

function ParametrosSubGrid({ tipo, columns, tabColor, autoPopulateFrom }: { tipo: string; columns: Column[]; tabColor: string; autoPopulateFrom?: { field: string; extraFields?: Record<string, string> } }) {
  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showPop } = useMyPop();
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => row.tipo === tipo);
  }, [allParametros, tipo]);

  const handleSyncFromArrime = async () => {
    if (!autoPopulateFrom) return;
    setIsSyncing(true);

    try {
      const response = await fetch(`/api/arrime/distinct/${autoPopulateFrom.field}`);
      if (!response.ok) {
        showPop({ title: "error", message: "no se pudieron obtener los datos de arrime" });
        setIsSyncing(false);
        return;
      }
      const distinctValues = await response.json();

      const existingNames = new Set(filteredData.map(r => (r.nombre || "").toString().toLowerCase().trim()));
      const newEntries: Record<string, Record<string, string>> = {};

      if (autoPopulateFrom.field === "placa") {
        for (const item of distinctValues) {
          const val = (item.val || "").toString().toLowerCase().trim();
          if (val && !existingNames.has(val) && !newEntries[val]) {
            const extras: Record<string, string> = {};
            if (autoPopulateFrom.extraFields) {
              for (const [targetCol, sourceCol] of Object.entries(autoPopulateFrom.extraFields)) {
                extras[targetCol] = (item[sourceCol] || "").toString().toLowerCase().trim();
              }
            }
            newEntries[val] = extras;
          }
        }
      } else {
        for (const val of distinctValues) {
          const normalized = (val || "").toString().toLowerCase().trim();
          if (normalized && !existingNames.has(normalized) && !newEntries[normalized]) {
            newEntries[normalized] = {};
          }
        }
      }

      const entries = Object.entries(newEntries);
      if (entries.length === 0) {
        showPop({ title: "sincronizado", message: "no hay registros nuevos para agregar" });
        setIsSyncing(false);
        return;
      }

      const username = getStoredUsername() || "sistema";
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

      let created = 0;
      for (const [nombre, extras] of entries) {
        try {
          const res = await fetch("/api/parametros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre,
              tipo,
              unidad: "",
              habilitado: true,
              propietario,
              _username: username,
              ...extras,
            }),
          });
          if (res.ok) created++;
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      showPop({ title: "sincronizado", message: `se agregaron ${created} registro(s) nuevos` });
    } catch {
      showPop({ title: "error", message: "error al sincronizar datos" });
    }
    setIsSyncing(false);
  };

  const handleSaveNew = async (data: Record<string, any>, onComplete?: (saved: Record<string, any>) => void) => {
    const username = getStoredUsername() || "sistema";
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const record: Record<string, any> = { ...data };
    record.tipo = tipo;
    record.unidad = "";
    record.habilitado = record.habilitado !== undefined ? record.habilitado : true;
    record.propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    record._username = username;

    Object.keys(record).forEach(k => {
      if (typeof record[k] === "string") record[k] = record[k].toLowerCase();
    });

    try {
      const res = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const saved = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
        if (onComplete) onComplete(saved);
      } else {
        showPop({ title: "Error", message: "No se pudo guardar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando: ${row.nombre || "registro"}` });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
  };

  const handleRemove = async (id: string | number) => {
    try {
      const res = await fetch(`/api/parametros/${id}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      } else {
        showPop({ title: "Error", message: "No se pudo eliminar" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleBooleanChange = async (row: Record<string, any>, field: string, value: boolean) => {
    try {
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden border rounded-md ${subGridColorMap[tabColor] || "bg-gradient-to-br from-slate-500/5 to-slate-500/10 border-slate-500/20"}`}>
      {autoPopulateFrom && (
        <div className="flex items-center gap-2 px-2 pt-2">
          <MyButtonStyle color="cyan" onClick={handleSyncFromArrime} loading={isSyncing} disabled={isSyncing} data-testid="button-sync-arrime">
            <RefreshCw className="h-4 w-4 mr-1" />
            Sincronizar desde Arrime
          </MyButtonStyle>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MyGrid
          tableId={`arrime-${tipo}`}
          columns={columns}
          data={filteredData}
          onRowClick={(row) => setSelectedRowId(row.id)}
          selectedRowId={selectedRowId}
          onEdit={handleEdit}
          onSaveNew={handleSaveNew}
          onRefresh={handleRefresh}
          onRemove={handleRemove}
          onBooleanChange={handleBooleanChange}
          onRecordSaved={(record) => setSelectedRowId(record.id)}
          tableName="parametros"
          currentTabName={tipo}
          newRecordDefaults={{ tipo, habilitado: true, unidad: "" }}
        />
      </div>
    </div>
  );
}

interface ArrimeContentProps {
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  onOpenReport?: (filters: ReportFilters) => void;
  centralFilter: string;
}

function ArrimeContent({
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  onOpenReport,
  centralFilter,
}: ArrimeContentProps) {
  const [activeSubTab, setActiveSubTab] = useState<"total" | "remesa" | "nominasemanal" | "parametros">("total");
  const [activeParamTab, setActiveParamTab] = useState<"centrales" | "fincasnucleo" | "personalnucleo" | "placasnucleo" | "proveedoresnucleo">("centrales");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { showPop } = useMyPop();
  const { toast } = useToast();
  const { isAlegre, rainbowEnabled } = useStyleMode();
  const tabClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;

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

  const filteredData = useMemo(() => {
    let result = tableData;

    if (clientDateFilter.start || clientDateFilter.end) {
      result = result.filter((row) => {
        const rowDate = row.fecha;
        if (!rowDate) return false;
        if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
        if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
        return true;
      });
    }

    return result;
  }, [tableData, clientDateFilter]);

  const subTabs = [
    { id: "total" as const, label: "Total", color: "blue" as const, icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: "remesa" as const, label: "Remesa/Ticket", color: "orange" as const, icon: <Weight className="h-3.5 w-3.5" /> },
    { id: "nominasemanal" as const, label: "Nómina Semanal", color: "yellow" as const, icon: <Users className="h-3.5 w-3.5" /> },
    { id: "parametros" as const, label: "Parámetros", color: "green" as const, icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  const paramTabs = [
    { id: "centrales" as const, label: "Centrales", icon: <Factory className="h-3.5 w-3.5" /> },
    { id: "fincasnucleo" as const, label: "Fincas Núcleo", icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: "personalnucleo" as const, label: "Personal Núcleo", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "placasnucleo" as const, label: "Placas Núcleo", icon: <Truck className="h-3.5 w-3.5" /> },
    { id: "proveedoresnucleo" as const, label: "Proveedores Núcleo", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-1 mb-2">
        {subTabs.map(tab => {
          const isActive = activeSubTab === tab.id;
          const effectiveColor = rainbowEnabled ? tab.color : ("slate" as const);
          const cls = tabClasses[effectiveColor];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all animate-flash cursor-pointer select-none ${
                isActive
                  ? `${cls.activeBg} ${cls.border} ${cls.text} ring-2 ring-white scale-105 ${cls.shadow}`
                  : `${cls.bg} ${cls.border} ${cls.text}`
              }`}
              data-testid={`tab-arrime-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === "total" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <MyFilter
              onClearFilters={handleClearFilters}
              onDateChange={onDateChange}
              dateFilter={dateFilter}
              descripcion={descripcionFilter}
              onDescripcionChange={onDescripcionChange}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={onBooleanFilterChange}
              textFilters={textFilters}
              onTextFilterChange={onTextFilterChange}
              selectedRecordDate={selectedRowDate}
              clientDateFilter={clientDateFilter}
            />
          </div>

          <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border-blue-500/20">
            <MyGrid
              tableId="arrime-movimientos"
              tableName="arrime"
              columns={arrimeColumns}
              data={filteredData}
              onRowClick={handleRowClick}
              selectedRowId={selectedRowId}
              onEdit={onEdit}
              onCopy={onCopy}
              onRefresh={onRefresh}
              onRemove={onRemove}
              onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}
              newRecordDefaults={centralFilter && centralFilter !== "all" ? { central: centralFilter } : undefined}
              showCopiar={false}
              onAgregar={() => {
                setEditingRecord(null);
                setActiveSubTab("remesa");
                return false;
              }}
              onEditarOverride={(row) => {
                setEditingRecord(row);
                setActiveSubTab("remesa");
              }}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
              onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
              onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
              dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
              showReportes={true}
              middleButtons={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MyButtonStyle
                      color="cyan"
                      className="text-xs gap-1"
                      onClick={() => {
                        if (!centralFilter) {
                          showPop({ title: "Cargar Arrime", message: "Antes escoja un central" });
                        } else {
                          setImportDialogOpen(true);
                        }
                      }}
                      data-testid="button-cargar-arrime"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Cargar Arrime
                    </MyButtonStyle>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
                    Cargar datos de arrime
                  </TooltipContent>
                </Tooltip>
              }
              onReportes={() => onOpenReport?.({
                sourceModule: "arrime",
                dateRange: dateFilter,
                textFilters: Object.fromEntries(textFilters.filter(f => f.value).map(f => [f.field, f.value])),
                descripcion: descripcionFilter,
                booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
              })}
            />
          </div>

          <ArrimeImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            central={centralFilter}
            onImportComplete={(count) => {
              toast({ title: "Importación completada", description: `Se importaron ${count} registros` });
              onRefresh();
              queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
            }}
          />
        </>
      )}

      {activeSubTab === "remesa" && (
        <div className="flex-1 overflow-hidden border rounded-md bg-gradient-to-br from-orange-500/5 to-amber-500/10 border-orange-500/20">
          <RemesaTicketForm
            centralFilter={centralFilter}
            onSwitchToTotal={() => setActiveSubTab("total")}
            editingRecord={editingRecord}
            onDoneEditing={() => {
              setEditingRecord(null);
              onRefresh();
            }}
          />
        </div>
      )}

      {activeSubTab === "nominasemanal" && (
        <div className="flex-1 overflow-hidden border rounded-md bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
          <NominaSemanalNucleo centralFilter={centralFilter} />
        </div>
      )}

      {activeSubTab === "parametros" && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <MySubTabs
            tabs={paramTabs}
            activeTab={activeParamTab}
            onTabChange={(id) => setActiveParamTab(id as typeof activeParamTab)}
            testIdPrefix="tab-arrime-param"
          >
            {activeParamTab === "centrales" && (
              <ParametrosSubGrid tipo="central" columns={centralesColumns} tabColor={rainbowEnabled ? getSubTabColor(0) : "slate"} />
            )}
            {activeParamTab === "fincasnucleo" && (
              <ParametrosSubGrid tipo="fincasnucleo" columns={fincasNucleoColumns} tabColor={rainbowEnabled ? getSubTabColor(1) : "slate"} autoPopulateFrom={{ field: "finca" }} />
            )}
            {activeParamTab === "personalnucleo" && (
              <ParametrosSubGrid tipo="personaldelnucleo" columns={personalNucleoColumns} tabColor={rainbowEnabled ? getSubTabColor(2) : "slate"} />
            )}
            {activeParamTab === "placasnucleo" && (
              <ParametrosSubGrid tipo="placasnucleo" columns={placasNucleoColumns} tabColor={rainbowEnabled ? getSubTabColor(3) : "slate"} autoPopulateFrom={{ field: "placa", extraFields: { descripcion: "proveedor" } }} />
            )}
            {activeParamTab === "proveedoresnucleo" && (
              <ParametrosSubGrid tipo="proveedoresnucleo" columns={proveedoresNucleoColumns} tabColor={rainbowEnabled ? getSubTabColor(4) : "slate"} />
            )}
          </MySubTabs>
        </div>
      )}
    </div>
  );
}

interface ArrimeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  central: string;
  onImportComplete: (count: number) => void;
}

function ArrimeImportDialog({ open, onOpenChange, central, onImportComplete }: ArrimeImportDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [allParsedData, setAllParsedData] = useState<Record<string, any>[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [duplicateRemesas, setDuplicateRemesas] = useState<Set<string>>(new Set());
  const [totalRecords, setTotalRecords] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showPop } = useMyPop();
  const { toast } = useToast();

  const arrimeFieldMap: Record<string, string> = {
    fecha: "fecha",
    dia: "fecha",
    fechadia: "fecha",
    feriado: "feriado",
    nucleo: "nucleo",
    "cod.": "nucleo",
    "cod": "nucleo",
    azucar: "azucar",
    "tonazucar": "azucar",
    "tonazúcar": "azucar",
    azucarprobable: "azucar",
    finca: "finca",
    "nombrehda": "finca",
    nombrefinca: "finca",
    ruta: "ruta",
    chofer: "chofer",
    fletechofer: "fletechofer",
    fletechofe: "fletechofer",
    flete: "flete",
    remesa: "remesa",
    ticket: "ticket",
    tiket: "ticket",
    boleto: "ticket",
    montochofer: "montochofer",
    montochofe: "montochofer",
    monto: "monto",
    cancelado: "cancelado",
    proveedor: "proveedor",
    "nombredelfrente": "proveedor",
    placa: "placa",
    "camion": "placa",
    "camión": "placa",
    cantidad: "cantidad",
    peso: "cantidad",
    "netoajus.": "cantidad",
    "netoajus": "cantidad",
    "netoajustado": "cantidad",
    cana: "cantidad_kilos",
    utility: "utility",
    descripcion: "descripcion",
    descripcio: "descripcion",
    pagochofer: "pagochofer",
    brix: "brix",
    pol: "pol",
    torta: "torta",
    "%extr": "torta",
    "%extr.": "torta",
    "extr": "torta",
    tablon: "tablon",
    grado: "grado",
    rto: "grado",
    "rto.": "grado",
    rendimiento: "grado",
    propietario: "propietario",
    prop: "propietario",
    central: "central",
    codigofinca: "codigofinca",
    codfinca: "codigofinca",
    "cod.finca": "codigofinca",
    cedulachofer: "cedulachofer",
    cedula: "cedulachofer",
    "ci": "cedulachofer",
    pesobruto: "pesobruto",
    bruto: "pesobruto",
    tara: "tara",
    horaentrada: "horaentrada",
    entrada: "horaentrada",
    horasalida: "horasalida",
    salida: "horasalida",
    fechaquema: "fechaquema",
    quema: "fechaquema",
    tipocosecha: "tipocosecha",
    cosecha: "tipocosecha",
    placaremolque: "placaremolque",
    "placa remolque": "placaremolque",
    remolque: "placaremolque",
    nucleocorte: "nucleocorte",
    nucleoalce: "nucleoalce",
    nucleoarrime: "nucleoarrime",
    operador: "operador",
    remesero: "remesero",
  };

  const normalizeHeader = (h: string): string => {
    return h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  };

  const normalizeRemesa = (val: any): string => {
    return String(val ?? "").trim();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileList = Array.from(selectedFiles);
    setFiles(fileList);
    setIsChecking(true);

    try {
      let combinedData: Record<string, any>[] = [];
      let commonHeaders: string[] = [];

      for (const f of fileList) {
        const data = await f.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });
        if (jsonData.length > 0) {
          if (commonHeaders.length === 0) {
            commonHeaders = Object.keys(jsonData[0]);
          }
          combinedData = combinedData.concat(jsonData);
        }
      }

      if (combinedData.length === 0) {
        showPop({ title: "Error", message: "Los archivos no contienen datos" });
        setFiles([]);
        setIsChecking(false);
        return;
      }

      setHeaders(commonHeaders);
      setAllParsedData(combinedData);
      setTotalRecords(combinedData.length);
      setPreviewData(combinedData.slice(0, 10));

      const remesaHeader = commonHeaders.find(h => {
        const norm = normalizeHeader(h);
        return arrimeFieldMap[norm] === "remesa";
      });

      if (remesaHeader) {
        const allRemesas = Array.from(new Set(
          combinedData
            .map(r => normalizeRemesa(r[remesaHeader]))
            .filter(r => r !== "")
        ));

        if (allRemesas.length > 0) {
          try {
            const resp = await fetch("/api/arrime/check-remesas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ remesas: allRemesas, central }),
            });
            const result = await resp.json();
            const dupes = new Set<string>(result.duplicates || []);
            setDuplicateRemesas(dupes);
            let dupeCount = 0;
            const seenInFile = new Set<string>();
            for (const r of combinedData) {
              const rem = normalizeRemesa(r[remesaHeader]);
              if (!rem) continue;
              if (dupes.has(rem) || seenInFile.has(rem)) {
                dupeCount++;
              } else {
                seenInFile.add(rem);
              }
            }
            setDuplicateCount(dupeCount);
          } catch {
            setDuplicateRemesas(new Set());
            setDuplicateCount(0);
          }
        } else {
          setDuplicateRemesas(new Set());
          setDuplicateCount(0);
        }
      } else {
        setDuplicateRemesas(new Set());
        setDuplicateCount(0);
      }
    } catch (err: any) {
      showPop({ title: "Error", message: `Error al leer archivos: ${err.message}` });
      setFiles([]);
    } finally {
      setIsChecking(false);
    }
  };

  const formatDateValue = (val: any): string => {
    if (!val) return "";
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.slice(0, 10).split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    }
    if (typeof val === "number") {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${String(date.y).slice(-2)}`;
      }
    }
    return str;
  };

  const handleImport = async () => {
    if (files.length === 0 || allParsedData.length === 0) return;
    setIsImporting(true);

    try {
      const remesaHeader = headers.find(h => {
        const norm = normalizeHeader(h);
        return arrimeFieldMap[norm] === "remesa";
      });

      const mappedRecords: Record<string, any>[] = [];
      const seenRemesas = new Set<string>();
      for (const row of allParsedData) {
        if (remesaHeader) {
          const rem = normalizeRemesa(row[remesaHeader]);
          if (rem) {
            if (duplicateRemesas.has(rem) || seenRemesas.has(rem)) continue;
            seenRemesas.add(rem);
          }
        }

        const mapped: Record<string, any> = { central };
        for (const [rawKey, value] of Object.entries(row)) {
          const normalizedKey = normalizeHeader(rawKey);
          const dbField = arrimeFieldMap[normalizedKey];
          if (dbField && dbField !== "central") {
            if (dbField === "fecha") {
              mapped[dbField] = formatDateValue(value);
            } else if (["feriado", "cancelado", "utility", "pagochofer"].includes(dbField)) {
              const v = String(value).toLowerCase().trim();
              mapped[dbField] = v === "true" || v === "1" || v === "si" || v === "yes" || v === ".t.";
            } else if (dbField === "cantidad_kilos") {
              const num = parseFloat(String(value).replace(/,/g, ""));
              const tons = isNaN(num) ? 0 : num / 1000;
              mapped["cantidad"] = String(parseFloat(tons.toFixed(4)));
            } else if (["remesa", "ticket"].includes(dbField)) {
              mapped[dbField] = String(value).trim();
            } else if (["flete", "fletechofer", "montochofer", "monto", "cantidad", "grado", "brix", "pol", "torta", "azucar"].includes(dbField)) {
              const num = parseFloat(String(value).replace(/,/g, ""));
              mapped[dbField] = isNaN(num) ? "0" : String(num);
            } else {
              mapped[dbField] = String(value).trim();
            }
          }
        }
        if (mapped.fecha || mapped.cantidad || mapped.proveedor) {
          mappedRecords.push(mapped);
        }
      }

      if (mappedRecords.length === 0) {
        showPop({ title: "Sin datos", message: "No se encontraron registros nuevos para importar (todos son duplicados o inválidos)" });
        setIsImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: mappedRecords.length });

      const batchSize = 50;
      let imported = 0;
      for (let i = 0; i < mappedRecords.length; i += batchSize) {
        const batch = mappedRecords.slice(i, i + batchSize);
        const response = await fetch("/api/arrime/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: batch }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Error al importar");
        }
        const result = await response.json();
        imported += result.imported || batch.length;
        setImportProgress({ current: imported, total: mappedRecords.length });
      }

      onImportComplete(imported);
      onOpenChange(false);
      setFiles([]);
      setAllParsedData([]);
      setPreviewData([]);
      setHeaders([]);
      setDuplicateRemesas(new Set());
      setDuplicateCount(0);
      setTotalRecords(0);
    } catch (err: any) {
      showPop({ title: "Error de importación", message: err.message || "Error al importar datos" });
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    onOpenChange(false);
    setFiles([]);
    setAllParsedData([]);
    setPreviewData([]);
    setHeaders([]);
    setDuplicateRemesas(new Set());
    setDuplicateCount(0);
    setTotalRecords(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-cyan-800 dark:text-cyan-300" />
            Cargar Arrime desde Excel - Central: {central}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-arrime-file"
            />
            <MyButtonStyle
              color="cyan"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                fileInputRef.current?.click();
              }}
              disabled={isImporting || isChecking}
              data-testid="button-select-arrime-file"
            >
              <Upload className="h-4 w-4 mr-1" />
              Seleccionar archivos
            </MyButtonStyle>
            {files.length > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                {files.length === 1 ? files[0].name : `${files.length} archivos seleccionados`}
              </span>
            )}
            {isChecking && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando duplicados...
              </span>
            )}
          </div>

          {files.length > 1 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {f.name}
                </div>
              ))}
            </div>
          )}

          {duplicateCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md p-3 text-sm">
              <div className="font-medium text-yellow-800 dark:text-yellow-300">
                Se encontraron {duplicateCount} registros duplicados (por remesa)
              </div>
              <div className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                Estos registros ya existen en la base de datos y se omitirán al importar.
                Se importarán {totalRecords - duplicateCount} de {totalRecords} registros.
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="border rounded-md overflow-auto max-h-[40vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-1.5 text-left font-medium border-b">#</th>
                    {headers.map((h) => (
                      <th key={h} className="p-1.5 text-left font-medium border-b whitespace-nowrap">
                        {h}
                        {arrimeFieldMap[normalizeHeader(h)] && (
                          <span className="ml-1 text-cyan-800 dark:text-cyan-300 text-[10px]">
                            → {arrimeFieldMap[normalizeHeader(h)] === "cantidad_kilos" ? "cantidad (kg→ton)" : arrimeFieldMap[normalizeHeader(h)]}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const remesaH = headers.find(h => arrimeFieldMap[normalizeHeader(h)] === "remesa");
                    const previewSeen = new Set<string>();
                    return previewData.map((row, i) => {
                    const normRem = remesaH ? normalizeRemesa(row[remesaH]) : "";
                    let isDupe = normRem ? duplicateRemesas.has(normRem) : false;
                    if (!isDupe && normRem && previewSeen.has(normRem)) isDupe = true;
                    if (normRem) previewSeen.add(normRem);
                    return (
                      <tr key={i} className={`border-b ${isDupe ? "bg-yellow-50 dark:bg-yellow-900/20 line-through opacity-60" : "hover-elevate"}`}>
                        <td className="p-1.5 text-muted-foreground">{i + 1}</td>
                        {headers.map((h) => (
                          <td key={h} className="p-1.5 whitespace-nowrap">{String(row[h] ?? "")}</td>
                        ))}
                      </tr>
                    );
                  });
                  })()}
                </tbody>
              </table>
              <div className="p-2 text-xs text-muted-foreground bg-muted border-t">
                Vista previa de {previewData.length} de {totalRecords} registros totales
                {duplicateCount > 0 && ` (${duplicateCount} duplicados serán omitidos)`}.
                Central "{central}" se asignará automáticamente.
              </div>
            </div>
          )}

          {isImporting && importProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando {importProgress.current} de {importProgress.total} registros...
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-cyan-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <MyButtonStyle color="gray" onClick={handleClose} disabled={isImporting} data-testid="button-cancel-arrime-import">
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={handleImport}
            disabled={files.length === 0 || allParsedData.length === 0 || isImporting || isChecking || (totalRecords - duplicateCount <= 0)}
            loading={isImporting}
            data-testid="button-confirm-arrime-import"
          >
            <Upload className="h-4 w-4 mr-1" />
            {totalRecords - duplicateCount > 0
              ? `Importar ${totalRecords - duplicateCount} registros`
              : "Importar"}
          </MyButtonStyle>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ArrimeProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

export default function Arrime({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: ArrimeProps) {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.ticket || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/arrime/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["tablon", "central", "chofer", "ruta", "finca"], {});

  const { data: distinctNucleo = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/nucleo"] });
  const { data: distinctPlaca = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/placa"] });
  const { data: distinctProveedor = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/proveedor"] });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "proveedor", label: "Proveedor", value: "", options: [] },
    { field: "placa", label: "Placa Camión", value: "", options: [] },
    { field: "nucleo", label: "Nucleo", value: "", options: [] },
    { field: "tablon", label: "Tablon", value: "", options: [] },
    { field: "central", label: "Central", value: "", options: [] },
    { field: "chofer", label: "Chofer", value: "", options: [] },
    { field: "ruta", label: "Ruta", value: "", options: [] },
    { field: "finca", label: "Finca", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "proveedor", label: "Proveedor", value: textFilters.find(f => f.field === "proveedor")?.value || "", options: distinctProveedor },
    { field: "placa", label: "Placa Camión", value: textFilters.find(f => f.field === "placa")?.value || "", options: distinctPlaca },
    { field: "nucleo", label: "Nucleo", value: textFilters.find(f => f.field === "nucleo")?.value || "", options: distinctNucleo },
    { field: "tablon", label: "Tablon", value: textFilters.find(f => f.field === "tablon")?.value || "", options: parametrosOptions.tablon || [] },
    { field: "central", label: "Central", value: textFilters.find(f => f.field === "central")?.value || "", options: parametrosOptions.central || [] },
    { field: "chofer", label: "Chofer", value: textFilters.find(f => f.field === "chofer")?.value || "", options: parametrosOptions.chofer || [] },
    { field: "ruta", label: "Ruta", value: textFilters.find(f => f.field === "ruta")?.value || "", options: parametrosOptions.ruta || [] },
    { field: "finca", label: "Finca", value: textFilters.find(f => f.field === "finca")?.value || "", options: parametrosOptions.finca || [] },
  ], [parametrosOptions, textFilters, distinctNucleo, distinctPlaca, distinctProveedor]);

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
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
    }
  }
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="arrime"
      title="Arrime"
      icon={<Truck className="h-4 w-4 text-blue-800 dark:text-blue-300" />}
      tutorialId="arrime"
      initialPosition={{ x: 220, y: 120 }}
      initialSize={{ width: 1200, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-blue-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/arrime"
    >
      <ArrimeContent
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFiltersWithOptions}
        onTextFilterChange={handleTextFilterChange}
        onOpenReport={handleOpenReport}
        centralFilter={textFilters.find(f => f.field === "central")?.value || ""}
      />
    </MyWindow>
  );
}
