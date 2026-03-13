import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/Untitled_1773245811805.jpg";

const BANCOS_FUENTE = [
  "100% banco",
  "bancamiga",
  "bancaribe",
  "banco activo",
  "banco caroní",
  "banco de la fuerza armada nacional bolivariana",
  "banco de venezuela",
  "banco del tesoro",
  "banco digital de los trabajadores",
  "banco exterior",
  "banco fondo comun",
  "banco nacional de credito",
  "banco plaza",
  "banco sofitasa",
  "banesco",
  "banplus",
  "bbva provincial",
  "delsur",
  "mercantil",
  "venezolano de crédito",
];

const BANCOS_DESTINO = ["bancamiga", "banco de venezuela"];

function getTodayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Step = "bienvenida" | "identificacion" | "pago" | "confirmacion";

interface WisphubInfo {
  saldo: number;
  estado: string;
  facturas: any[];
  id_servicio?: number;
}

export default function Portal() {
  const [step, setStep] = useState<Step>("bienvenida");
  const [fadeClass, setFadeClass] = useState("portal-fade-in");
  const [showClosedMessage, setShowClosedMessage] = useState(false);

  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [nombreSearch, setNombreSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wisphubInfo, setWisphubInfo] = useState<WisphubInfo | null>(null);
  const [wisphubLoading, setWisphubLoading] = useState(false);

  const [bancofuente, setBancofuente] = useState("");
  const [bancodestino, setBancodestino] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [montoInput, setMontoInput] = useState("");
  const [monedaInput, setMonedaInput] = useState<"usd" | "ves">("usd");
  const [tasaDolar, setTasaDolar] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    nuevoSaldo?: number;
    reconectado?: boolean;
    updatedInfo?: WisphubInfo | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const nombreRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: nombres = [] } = useQuery<{ nombre: string }[]>({
    queryKey: ["/api/agrodata/nombres"],
  });

  const filteredNombres = nombreSearch.length >= 1
    ? (() => {
        const term = nombreSearch.toLowerCase();
        const matches = nombres.filter(n => n.nombre?.toLowerCase().includes(term));
        matches.sort((a, b) => {
          const aName = (a.nombre || "").toLowerCase();
          const bName = (b.nombre || "").toLowerCase();
          const aStarts = aName.startsWith(term) ? 0 : 1;
          const bStarts = bName.startsWith(term) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return aName.indexOf(term) - bName.indexOf(term);
        });
        return matches.slice(0, 10);
      })()
    : [];

  useEffect(() => {
    fetch("/api/portal/tasa-dolar")
      .then(r => r.json())
      .then(d => { if (d.tasa) setTasaDolar(d.tasa); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          nombreRef.current && !nombreRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToStep = useCallback((newStep: Step) => {
    setFadeClass("portal-fade-out");
    setTimeout(() => {
      setStep(newStep);
      setErrorMsg("");
      setFadeClass("portal-fade-in");
    }, 300);
  }, []);

  const handleExit = useCallback(() => {
    window.close();
    setTimeout(() => setShowClosedMessage(true), 300);
  }, []);

  const selectNombre = useCallback(async (selectedName: string) => {
    setNombre(selectedName);
    setNombreSearch(selectedName);
    setShowSuggestions(false);
    setWisphubInfo(null);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/agrodata/buscar-cliente?nombre=${encodeURIComponent(selectedName)}`);
      const data = await res.json();
      if (data && data.cedula) setCedula(data.cedula);
      else setCedula("");
    } catch { setCedula(""); }
    setWisphubLoading(true);
    try {
      const wRes = await fetch(`/api/wisphub/estado-cuenta?nombre=${encodeURIComponent(selectedName)}`);
      const wData = await wRes.json();
      if (wData && wData.found) {
        setWisphubInfo({
          saldo: wData.saldo || 0,
          estado: wData.estado || "",
          facturas: wData.facturas || [],
          id_servicio: wData.id_servicio,
        });
      } else {
        setErrorMsg("Cliente no encontrado en WispHub");
      }
    } catch {
      setErrorMsg("Error al consultar WispHub");
    }
    setWisphubLoading(false);
  }, []);

  const montoUSD = monedaInput === "usd"
    ? parseFloat(montoInput) || 0
    : (tasaDolar && tasaDolar > 0 ? (parseFloat(montoInput) || 0) / tasaDolar : 0);

  const montoVES = monedaInput === "ves"
    ? parseFloat(montoInput) || 0
    : (tasaDolar ? (parseFloat(montoInput) || 0) * tasaDolar : 0);

  const handleRegistrarPago = useCallback(async () => {
    if (!wisphubInfo || !wisphubInfo.id_servicio) {
      setErrorMsg("No se encontró el servicio del cliente");
      return;
    }
    if (!bancofuente) { setErrorMsg("Seleccione el banco origen"); return; }
    if (!bancodestino) { setErrorMsg("Seleccione el banco destino"); return; }
    if (!comprobante || !/^\d{4,20}$/.test(comprobante)) {
      setErrorMsg("El comprobante debe tener entre 4 y 20 dígitos");
      return;
    }
    if (montoUSD <= 0) { setErrorMsg("El monto debe ser mayor a 0"); return; }

    try {
      const valRes = await fetch(`/api/portal/validar-duplicado?nombre=${encodeURIComponent(nombre)}&fecha=${getTodayISO()}&comprobante=${encodeURIComponent(comprobante)}&bancodestino=${encodeURIComponent(bancodestino)}`);
      if (!valRes.ok) { setErrorMsg("Error al validar duplicados"); return; }
      const valData = await valRes.json();
      if (valData.comprobanteDuplicado) {
        const quien = valData.comprobanteDuplicadoNombre ? ` (registrado por: ${valData.comprobanteDuplicadoNombre})` : "";
        setErrorMsg(`Ya existe un registro con comprobante ${comprobante} en banco ${bancodestino}${quien}`);
        return;
      }
      if (valData.duplicado) {
        setErrorMsg("Este cliente ya tiene 10 registros en este mes");
        return;
      }
    } catch {
      setErrorMsg("Error al validar duplicados");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    try {
      let factura = wisphubInfo.facturas.find((f: any) => (f.saldo || f.total || 0) > 0);
      if (!factura) {
        try {
          const reRes = await fetch(`/api/wisphub/estado-cuenta?nombre=${encodeURIComponent(nombre)}`);
          const reData = await reRes.json();
          if (reData && reData.found && reData.facturas && reData.facturas.length > 0) {
            setWisphubInfo({ saldo: reData.saldo || 0, estado: reData.estado || "", facturas: reData.facturas, id_servicio: reData.id_servicio });
            factura = reData.facturas.find((f: any) => (f.saldo || f.total || 0) > 0);
          }
        } catch {}
      }
      if (!factura) {
        setErrorMsg("No se encontró factura pendiente");
        setIsProcessing(false);
        return;
      }

      const pagoRes = await fetch("/api/wisphub/registrar-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_factura: factura.id_factura,
          monto: parseFloat(montoUSD.toFixed(2)),
          comentario: `pago movil ${bancofuente} - comprobante ${comprobante}`,
        }),
      });
      const pagoData = await pagoRes.json();

      if (!pagoRes.ok || !pagoData.success) {
        setErrorMsg(pagoData.error || "Error al registrar pago en WispHub");
        setIsProcessing(false);
        return;
      }

      await apiRequest("POST", "/api/portal", {
        fecha: getTodayISO(),
        nombre: nombre.trim().toLowerCase(),
        cedula: cedula.trim().toLowerCase(),
        bancofuente: bancofuente.toLowerCase(),
        bancodestino: bancodestino.toLowerCase(),
        comprobante: comprobante.trim(),
        estado: wisphubInfo.estado?.toLowerCase() || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal"] });

      let reconectado = false;
      let updatedInfo: WisphubInfo | null = null;
      try {
        const wRes = await fetch(`/api/wisphub/estado-cuenta?nombre=${encodeURIComponent(nombre)}`);
        const wData = await wRes.json();
        if (wData && wData.found) {
          updatedInfo = {
            saldo: wData.saldo || 0,
            estado: wData.estado || "",
            facturas: wData.facturas || [],
            id_servicio: wData.id_servicio,
          };
        }
      } catch {}

      const postSaldo = updatedInfo ? updatedInfo.saldo : Math.max(0, (wisphubInfo.saldo || 0) - montoUSD);
      const postEstado = updatedInfo ? updatedInfo.estado : wisphubInfo.estado;
      const estabaSuspendido = (postEstado || "").toLowerCase() !== "activo";

      if (postSaldo <= 0 && estabaSuspendido && wisphubInfo.id_servicio) {
        try {
          const activarRes = await fetch(`/api/wisphub/toggle-servicio/${wisphubInfo.id_servicio}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "activar" }),
          });
          const activarData = await activarRes.json();
          if (activarData.success) {
            reconectado = true;
            if (updatedInfo) updatedInfo.estado = "Activo";
          }
        } catch {}
      }

      setPaymentResult({
        success: true,
        message: "Pago registrado exitosamente",
        nuevoSaldo: postSaldo,
        reconectado,
        updatedInfo,
      });
      goToStep("confirmacion");
    } catch (error: any) {
      setErrorMsg(error.message || "Error al procesar el pago");
    } finally {
      setIsProcessing(false);
    }
  }, [wisphubInfo, bancofuente, bancodestino, comprobante, montoUSD, nombre, cedula, goToStep]);

  if (showClosedMessage) {
    return (
      <div style={closedPageStyle}>
        <div>
          <p style={{ fontSize: "1.25rem", marginBottom: 8 }}>Puedes cerrar esta pestaña manualmente.</p>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>El navegador no permite cerrarla automáticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{fadeCSS}</style>
      <div style={containerStyle} className={fadeClass}>
        {step === "bienvenida" && (
          <StepBienvenida onContinue={() => goToStep("identificacion")} onExit={handleExit} />
        )}
        {step === "identificacion" && (
          <StepIdentificacion
            nombreSearch={nombreSearch}
            setNombreSearch={setNombreSearch}
            nombre={nombre}
            setNombre={setNombre}
            cedula={cedula}
            setCedula={setCedula}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            filteredNombres={filteredNombres}
            selectNombre={selectNombre}
            wisphubInfo={wisphubInfo}
            wisphubLoading={wisphubLoading}
            setWisphubInfo={setWisphubInfo}
            tasaDolar={tasaDolar}
            errorMsg={errorMsg}
            nombreRef={nombreRef}
            suggestionsRef={suggestionsRef}
            onContinue={() => goToStep("pago")}
            onBack={() => goToStep("bienvenida")}
            onExit={handleExit}
          />
        )}
        {step === "pago" && (
          <StepPago
            bancofuente={bancofuente}
            setBancofuente={setBancofuente}
            bancodestino={bancodestino}
            setBancodestino={setBancodestino}
            comprobante={comprobante}
            setComprobante={setComprobante}
            montoInput={montoInput}
            setMontoInput={setMontoInput}
            monedaInput={monedaInput}
            setMonedaInput={setMonedaInput}
            tasaDolar={tasaDolar}
            montoUSD={montoUSD}
            montoVES={montoVES}
            isProcessing={isProcessing}
            errorMsg={errorMsg}
            onRegistrar={handleRegistrarPago}
            onBack={() => goToStep("identificacion")}
            onExit={handleExit}
          />
        )}
        {step === "confirmacion" && (
          <StepConfirmacion
            paymentResult={paymentResult}
            onExit={handleExit}
          />
        )}
      </div>
      <div style={{ textAlign: "center", padding: "16px 0", color: "#334155", fontSize: 11 }}>
        AgroData - Soluciones Empresariales
      </div>
    </div>
  );
}

function StepBienvenida({ onContinue, onExit }: { onContinue: () => void; onExit: () => void }) {
  return (
    <div style={cardStyle}>
      <div style={{ textAlign: "center" }}>
        <img
          src={logoPath}
          alt="AgroData"
          style={{ width: 100, height: 100, objectFit: "contain", margin: "0 auto 16px", display: "block", borderRadius: 16 }}
          data-testid="img-portal-logo"
        />
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px 0" }} data-testid="text-portal-title">
          Portal de Pagos
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px 0" }}>
          Bienvenido, este portal le permite verificar su estado de cuenta y/o realizar un pago.
        </p>
        <p style={{ color: "#cbd5e1", fontSize: 16, fontWeight: 600, marginBottom: 24 }}>
          ¿Desea continuar?
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onContinue} style={btnPrimary} data-testid="button-portal-si-bienvenida">
            Sí, continuar
          </button>
          <button onClick={onExit} style={btnDanger} data-testid="button-portal-no-bienvenida">
            No, salir
          </button>
        </div>
      </div>
    </div>
  );
}

function StepIdentificacion({
  nombreSearch, setNombreSearch, nombre, setNombre, cedula, setCedula,
  showSuggestions, setShowSuggestions, filteredNombres, selectNombre,
  wisphubInfo, wisphubLoading, setWisphubInfo, tasaDolar, errorMsg,
  nombreRef, suggestionsRef, onContinue, onBack, onExit,
}: {
  nombreSearch: string; setNombreSearch: (v: string) => void;
  nombre: string; setNombre: (v: string) => void;
  cedula: string; setCedula: (v: string) => void;
  showSuggestions: boolean; setShowSuggestions: (v: boolean) => void;
  filteredNombres: { nombre: string }[];
  selectNombre: (name: string) => void;
  wisphubInfo: WisphubInfo | null; wisphubLoading: boolean;
  setWisphubInfo: (v: WisphubInfo | null) => void;
  tasaDolar: number | null; errorMsg: string;
  nombreRef: React.RefObject<HTMLInputElement>;
  suggestionsRef: React.RefObject<HTMLDivElement>;
  onContinue: () => void; onBack: () => void; onExit: () => void;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <button onClick={onBack} style={backArrowStyle} data-testid="btn-back-identificacion" title="Volver">&#8592;</button>
        <h2 style={{ ...stepTitle, marginBottom: 0, flex: 1 }}>Identificación del Cliente</h2>
      </div>
      <p style={stepSubtitle}>Ingrese su nombre para verificar su estado de cuenta</p>

      <div style={{ marginBottom: 16, position: "relative" }}>
        <label style={labelStyle}>Nombre</label>
        <input
          ref={nombreRef as any}
          type="text"
          value={nombreSearch}
          onChange={(e) => {
            setNombreSearch(e.target.value);
            setNombre("");
            setCedula("");
            setWisphubInfo(null);
            setShowSuggestions(true);
          }}
          onFocus={() => { if (nombreSearch.length >= 1) setShowSuggestions(true); }}
          placeholder="Escriba su nombre para buscar..."
          data-testid="input-portal-nombre"
          style={inputStyle}
          autoComplete="off"
        />
        {showSuggestions && filteredNombres.length > 0 && (
          <div ref={suggestionsRef as any} style={suggestionsStyle}>
            {filteredNombres.map((n, i) => (
              <div
                key={i}
                onClick={() => selectNombre(n.nombre)}
                data-testid={`option-nombre-${i}`}
                style={suggestionItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {n.nombre}
              </div>
            ))}
          </div>
        )}
      </div>

      {nombre && cedula && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Cédula: </span>
          <span style={{ color: "#e2e8f0", fontSize: 14 }}>{cedula}</span>
        </div>
      )}

      {wisphubLoading && (
        <div style={infoBoxStyle("#3b82f6")} data-testid="text-wisphub-loading">
          <div style={spinnerStyle} />
          <span style={{ color: "#93c5fd", fontSize: 14 }}>Consultando estado de cuenta...</span>
        </div>
      )}

      {wisphubInfo && !wisphubLoading && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            ...infoBoxStyle(wisphubInfo.saldo > 0 ? "#ef4444" : "#22c55e"),
            flexDirection: "column",
            alignItems: "stretch",
          }} data-testid="text-wisphub-info">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Estado: </span>
                <span style={{
                  color: wisphubInfo.estado.toLowerCase() === "activo" ? "#4ade80" : "#f87171",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {wisphubInfo.estado}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Deuda: </span>
                <span style={{ color: wisphubInfo.saldo > 0 ? "#f87171" : "#4ade80", fontSize: 18, fontWeight: 700 }}>
                  ${wisphubInfo.saldo.toFixed(2)}
                </span>
              </div>
            </div>

            {tasaDolar && wisphubInfo.saldo > 0 && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", marginBottom: 12, textAlign: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Equivalente en bolívares: </span>
                <span style={{ color: "#fbbf24", fontSize: 16, fontWeight: 700 }}>
                  Bs. {(wisphubInfo.saldo * tasaDolar).toFixed(2)}
                </span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>(Tasa: {tasaDolar.toFixed(2)})</span>
              </div>
            )}

            {wisphubInfo.saldo > 0 && wisphubInfo.facturas.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Facturas pendientes
                </div>
                {wisphubInfo.facturas.map((f: any, i: number) => (
                  <div key={i} data-testid={`text-factura-${i}`} style={{
                    padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)",
                    marginBottom: i < wisphubInfo.facturas.length - 1 ? 4 : 0,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                        {f.plan || `Factura #${f.id_factura}`}
                      </span>
                      <span style={{ color: "#f87171", fontSize: 14, fontWeight: 700 }}>
                        ${(f.saldo || f.total || 0).toFixed(2)}
                      </span>
                    </div>
                    {f.periodo && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{f.periodo}</div>}
                  </div>
                ))}
              </div>
            )}

            {wisphubInfo.saldo <= 0 && (
              <div style={{ color: "#4ade80", fontSize: 14, textAlign: "center", fontWeight: 600 }}>
                Sin deuda pendiente
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && <div style={errorMsgStyle}>{errorMsg}</div>}

      {wisphubInfo && wisphubInfo.saldo > 0 && (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <p style={{ color: "#cbd5e1", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            ¿Desea realizar un pago móvil?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onContinue} style={btnPrimary} data-testid="button-portal-si-pago">
              Sí, hacer pago
            </button>
            <button onClick={onExit} style={btnDanger} data-testid="button-portal-no-pago">
              No, salir
            </button>
          </div>
        </div>
      )}

      {wisphubInfo && wisphubInfo.saldo <= 0 && (
        <div style={{ textAlign: "center" }}>
          <button onClick={onExit} style={btnSecondary} data-testid="button-portal-salir-sin-deuda">
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

function StepPago({
  bancofuente, setBancofuente, bancodestino, setBancodestino,
  comprobante, setComprobante, montoInput, setMontoInput,
  monedaInput, setMonedaInput, tasaDolar, montoUSD, montoVES,
  isProcessing, errorMsg, onRegistrar, onBack, onExit,
}: {
  bancofuente: string; setBancofuente: (v: string) => void;
  bancodestino: string; setBancodestino: (v: string) => void;
  comprobante: string; setComprobante: (v: string) => void;
  montoInput: string; setMontoInput: (v: string) => void;
  monedaInput: "usd" | "ves"; setMonedaInput: (v: "usd" | "ves") => void;
  tasaDolar: number | null; montoUSD: number; montoVES: number;
  isProcessing: boolean; errorMsg: string;
  onRegistrar: () => void; onBack: () => void; onExit: () => void;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <button onClick={onBack} style={backArrowStyle} data-testid="btn-back-pago" title="Volver">&#8592;</button>
        <h2 style={{ ...stepTitle, marginBottom: 0, flex: 1 }}>Datos del Pago</h2>
      </div>
      <p style={stepSubtitle}>Complete los datos de su pago móvil</p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Banco Origen</label>
        <select
          value={bancofuente}
          onChange={(e) => setBancofuente(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          data-testid="select-portal-bancofuente"
        >
          <option value="" style={optionStyle}>Seleccione banco origen</option>
          {BANCOS_FUENTE.map(b => <option key={b} value={b} style={optionStyle}>{b}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Banco Destino</label>
        <select
          value={bancodestino}
          onChange={(e) => setBancodestino(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          data-testid="select-portal-bancodestino"
        >
          <option value="" style={optionStyle}>Seleccione banco destino</option>
          {BANCOS_DESTINO.map(b => <option key={b} value={b} style={optionStyle}>{b}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Comprobante</label>
        <input
          type="text"
          value={comprobante}
          onChange={(e) => setComprobante(e.target.value.replace(/\D/g, "").slice(0, 20))}
          placeholder="Número de comprobante"
          style={inputStyle}
          data-testid="input-portal-comprobante"
          inputMode="numeric"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Monto</label>
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMonedaInput("usd")}
              style={{
                padding: "8px 14px",
                background: monedaInput === "usd" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
                color: monedaInput === "usd" ? "#93c5fd" : "#64748b",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
              data-testid="button-moneda-usd"
            >
              USD $
            </button>
            <button
              type="button"
              onClick={() => setMonedaInput("ves")}
              style={{
                padding: "8px 14px",
                background: monedaInput === "ves" ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
                color: monedaInput === "ves" ? "#93c5fd" : "#64748b",
                border: "none",
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
              data-testid="button-moneda-ves"
            >
              Bs.
            </button>
          </div>
          <input
            type="text"
            value={montoInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, "");
              setMontoInput(val);
            }}
            placeholder={monedaInput === "usd" ? "Monto en dólares" : "Monto en bolívares"}
            style={{ ...inputStyle, flex: 1 }}
            data-testid="input-portal-monto"
            inputMode="decimal"
          />
        </div>
      </div>

      {montoInput && parseFloat(montoInput) > 0 && (
        <div style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Dólares: </span>
              <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>${montoUSD.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Bolívares: </span>
              <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>Bs. {montoVES.toFixed(2)}</span>
            </div>
          </div>
          {tasaDolar && (
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 4, textAlign: "center" }}>
              Tasa del día: {tasaDolar.toFixed(2)} Bs/$
            </div>
          )}
        </div>
      )}

      {errorMsg && <div style={errorMsgStyle}>{errorMsg}</div>}

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <p style={{ color: "#cbd5e1", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          ¿Desea registrar el pago?
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onRegistrar}
            disabled={isProcessing}
            style={{ ...btnPrimary, opacity: isProcessing ? 0.6 : 1 }}
            data-testid="button-portal-registrar"
          >
            {isProcessing ? "Procesando..." : "Sí, registrar pago"}
          </button>
          <button onClick={onExit} disabled={isProcessing} style={btnDanger} data-testid="button-portal-no-registrar">
            No, salir
          </button>
        </div>
      </div>
    </div>
  );
}

function StepConfirmacion({
  paymentResult, onExit,
}: {
  paymentResult: { success: boolean; message: string; nuevoSaldo?: number; reconectado?: boolean; updatedInfo?: WisphubInfo | null } | null;
  onExit: () => void;
}) {
  if (!paymentResult) return null;

  const info = paymentResult.updatedInfo;

  return (
    <div style={cardStyle}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: paymentResult.success ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: 32,
        }}>
          {paymentResult.success ? "✓" : "✕"}
        </div>

        <h2 style={{ color: paymentResult.success ? "#4ade80" : "#f87171", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {paymentResult.success ? "¡Pago Registrado!" : "Error en el Pago"}
        </h2>

        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
          {paymentResult.message}
        </p>

        {paymentResult.reconectado && (
          <div style={{
            padding: "12px 16px", borderRadius: 10,
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
            color: "#4ade80", fontSize: 14, fontWeight: 600, marginBottom: 16,
          }}>
            ¡Su servicio ha sido reconectado automáticamente!
          </div>
        )}

        {info && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 20, textAlign: "left",
          }}>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Situación Actualizada
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Estado: </span>
                <span style={{
                  color: info.estado.toLowerCase() === "activo" ? "#4ade80" : "#f87171",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {info.estado}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>Saldo: </span>
                <span style={{
                  color: info.saldo > 0 ? "#f87171" : "#4ade80",
                  fontSize: 16, fontWeight: 700,
                }}>
                  ${info.saldo.toFixed(2)}
                </span>
              </div>
            </div>
            {info.facturas.length > 0 && info.saldo > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                {info.facturas.map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)",
                    marginBottom: i < info.facturas.length - 1 ? 4 : 0,
                    display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4,
                  }}>
                    <span style={{ color: "#e2e8f0", fontSize: 12 }}>{f.plan || `Factura #${f.id_factura}`}</span>
                    <span style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>${(f.saldo || f.total || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {info.saldo <= 0 && (
              <div style={{ color: "#4ade80", fontSize: 14, textAlign: "center", fontWeight: 600 }}>
                Cuenta al día - Sin deuda pendiente
              </div>
            )}
          </div>
        )}

        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          ¡Gracias por su pago! Si tiene alguna duda, comuníquese con nosotros.
        </p>

        <button onClick={onExit} style={btnSecondary} data-testid="button-portal-salir-final">
          Salir
        </button>
      </div>
    </div>
  );
}

const fadeCSS = `
  .portal-fade-in {
    animation: portalFadeIn 0.4s ease-out forwards;
  }
  .portal-fade-out {
    animation: portalFadeOut 0.3s ease-in forwards;
  }
  @keyframes portalFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes portalFadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-12px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  fontFamily: "'Inter', sans-serif",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 500,
  width: "100%",
  margin: "0 auto",
  padding: "16px",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: 16,
  padding: "28px 20px",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(8px)",
};

const closedPageStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  background: "#0a0a0a",
  color: "#e5e7eb",
  fontFamily: "sans-serif",
  textAlign: "center",
};

const backArrowStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: 22,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 6,
  lineHeight: 1,
  transition: "color 0.2s, background 0.2s",
};

const stepTitle: React.CSSProperties = {
  color: "#fff",
  fontSize: 20,
  fontWeight: 700,
  margin: "0 0 4px 0",
  textAlign: "center",
};

const stepSubtitle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  margin: "0 0 20px 0",
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const optionStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
};

const suggestionsStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "#1e293b",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  maxHeight: 200,
  overflowY: "auto",
  zIndex: 50,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  marginTop: 4,
};

const suggestionItemStyle: React.CSSProperties = {
  padding: "12px 14px",
  color: "#e2e8f0",
  fontSize: 14,
  cursor: "pointer",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const btnPrimary: React.CSSProperties = {
  padding: "14px 32px",
  borderRadius: 10,
  border: "none",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  background: "#3b82f6",
  color: "#fff",
  minWidth: 140,
  transition: "opacity 0.15s",
};

const btnDanger: React.CSSProperties = {
  padding: "14px 32px",
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.3)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  background: "rgba(239,68,68,0.15)",
  color: "#f87171",
  minWidth: 140,
  transition: "opacity 0.15s",
};

const btnSecondary: React.CSSProperties = {
  padding: "14px 32px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  background: "rgba(255,255,255,0.08)",
  color: "#cbd5e1",
  minWidth: 140,
  transition: "opacity 0.15s",
};

const errorMsgStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  marginBottom: 16,
  background: "rgba(239,68,68,0.12)",
  color: "#f87171",
  fontSize: 14,
  fontWeight: 500,
  border: "1px solid rgba(239,68,68,0.25)",
  textAlign: "center",
};

function infoBoxStyle(color: string): React.CSSProperties {
  return {
    padding: "14px 16px",
    borderRadius: 10,
    background: `${color}11`,
    border: `1px solid ${color}40`,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
}

const spinnerStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: "2px solid rgba(59,130,246,0.2)",
  borderTopColor: "#3b82f6",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  flexShrink: 0,
};
