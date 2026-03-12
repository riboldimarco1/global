import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/Untitled_1773245811805.jpg";

interface PortalRecord {
  id: string;
  fecha: string | null;
  nombre: string | null;
  cedula: string | null;
  bancofuente: string | null;
  bancodestino: string | null;
  comprobante: string | null;
}

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

function formatDateForDisplay(isoDate: string | null) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy.slice(-2)}`;
}

export default function Portal() {
  const [fecha, setFecha] = useState(getTodayISO());
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [bancofuente, setBancofuente] = useState("");
  const [bancodestino, setBancodestino] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [nombreSearch, setNombreSearch] = useState("");
  const [showClosedMessage, setShowClosedMessage] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wisphubInfo, setWisphubInfo] = useState<{ saldo: number; estado: string; facturas: any[] } | null>(null);
  const [wisphubLoading, setWisphubLoading] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: nombres = [] } = useQuery<{ nombre: string }[]>({
    queryKey: ["/api/agrodata/nombres"],
  });

  const { data: rawPortalData, isLoading } = useQuery<any>({
    queryKey: ["/api/portal"],
  });
  const records: PortalRecord[] = Array.isArray(rawPortalData) ? rawPortalData : (rawPortalData?.data || []);

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

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/portal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal"] });
      clearForm();
      showMessage("Comprobante registrado correctamente", "success");
    },
    onError: () => showMessage("Error al guardar el registro", "error"),
  });

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

  const selectNombre = useCallback(async (selectedName: string) => {
    setNombre(selectedName);
    setNombreSearch(selectedName);
    setShowSuggestions(false);
    setWisphubInfo(null);
    try {
      const res = await fetch(`/api/agrodata/buscar-cliente?nombre=${encodeURIComponent(selectedName)}`);
      const data = await res.json();
      if (data && data.cedula) {
        setCedula(data.cedula);
      } else {
        setCedula("");
      }
    } catch {
      setCedula("");
    }
    setWisphubLoading(true);
    try {
      const wRes = await fetch(`/api/wisphub/estado-cuenta?nombre=${encodeURIComponent(selectedName)}`);
      const wData = await wRes.json();
      if (wData && wData.found) {
        setWisphubInfo({
          saldo: wData.saldo || 0,
          estado: wData.estado || "",
          facturas: wData.facturas || [],
        });
      }
    } catch {
    }
    setWisphubLoading(false);
  }, []);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }

  function clearForm() {
    setFecha(getTodayISO());
    setNombre("");
    setNombreSearch("");
    setCedula("");
    setBancofuente("");
    setBancodestino("");
    setComprobante("");
    setWisphubInfo(null);
    setWisphubLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      showMessage("Debe seleccionar un nombre de la lista", "error");
      return;
    }
    if (!bancofuente) {
      showMessage("Debe seleccionar un banco fuente", "error");
      return;
    }
    if (!bancodestino) {
      showMessage("Debe seleccionar un banco destino", "error");
      return;
    }
    if (!/^\d{6}$/.test(comprobante)) {
      showMessage("El comprobante debe tener exactamente 6 dígitos numéricos", "error");
      return;
    }

    try {
      const res = await fetch(`/api/portal/validar-duplicado?nombre=${encodeURIComponent(nombre)}&fecha=${fecha}&comprobante=${encodeURIComponent(comprobante)}&bancodestino=${encodeURIComponent(bancodestino)}`);
      const data = await res.json();
      if (data.comprobanteDuplicado) {
        const quien = data.comprobanteDuplicadoNombre ? ` (registrado por: ${data.comprobanteDuplicadoNombre})` : "";
        showMessage(`Ya existe un registro con comprobante ${comprobante} en banco ${bancodestino}${quien}. No se permite duplicar.`, "error");
        return;
      }
      if (data.duplicado) {
        showMessage("Este cliente ya tiene 2 registros en este mes. No se permite agregar más.", "error");
        return;
      }
    } catch {
      showMessage("Error al validar. Intente de nuevo.", "error");
      return;
    }

    createMutation.mutate({
      fecha,
      nombre: nombre.trim().toLowerCase(),
      cedula: cedula.trim().toLowerCase(),
      bancofuente: bancofuente.toLowerCase(),
      bancodestino: bancodestino.toLowerCase(),
      comprobante: comprobante.trim(),
    });
  }

  const filteredRecords = nombre
    ? records.filter(r => (r.nombre || "").toLowerCase() === nombre.toLowerCase())
    : [];

  const isPending = createMutation.isPending;

  if (showClosedMessage) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "sans-serif", textAlign: "center" }}>
        <div>
          <p style={{ fontSize: "1.25rem", marginBottom: 8 }}>Puedes cerrar esta pestaña manualmente.</p>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>El navegador no permite cerrarla automáticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={logoPath}
            alt="AgroData"
            style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto 12px", display: "block", borderRadius: 16 }}
            data-testid="img-portal-logo"
          />
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }} data-testid="text-portal-title">
            Portal de Pagos
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Registro de comprobantes de pago</p>
        </div>

        {message && (
          <div
            data-testid="text-portal-message"
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              marginBottom: 16,
              background: message.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: message.type === "success" ? "#4ade80" : "#f87171",
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              textAlign: "center",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          padding: 24,
          marginBottom: 24,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <div style={{ display: "flex", gap: 0, position: "relative" }}>
                <input
                  type="text"
                  value={formatDateForDisplay(fecha)}
                  readOnly
                  data-testid="input-portal-fecha"
                  style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, cursor: "pointer" }}
                  onClick={() => dateRef.current?.showPicker()}
                />
                <button
                  type="button"
                  onClick={() => dateRef.current?.showPicker()}
                  style={{ padding: "0 10px", background: "rgba(59,130,246,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderLeft: "none", borderTopRightRadius: 8, borderBottomRightRadius: 8, color: "#93c5fd", cursor: "pointer", fontSize: 16 }}
                  data-testid="button-portal-calendar"
                >
                  &#128197;
                </button>
                <input
                  ref={dateRef}
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  tabIndex={-1}
                />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Nombre *</label>
              <input
                ref={nombreRef}
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
                placeholder="Escriba para buscar..."
                data-testid="input-portal-nombre"
                style={inputStyle}
                autoComplete="off"
              />
              {showSuggestions && filteredNombres.length > 0 && (
                <div
                  ref={suggestionsRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#1e293b",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: "auto",
                    zIndex: 50,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {filteredNombres.map((n, i) => (
                    <div
                      key={i}
                      onClick={() => selectNombre(n.nombre)}
                      data-testid={`option-nombre-${i}`}
                      style={{
                        padding: "8px 12px",
                        color: "#e2e8f0",
                        fontSize: 13,
                        cursor: "pointer",
                        borderBottom: i < filteredNombres.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {n.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Cédula</label>
              <input
                type="text"
                value={cedula}
                readOnly
                data-testid="input-portal-cedula"
                style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            {nombre && (
              <div style={{ gridColumn: "1 / -1" }}>
                {wisphubLoading ? (
                  <div data-testid="text-wisphub-loading" style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    color: "#93c5fd",
                    fontSize: 13,
                    textAlign: "center",
                  }}>
                    Consultando estado de cuenta...
                  </div>
                ) : wisphubInfo ? (
                  <div data-testid="text-wisphub-info" style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: wisphubInfo.saldo > 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                    border: `1px solid ${wisphubInfo.saldo > 0 ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: wisphubInfo.facturas.length > 0 ? 10 : 0 }}>
                      <div>
                        <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Estado: </span>
                        <span style={{
                          color: wisphubInfo.estado === "Activo" ? "#4ade80" : "#f87171",
                          fontSize: 13,
                          fontWeight: 600,
                        }}>
                          {wisphubInfo.estado}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Saldo pendiente: </span>
                        <span style={{
                          color: wisphubInfo.saldo > 0 ? "#f87171" : "#4ade80",
                          fontSize: 15,
                          fontWeight: 700,
                        }}>
                          ${wisphubInfo.saldo.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {wisphubInfo.saldo > 0 && wisphubInfo.facturas.length > 0 ? (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                        <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Facturas pendientes
                        </div>
                        {wisphubInfo.facturas.map((f: any, i: number) => (
                          <div key={i} data-testid={`text-factura-${i}`} style={{
                            padding: "8px 10px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.04)",
                            marginBottom: i < wisphubInfo.facturas.length - 1 ? 4 : 0,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                {f.plan || `Factura #${f.id_factura}`}
                              </span>
                              <span style={{ color: "#f87171", fontSize: 14, fontWeight: 700 }}>
                                ${(f.saldo || f.total || 0).toFixed(2)}
                              </span>
                            </div>
                            {f.periodo && (
                              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                                {f.periodo}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#4ade80", fontSize: 13, textAlign: "center" }}>
                        Sin deuda pendiente
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <label style={labelStyle}>Banco Fuente *</label>
              <select
                value={bancofuente}
                onChange={(e) => setBancofuente(e.target.value)}
                data-testid="select-portal-bancofuente"
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              >
                <option value="" style={{ background: "#1e293b", color: "#e2e8f0" }}>Seleccione banco fuente</option>
                {BANCOS_FUENTE.map(b => (
                  <option key={b} value={b} style={{ background: "#1e293b", color: "#e2e8f0" }}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Banco Destino *</label>
              <select
                value={bancodestino}
                onChange={(e) => setBancodestino(e.target.value)}
                data-testid="select-portal-bancodestino"
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              >
                <option value="" style={{ background: "#1e293b", color: "#e2e8f0" }}>Seleccione banco destino</option>
                {BANCOS_DESTINO.map(b => (
                  <option key={b} value={b} style={{ background: "#1e293b", color: "#e2e8f0" }}>{b}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Comprobante * (6 dígitos)</label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setComprobante(val);
                }}
                placeholder="Ej: 123456"
                maxLength={6}
                data-testid="input-portal-comprobante"
                style={{ ...inputStyle, maxWidth: 200 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={clearForm}
              style={{ ...btnStyle, background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
              data-testid="button-portal-clear"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={isPending}
              data-testid="button-portal-save"
              style={{ ...btnStyle, background: "#3b82f6", color: "#fff", opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? "Guardando..." : "Registrar Pago"}
            </button>
          </div>
        </form>

        <div style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 600 }}>
              Registros de: {nombre ? <span style={{ color: "#93c5fd" }}>{nombre}</span> : <span style={{ fontStyle: "italic" }}>seleccione un nombre arriba</span>}
            </span>
            {nombre && <span style={{ color: "#64748b", fontSize: 12 }}>{filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}</span>}
          </div>

          {!nombre ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
              Seleccione un nombre arriba para ver sus registros
            </div>
          ) : isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Cargando...</div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
              No se encontraron registros para este nombre
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Fecha", "Nombre", "Cédula", "Banco Fuente", "Banco Destino", "Comprobante"].map((h, i) => (
                      <th key={i} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      data-testid={`row-portal-${r.id}`}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={cellStyle}>{formatDateForDisplay(r.fecha)}</td>
                      <td style={cellStyle}>{r.nombre || ""}</td>
                      <td style={cellStyle}>{r.cedula || ""}</td>
                      <td style={cellStyle}>{r.bancofuente || ""}</td>
                      <td style={cellStyle}>{r.bancodestino || ""}</td>
                      <td style={cellStyle}>{r.comprobante || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => {
              window.close();
              setTimeout(() => {
                setShowClosedMessage(true);
              }, 300);
            }}
            data-testid="button-portal-salir"
            style={{ ...btnStyle, background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 12 }}
          >
            Salir
          </button>
          <div style={{ color: "#334155", fontSize: 11 }}>
            AgroData - Soluciones Empresariales
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 600,
  display: "block",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const cellStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "#cbd5e1",
  fontSize: 13,
};
