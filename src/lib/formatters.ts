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
 * Formats a CNPJ string (14 digits) into "11.222.333/0001-81".
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '').padStart(14, '0');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formats a date to "dd/MM/yyyy".
 * @example formatDate("2024-01-15") → "15/01/2024"
 */
export function formatDate(date: string | Date): string {
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
