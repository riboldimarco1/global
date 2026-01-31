const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function enviarTelegram(mensaje: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Telegram no configurado: faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: "HTML"
      })
    });

    if (response.ok) {
      console.log("Mensaje enviado a Telegram");
      return true;
    } else {
      const data = await response.json();
      console.error("Error de Telegram:", data);
      return false;
    }
  } catch (error) {
    console.error("Error enviando a Telegram:", error);
    return false;
  }
}

export async function notificarError(error: Error | string, contexto?: string): Promise<void> {
  const mensaje = escapeHtml(typeof error === "string" ? error : error.message);
  const stack = typeof error === "object" && error.stack 
    ? `\n\n<pre>${escapeHtml(error.stack.slice(0, 500))}</pre>` 
    : "";
  
  const texto = `⚠️ <b>Error en el Sistema</b>

${contexto ? `<b>Contexto:</b> ${escapeHtml(contexto)}\n` : ""}<b>Error:</b> ${mensaje}${stack}

<i>Fecha: ${new Date().toLocaleString("es-VE")}</i>`;

  await enviarTelegram(texto);
}
