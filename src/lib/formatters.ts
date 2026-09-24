/**
 * Formats a number as BRL currency.
 * @example formatCurrency(1500) → "R$ 1.500,00"
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formats a CPF string (11 digits) into "123.456.789-01".
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').padStart(11, '0');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formats a CNPJ string (14 numeric or alphanumeric positions) into its
 * official printed mask, e.g. "11.222.333/0001-81" or "12.ABC.345/01DE-35".
 */
export function formatCNPJ(cnpj: string): string {
  const document = cnpj.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (document.length !== 14) return cnpj;
  return `${document.slice(0, 2)}.${document.slice(2, 5)}.${document.slice(5, 8)}/${document.slice(8, 12)}-${document.slice(12, 14)}`;
}

/**
 * Formats a date to "dd/MM/yyyy".
 * @example formatDate("2024-01-15") → "15/01/2024"
 */
export function formatDate(date: string | Date): string {
  // Contract dates (due date, occurrence, birth date and cancellation) are
  // calendar dates. The API serializes them at midnight UTC, but treating that
  // timestamp as an instant shifts the displayed day for Brazilian timezones.
  if (typeof date === 'string') {
    const civilDate = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(date);
    if (civilDate) return `${civilDate[3]}/${civilDate[2]}/${civilDate[1]}`;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a date to "dd/MM/yyyy HH:mm".
 * @example formatDateTime("2024-01-15T14:30:00Z") → "15/01/2024 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Masks a document showing only the last 4 characters.
 * @example maskDocument("12345678901") → "***8901"
 */
export function maskDocument(doc: string): string {
  if (doc.length <= 4) return doc;
  return `***${doc.slice(-4)}`;
}
