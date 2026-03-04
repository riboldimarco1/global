import { useState, useEffect, useRef, useCallback } from "react";
import { MyWindow } from "@/components/My";
import { Bot, Send, Plus, Trash2, MessageSquare, Loader2, Database, ChevronLeft, Paperclip, FileSpreadsheet, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sqlQueries?: { query: string; description: string; success?: boolean; rowCount?: number; error?: string; preview?: any[] }[];
}

interface AsistenteIAProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
}

export default function AsistenteIA({ onBack, onLogout, onFocus, zIndex, minimizedIndex }: AsistenteIAProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTables, setUploadedTables] = useState<{ tableName: string; columns: string[] }[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        setUploadedTables(data.uploadedTables || []);
      }
    } catch {}
  }, []);

  const createConversation = async () => {
    try {
      const res = await apiRequest("POST", "/api/conversations", { title: "Nueva conversación" });
      const conv = await res.json();
      setConversations(prev => [conv, ...prev]);
      setActiveConversation(conv.id);
      setMessages([]);
      setUploadedTables([]);
      setShowSidebar(false);
    } catch {}
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation === id) {
        setActiveConversation(null);
        setMessages([]);
        setUploadedTables([]);
      }
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    e.target.value = "";

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/conversations/${activeConversation}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir archivo");
      }

      const data = await res.json();
      setUploadedTables(prev => [...prev, { tableName: data.tableName, columns: data.columns }]);

      const autoMsg = `📎 Cargué el archivo "${data.fileName}" con ${data.rowCount} filas en la tabla "${data.tableName}". Columnas: ${data.columns.join(", ")}. Analiza los datos y dame un resumen.`;
      sendMessage(autoMsg);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error al cargar archivo: ${err.message}` }]);
    } finally {
      setIsUploading(false);
    }
  };

  const selectConversation = (id: number) => {
    setActiveConversation(id);
    loadMessages(id);
    setShowSidebar(false);
  };

  const sendMessage = async (overrideMsg?: string) => {
    const msgToSend = overrideMsg || input.trim();
    if (!msgToSend || isLoading || !activeConversation) return;

    const userMsg = msgToSend;
    if (!overrideMsg) setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    const sqlQueries: ChatMessage["sqlQueries"] = [];
    let assistantContent = "";

    try {
      const res = await fetch(`/api/conversations/${activeConversation}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.content) {
              assistantContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.content = assistantContent;
                  lastMsg.sqlQueries = sqlQueries.length > 0 ? [...sqlQueries] : undefined;
                } else {
                  updated.push({ role: "assistant", content: assistantContent, sqlQueries: sqlQueries.length > 0 ? [...sqlQueries] : undefined });
                }
                return updated;
              });
            }

            if (data.sql) {
              sqlQueries.push({ query: data.sql.query, description: data.sql.description });
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.sqlQueries = [...sqlQueries];
                } else {
                  updated.push({ role: "assistant", content: "", sqlQueries: [...sqlQueries] });
                }
                return updated;
              });
            }

            if (data.sqlResult) {
              const lastQuery = sqlQueries[sqlQueries.length - 1];
              if (lastQuery) {
                lastQuery.success = data.sqlResult.success;
                lastQuery.rowCount = data.sqlResult.rowCount;
                lastQuery.error = data.sqlResult.error;
                lastQuery.preview = data.sqlResult.preview;
              }
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.sqlQueries = [...sqlQueries];
                }
                return updated;
              });
            }

            if (data.error) {
              assistantContent += `\n\nError: ${data.error}`;
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.content = assistantContent;
                } else {
                  updated.push({ role: "assistant", content: assistantContent });
                }
                return updated;
              });
            }
          } catch {}
        }
      }

      if (conversations.length > 0 && conversations[0].id === activeConversation && conversations[0].title === "Nueva conversación" && userMsg.length > 3) {
        const newTitle = userMsg.slice(0, 50) + (userMsg.length > 50 ? "..." : "");
        setConversations(prev => prev.map(c => c.id === activeConversation ? { ...c, title: newTitle } : c));
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportQuery = (query: string) => {
    const url = `/api/conversations/export-query?query=${encodeURIComponent(query)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultados.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const analyzeMovements = () => {
    const tableInfo = uploadedTables.length > 0
      ? `Tengo datos cargados en la tabla "${uploadedTables[uploadedTables.length - 1].tableName}" con columnas: ${uploadedTables[uploadedTables.length - 1].columns.join(", ")}.`
      : `Usa la tabla "bancos" del sistema.`;

    const prompt = `${tableInfo}

Necesito que analices las descripciones de los movimientos bancarios y extraigas información estructurada. Las descripciones bancarias venezolanas usan abreviaciones como:
- "cr.i/ob", "cr.1/ob", "cr.1/08", "cr.i/gd", "cr./" = crédito inmediato / transferencia recibida
- "traspas", "traspaso" = traspaso entre cuentas
- "comis", "comis.", "comes." = comisión bancaria
- "pncpro", "pnclet" = pago nómina proveedor / letra
- "com.em.edo.cta" = comisión emisión estado de cuenta
- "cta." = cuenta
- Los números de 7-10 dígitos (ej: 41261083, 43260678) son cédulas de identidad (V-XXXXXXXX)
- Los que empiezan con J o G seguidos de números son RIF de empresas (J-XXXXXXXXX)

Por favor:
1. Primero consulta las descripciones distintas de la tabla
2. Para cada descripción, extrae: concepto legible en español, cédula/RIF si existe, y cualquier nombre identificable
3. Muestra los resultados como una tabla con: descripcion_original, concepto_legible, cedula_rif, referencia`;

    sendMessage(prompt);
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("```")) {
        const lang = line.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        elements.push(
          <pre key={elements.length} className="bg-black/20 dark:bg-white/10 rounded p-2 my-1 overflow-x-auto text-xs font-mono">
            {lang && <div className="text-[10px] text-muted-foreground mb-1">{lang}</div>}
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        continue;
      }

      if (line.startsWith("### ")) {
        elements.push(<h3 key={elements.length} className="font-bold text-sm mt-2 mb-1">{formatInline(line.slice(4))}</h3>);
      } else if (line.startsWith("## ")) {
        elements.push(<h2 key={elements.length} className="font-bold text-base mt-2 mb-1">{formatInline(line.slice(3))}</h2>);
      } else if (line.startsWith("# ")) {
        elements.push(<h1 key={elements.length} className="font-bold text-lg mt-2 mb-1">{formatInline(line.slice(2))}</h1>);
      } else if (line.startsWith("| ") && line.endsWith(" |")) {
        const tableLines: string[] = [line];
        i++;
        while (i < lines.length && lines[i].startsWith("|")) {
          if (!lines[i].match(/^\|[\s\-:|]+\|$/)) {
            tableLines.push(lines[i]);
          }
          i++;
        }
        const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const rows = tableLines.slice(1).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-1">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h, hi) => <th key={hi} className="px-2 py-1 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50">
                    {row.map((cell, ci) => <td key={ci} className="px-2 py-1">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      } else if (line.match(/^[\-\*] /)) {
        elements.push(<li key={elements.length} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>);
      } else if (line.match(/^\d+\. /)) {
        const match = line.match(/^(\d+)\. (.+)/);
        if (match) {
          elements.push(<li key={elements.length} className="ml-4 list-decimal text-sm">{formatInline(match[2])}</li>);
        }
      } else if (line.trim() === "") {
        elements.push(<div key={elements.length} className="h-1" />);
      } else {
        elements.push(<p key={elements.length} className="text-sm">{formatInline(line)}</p>);
      }
      i++;
    }

    return elements;
  };

  const formatInline = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      let firstMatch: { index: number; length: number; element: JSX.Element } | null = null;

      if (boldMatch && boldMatch.index !== undefined) {
        const candidate = { index: boldMatch.index, length: boldMatch[0].length, element: <strong key={`b${key++}`}>{boldMatch[1]}</strong> };
        if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
      }
      if (codeMatch && codeMatch.index !== undefined) {
        const candidate = { index: codeMatch.index, length: codeMatch[0].length, element: <code key={`c${key++}`} className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs">{codeMatch[1]}</code> };
        if (!firstMatch || candidate.index < firstMatch.index) firstMatch = candidate;
      }

      if (firstMatch) {
        if (firstMatch.index > 0) parts.push(remaining.slice(0, firstMatch.index));
        parts.push(firstMatch.element);
        remaining = remaining.slice(firstMatch.index + firstMatch.length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return parts;
  };

  const isSelectQuery = (query: string) => /^\s*(SELECT|WITH\s)/i.test(query);

  const renderSqlBlock = (sq: NonNullable<ChatMessage["sqlQueries"]>[0], idx: number) => (
    <div key={idx} className="my-1 rounded border border-border/50 bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 text-xs">
        <Database className="h-3 w-3 text-blue-500" />
        <span className="font-medium">{sq.description || "SQL"}</span>
        {sq.success === true && (
          <span className="ml-auto flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400">{sq.rowCount} fila{sq.rowCount !== 1 ? "s" : ""}</span>
            {isSelectQuery(sq.query) && sq.rowCount && sq.rowCount > 0 && (
              <button
                onClick={() => exportQuery(sq.query)}
                className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
                title="Exportar a Excel"
                data-testid={`button-export-sql-${idx}`}
              >
                <Download className="h-3 w-3 text-blue-500" />
              </button>
            )}
          </span>
        )}
        {sq.success === false && <span className="ml-auto text-red-500">{sq.error}</span>}
        {sq.success === undefined && <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <pre className="px-2 py-1 text-[11px] font-mono overflow-x-auto text-muted-foreground">{sq.query}</pre>
      {sq.preview && sq.preview.length > 0 && (
        <div className="overflow-x-auto border-t border-border/50">
          <table className="text-[11px] w-full">
            <thead>
              <tr className="bg-muted/40">
                {Object.keys(sq.preview[0]).map(k => <th key={k} className="px-2 py-0.5 text-left font-medium">{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {sq.preview.map((row, ri) => (
                <tr key={ri} className="border-t border-border/30">
                  {Object.values(row).map((v, ci) => <td key={ci} className="px-2 py-0.5 max-w-[200px] truncate">{String(v ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <MyWindow
      id="asistente"
      title="Asistente IA"
      icon={<Bot className="h-4 w-4" />}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      initialSize={{ width: 700, height: 550 }}
      minSize={{ width: 450, height: 350 }}
    >
      <div className="flex h-full" data-testid="asistente-ia-container">
        {showSidebar && (
          <div className="w-56 border-r border-border flex flex-col bg-muted/20 shrink-0">
            <div className="p-2 border-b border-border">
              <Button
                size="sm"
                className="w-full text-xs gap-1"
                onClick={createConversation}
                data-testid="button-new-conversation"
              >
                <Plus className="h-3 w-3" /> Nueva conversación
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">Sin conversaciones</p>
              )}
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-muted/50 text-xs border-b border-border/30 ${activeConversation === conv.id ? "bg-muted/60" : ""}`}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="h-5 w-5 p-0 opacity-50 hover:opacity-100 hover:text-red-500"
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowSidebar(!showSidebar)}
              data-testid="button-toggle-sidebar"
            >
              <ChevronLeft className={`h-3 w-3 transition-transform ${showSidebar ? "" : "rotate-180"}`} />
            </Button>
            <span className="text-xs text-muted-foreground flex-1 truncate">
              {activeConversation ? conversations.find(c => c.id === activeConversation)?.title || "Conversación" : "Selecciona o crea una conversación"}
            </span>
            {uploadedTables.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <FileSpreadsheet className="h-3 w-3" />
                {uploadedTables.length} tabla{uploadedTables.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!activeConversation && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Bot className="h-12 w-12 opacity-30" />
                <p className="text-sm">Crea una conversación para comenzar</p>
                <Button size="sm" className="text-xs gap-1" onClick={createConversation} data-testid="button-start-chat">
                  <Plus className="h-3 w-3" /> Nueva conversación
                </Button>
              </div>
            )}

            {activeConversation && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Bot className="h-10 w-10 text-emerald-500 opacity-50" />
                <p className="text-sm text-muted-foreground">Acciones rápidas</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  <button
                    onClick={analyzeMovements}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs transition-colors hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950 dark:hover:border-emerald-700"
                    data-testid="button-analyze-movements"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Analizar Movimientos Bancarios</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs transition-colors hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:border-blue-700"
                    data-testid="button-upload-quick"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
                    <span>Cargar Excel/CSV</span>
                  </button>
                </div>
                {uploadedTables.length > 0 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {uploadedTables.length} tabla{uploadedTables.length > 1 ? "s" : ""} cargada{uploadedTables.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-muted/50 border border-border/50"}`} data-testid={`message-${msg.role}-${idx}`}>
                  {msg.sqlQueries?.map((sq, si) => renderSqlBlock(sq, si))}
                  {msg.content && <div className="leading-relaxed">{renderMarkdown(msg.content)}</div>}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeConversation && (
            <div className="p-2 border-t border-border bg-muted/10">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
              <div className="flex gap-1 items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="shrink-0"
                  title="Cargar archivo Excel/CSV"
                  data-testid="button-upload-file"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje... (Enter para enviar)"
                  className="flex-1 resize-none border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px] max-h-[120px]"
                  rows={1}
                  disabled={isLoading}
                  data-testid="input-chat-message"
                />
                <Button
                  size="sm"
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  data-testid="button-send-message"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MyWindow>
  );
}
