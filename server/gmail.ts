import nodemailer from 'nodemailer';
import { db } from './db';
import { sql } from 'drizzle-orm';

export interface PagoEmailData {
  proveedor: string;
  correo: string;
  cedRif: string;
  nroFactura: string;
  fechaFactura: string;
  montoDolares: number;
  abonoDolares: number;
  abonoBs: number;
  deudaDolares: number;
  esParcial: boolean;
  unidad: string;
  fecha: string;
  tasaDolar: number;
  banco: string;
  numCuenta: string;
  comprobante: string;
  descripcion: string;
}

async function getGmailCredentials(): Promise<{ email: string; password: string }> {
  const rows = await db.execute(
    sql`SELECT nombre, descripcion FROM parametros WHERE tipo = 'constantes' AND nombre IN ('gmail empresa', 'gmail clave')`
  );
  let email = '';
  let password = '';
  for (const row of rows.rows as any[]) {
    if (row.nombre === 'gmail empresa') email = (row.descripcion || '').trim();
    if (row.nombre === 'gmail clave') password = (row.descripcion || '').trim();
  }
  if (!email) throw new Error('No se encontró el correo en parámetros constantes (gmail empresa)');
  if (!password) throw new Error('No se encontró la clave de aplicación en parámetros constantes (gmail clave)');
  return { email, password };
}

function buildEmailHtml(pago: PagoEmailData): string {
  const tipoPago = pago.esParcial ? 'PAGO PARCIAL' : 'PAGO TOTAL';
  const colorTipo = pago.esParcial ? '#e67e22' : '#27ae60';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #2c3e50; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h2 style="margin: 0;">Comprobante de Pago</h2>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <p style="text-align: center;">
      <span style="background: ${colorTipo}; color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold; font-size: 14px;">
        ${tipoPago}
      </span>
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Proveedor:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.proveedor}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cédula/RIF:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.cedRif}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nro. Factura:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.nroFactura}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha Factura:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.fechaFactura}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Unidad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.unidad}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha de Pago:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pago.fecha}</td></tr>
    </table>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #eef2f7; border-radius: 6px;">
      <tr style="background: #2c3e50; color: white;">
        <th colspan="2" style="padding: 10px; text-align: left;">Datos Bancarios</th>
      </tr>
      ${pago.banco ? `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 40%;">Banco:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${pago.banco}</td></tr>` : ''}
      ${pago.numCuenta ? `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Nro. Cuenta:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${pago.numCuenta}</td></tr>` : ''}
      ${pago.comprobante ? `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Comprobante:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${pago.comprobante}</td></tr>` : ''}
      ${pago.descripcion ? `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Descripción:</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${pago.descripcion}</td></tr>` : ''}
    </table>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #f9f9f9; border-radius: 6px;">
      <tr style="background: #34495e; color: white;">
        <th style="padding: 10px; text-align: left;">Concepto</th>
        <th style="padding: 10px; text-align: right;">Monto</th>
      </tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Monto Factura (USD)</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">$ ${pago.montoDolares.toFixed(2)}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Abono (USD)</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; color: ${colorTipo}; font-weight: bold;">$ ${pago.abonoDolares.toFixed(2)}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Abono (Bs)</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Bs ${pago.abonoBs.toFixed(2)}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Tasa del Dólar</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Bs ${pago.tasaDolar.toFixed(4)}</td></tr>
      ${pago.esParcial ? `<tr><td style="padding: 8px; font-weight: bold;">Deuda Pendiente (USD)</td><td style="padding: 8px; text-align: right; color: #e74c3c; font-weight: bold;">$ ${pago.deudaDolares.toFixed(2)}</td></tr>` : `<tr><td style="padding: 8px; font-weight: bold; color: #27ae60;">FACTURA CANCELADA</td><td style="padding: 8px; text-align: right; color: #27ae60; font-weight: bold;">$ 0.00</td></tr>`}
    </table>
    <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
      Este es un comprobante generado automáticamente. No requiere firma.
    </p>
  </div>
</body>
</html>`;
}

export async function enviarComprobantePago(pago: PagoEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getGmailCredentials();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: creds.email,
        pass: creds.password,
      },
    });

    const tipoPago = pago.esParcial ? 'Pago Parcial' : 'Pago Total';
    const subject = `Comprobante de ${tipoPago} - Factura ${pago.nroFactura} - ${pago.proveedor}`;
    const htmlBody = buildEmailHtml(pago);

    await transporter.sendMail({
      from: creds.email,
      to: pago.correo,
      subject,
      html: htmlBody,
    });

    console.log(`[GMAIL] Comprobante enviado a ${pago.correo} (${pago.proveedor}, factura ${pago.nroFactura})`);
    return { success: true };
  } catch (error: any) {
    console.error(`[GMAIL] Error enviando a ${pago.correo}: ${error.message}`);
    return { success: false, error: error.message };
  }
}
