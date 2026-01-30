export interface BancoRecord {
  id: string;
  fecha: string;
  monto?: number | null;
  operador?: string | null;
  conciliado?: boolean | null;
  saldo?: number | null;
  saldo_conciliado?: number | null;
  created_at?: Date | string | null;
  banco?: string | null;
  [key: string]: unknown;
}

function parseFecha(fecha: string | null | undefined): Date {
  if (!fecha) return new Date(0);
  const parts = fecha.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  return new Date(fecha);
}

function sortBancoRecords<T extends BancoRecord>(registros: T[]): T[] {
  return [...registros].sort((a, b) => {
    const fechaA = parseFecha(a.fecha);
    const fechaB = parseFecha(b.fecha);
    const fechaCompare = fechaA.getTime() - fechaB.getTime();
    if (fechaCompare !== 0) return fechaCompare;

    const createdA = a.created_at;
    const createdB = b.created_at;
    if (createdA === null || createdA === undefined) {
      if (createdB !== null && createdB !== undefined) return -1;
    } else if (createdB === null || createdB === undefined) {
      return 1;
    } else {
      const timeA = new Date(createdA).getTime();
      const timeB = new Date(createdB).getTime();
      if (timeA !== timeB) return timeA - timeB;
    }

    const idA = a.id || '';
    const idB = b.id || '';
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });
}

export function calcularSaldosBanco<T extends BancoRecord>(registros: T[]): T[] {
  const sorted = sortBancoRecords(registros);

  let saldoAcumulado = 0;
  let saldoConciliadoAcumulado = 0;

  const resultMap = new Map<string, T>();

  for (const registro of sorted) {
    const operador = registro.operador || "suma";
    const monto = Number(registro.monto) || 0;
    const estaConciliado = registro.conciliado === true;

    if (operador === "suma") {
      saldoAcumulado += monto;
      if (estaConciliado) {
        saldoConciliadoAcumulado += monto;
      }
    } else {
      saldoAcumulado -= monto;
      if (estaConciliado) {
        saldoConciliadoAcumulado -= monto;
      }
    }

    resultMap.set(registro.id, {
      ...registro,
      saldo: saldoAcumulado,
      saldo_conciliado: saldoConciliadoAcumulado
    });
  }

  return registros.map(r => resultMap.get(r.id) || r);
}

export function recalcularSaldosPorBanco<T extends BancoRecord>(
  todosLosRegistros: T[],
  bancoNombre: string
): T[] {
  const registrosBanco = todosLosRegistros.filter(r => r.banco === bancoNombre);
  const actualizados = calcularSaldosBanco(registrosBanco);
  const actualizadosMap = new Map(actualizados.map(r => [r.id, r]));
  
  return todosLosRegistros.map(r => actualizadosMap.get(r.id) || r);
}

export function recalcularTodosLosSaldos<T extends BancoRecord>(registros: T[]): T[] {
  const bancos = Array.from(new Set(registros.map(r => r.banco).filter(Boolean))) as string[];
  
  const actualizadosMap = new Map<string, T>();
  
  for (const banco of bancos) {
    const registrosBanco = registros.filter(r => r.banco === banco);
    const actualizados = calcularSaldosBanco(registrosBanco);
    for (const r of actualizados) {
      actualizadosMap.set(r.id, r);
    }
  }
  
  return registros.map(r => actualizadosMap.get(r.id) || r);
}
