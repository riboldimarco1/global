import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface PortalRecord {
  id: string;
  fecha: string | null;
  nombre: string | null;
  cedula: string | null;
  banco: string | null;
  comprobante: string | null;
}

function getTodayFormatted() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aa = String(now.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

function formatDateForDB(ddmmaa: string) {
  const parts = ddmmaa.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, aa] = parts;
  const yyyy = parseInt(aa) > 50 ? `19${aa}` : `20${aa}`;
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
  const [fecha, setFecha] = useState(getTodayFormatted());
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [banco, setBanco] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: records = [], isLoading } = useQuery<PortalRecord[]>({
    queryKey: ["/api/portal"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/portal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal"] });
      clearForm();
      showMessage("Registro guardado correctamente", "success");
    },
    onError: () => showMessage("Error al guardar el registro", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await apiRequest("PUT", `/api/portal/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal"] });
      clearForm();
      showMessage("Registro actualizado correctamente", "success");
    },
    onError: () => showMessage("Error al actualizar el registro", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/portal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal"] });
      if (editingId) clearForm();
      showMessage("Registro eliminado", "success");
    },
    onError: () => showMessage("Error al eliminar el registro", "error"),
  });

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function clearForm() {
    setFecha(getTodayFormatted());
    setNombre("");
    setCedula("");
    setBanco("");
    setComprobante("");
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      showMessage("El nombre es obligatorio", "error");
      return;
    }
    const data = {
      fecha: formatDateForDB(fecha),
      nombre: nombre.trim().toLowerCase(),
      cedula: cedula.trim().toLowerCase(),
      banco: banco.trim().toLowerCase(),
      comprobante: comprobante.trim().toLowerCase(),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleEdit(record: PortalRecord) {
    setEditingId(record.id);
    setFecha(formatDateForDisplay(record.fecha));
    setNombre(record.nombre || "");
    setCedula(record.cedula || "");
    setBanco(record.banco || "");
    setComprobante(record.comprobante || "");
  }

  function handleDelete(id: string) {
    if (confirm("¿Está seguro de eliminar este registro?")) {
      deleteMutation.mutate(id);
    }
  }

  function handleFechaChange(value: string) {
    const cleaned = value.replace(/[^\d/]/g, "");
    const digits = cleaned.replace(/\//g, "");
    if (digits.length <= 6) {
      let formatted = "";
      for (let i = 0; i < digits.length; i++) {
        if (i === 2 || i === 4) formatted += "/";
        formatted += digits[i];
      }
      setFecha(formatted);
    }
  }

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.nombre || "").toLowerCase().includes(term) ||
      (r.cedula || "").toLowerCase().includes(term) ||
      (r.banco || "").toLowerCase().includes(term) ||
      (r.comprobante || "").toLowerCase().includes(term)
    );
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #0f1f3d 100%)", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0 }} data-testid="text-portal-title">
            Portal de Pagos
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>Registro de comprobantes de pago</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: "rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Fecha</label>
              <input
                type="text"
                value={fecha}
                onChange={(e) => handleFechaChange(e.target.value)}
                placeholder="dd/mm/aa"
                maxLength={8}
                data-testid="input-portal-fecha"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                data-testid="input-portal-nombre"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Cédula</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Cédula de identidad"
                data-testid="input-portal-cedula"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Banco</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Nombre del banco"
                data-testid="input-portal-banco"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Comprobante</label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="Número de comprobante"
                data-testid="input-portal-comprobante"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                data-testid="button-portal-cancel"
                style={{ ...btnStyle, background: "#475569", color: "#fff" }}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              data-testid="button-portal-save"
              style={{ ...btnStyle, background: editingId ? "#f59e0b" : "#3b82f6", color: "#fff", opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>

        {message && (
          <div
            data-testid="text-portal-message"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              marginBottom: 16,
              background: message.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: message.type === "success" ? "#4ade80" : "#f87171",
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>
              {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              data-testid="input-portal-search"
              style={{ ...inputStyle, width: 200, fontSize: 12, padding: "6px 10px" }}
            />
          </div>

          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Cargando...</div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No hay registros</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Fecha", "Nombre", "Cédula", "Banco", "Comprobante", ""].map((h, i) => (
                      <th key={i} style={{ padding: "10px 12px", textAlign: "left", color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      data-testid={`row-portal-${r.id}`}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={cellStyle}>{formatDateForDisplay(r.fecha)}</td>
                      <td style={cellStyle}>{r.nombre || ""}</td>
                      <td style={cellStyle}>{r.cedula || ""}</td>
                      <td style={cellStyle}>{r.banco || ""}</td>
                      <td style={cellStyle}>{r.comprobante || ""}</td>
                      <td style={{ ...cellStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => handleEdit(r)}
                          data-testid={`button-edit-portal-${r.id}`}
                          style={{ ...smallBtnStyle, color: "#60a5fa", borderColor: "rgba(96,165,250,0.3)" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          data-testid={`button-delete-portal-${r.id}`}
                          style={{ ...smallBtnStyle, color: "#f87171", borderColor: "rgba(248,113,113,0.3)", marginLeft: 6 }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid",
  background: "transparent",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

const cellStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "#cbd5e1",
  fontSize: 13,
};
