import { useState, useEffect, useRef, useCallback } from "react";
import { MyWindow } from "@/components/My";
import { Bot, Send, Plus, Trash2, MessageSquare, Loader2, Database, ChevronLeft, Paperclip, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface ChatMessage {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  sqlQueries?: { query: string; description: string; success?: boolean; rowCount?: number; error?: string; preview?: any[] }[];
}

interface UploadedTable {
  tableName: string;
  columns: string[];
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [uploadedTables, setUploadedTables] = useState<UploadedTable[]>([]);
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

  const selectConversation = (id: number) => {
    setActiveConversation(id);
    loadMessages(id);
    setShowSidebar(false);
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

      setMessages(prev => [...prev, {
        role: "system",
        content: `📎 Archivo cargado: **${data.fileName}** → tabla \`${data.tableName}\`\n${data.rowCount} filas, columnas: ${data.columns.join(", ")}`,
      }]);

      const autoMsg = `Se cargó el archivo "${data.fileName}" con ${data.rowCount} filas en la tabla "${data.tableName}". Las columnas son: ${data.columns.join(", ")}. Dame un resumen del contenido de esta tabla.`;
      setInput("");
      setMessages(prev => [...prev, { role: "user", content: autoMsg }]);
      setIsLoading(true);

      await sendMessageDirect(autoMsg);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "system", content: `Error al cargar archivo: ${err.message}` }]);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessageDirect = async (userMsg: string) => {
    if (!activeConversation) return;

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
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeConversation) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    if (conversations.length > 0 && conversations[0].id === activeConversation && conversations[0].title === "Nueva conversación" && userMsg.length > 3) {
      const newTitle = userMsg.slice(0, 50) + (userMsg.length > 50 ? "..." : "");
      setConversations(prev => prev.map(c => c.id === activeConversation ? { ...c, title: newTitle } : c));
    }

    await sendMessageDirect(userMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  const renderSqlBlock = (sq: NonNullable<ChatMessage["sqlQueries"]>[0], idx: number) => (
    <div key={idx} className="my-1 rounded border border-border/50 bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 text-xs">
        <Database className="h-3 w-3 text-blue-500" />
        <span className="font-medium">{sq.description || "SQL"}</span>
        {sq.success === true && <span className="ml-auto text-emerald-600 dark:text-emerald-400">{sq.rowCount} fila{sq.rowCount !== 1 ? "s" : ""}</span>}
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
                  className={`group flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-muted/50 text-xs border-b border-border/30 ${activeConversation === conv.id ? "bg-muted/60" : ""}`}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500"
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {uploadedTables.length > 0 && (
              <div className="border-t border-border p-2">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Tablas cargadas:</p>
                {uploadedTables.map((t, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground py-0.5">
                    <FileSpreadsheet className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate" title={t.columns.join(", ")}>{t.tableName.replace(/^ai_upload_\d+_/, "")}</span>
                  </div>
                ))}
              </div>
            )}
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

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                {msg.role === "system" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 max-w-[90%]" data-testid={`message-system-${idx}`}>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <div className="leading-relaxed">{renderMarkdown(msg.content)}</div>
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-muted/50 border border-border/50"}`} data-testid={`message-${msg.role}-${idx}`}>
                    {msg.sqlQueries?.map((sq, si) => renderSqlBlock(sq, si))}
                    {msg.content && <div className="leading-relaxed">{renderMarkdown(msg.content)}</div>}
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
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
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="h-[38px] px-2 shrink-0"
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
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="h-[38px] px-3 bg-emerald-600 hover:bg-emerald-700 shrink-0"
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
