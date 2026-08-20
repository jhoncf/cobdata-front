import { Box, Flex, Text } from '@chakra-ui/react';
import type { SearchResultItem as SearchResultItemType } from '../types';
import { highlightMatch } from '../utils/highlightMatch';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SearchResultItemProps {
  item: SearchResultItemType;
  searchTerm: string;
}

// ─── Formatting Utilities ────────────────────────────────────────────────────

/**
 * Formats a 14-digit CNPJ string as XX.XXX.XXX/XXXX-XX.
 * If the input is not exactly 14 digits, returns it as-is.
 */
function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formats a number as BRL currency (e.g., R$ 1.234,56).
 */
function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ─── Renderers by Type ───────────────────────────────────────────────────────

function CreditorItem({ item, searchTerm }: { item: Extract<SearchResultItemType, { type: 'creditor' }>; searchTerm: string }) {
  const formattedCnpj = formatCnpj(item.cnpj);

  return (
    <Box>
      <Text fontSize="sm" truncate>
        {highlightMatch(item.name, searchTerm)}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {highlightMatch(formattedCnpj, searchTerm)}
      </Text>
    </Box>
  );
}

function WalletItem({ item, searchTerm }: { item: Extract<SearchResultItemType, { type: 'wallet' }>; searchTerm: string }) {
  return (
    <Box>
      <Text fontSize="sm" truncate>
        {highlightMatch(item.name, searchTerm)}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {item.creditorName}
      </Text>
    </Box>
  );
}

function ContractItem({ item, searchTerm }: { item: Extract<SearchResultItemType, { type: 'contract' }>; searchTerm: string }) {
  return (
    <Box>
      <Flex justify="space-between" align="center" gap={2}>
        <Text fontSize="sm" truncate>
          {highlightMatch(item.debtorName, searchTerm)}
        </Text>
        <Text fontSize="xs" color="fg.muted" flexShrink={0}>
          #{highlightMatch(item.contractNumber, searchTerm)}
        </Text>
      </Flex>
      <Flex gap={3} mt={0.5}>
        <Text fontSize="xs" color="fg.muted">
          Original: {formatBrl(item.originalValue)}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          Atualizado: {formatBrl(item.updatedValue)}
        </Text>
      </Flex>
      <Text fontSize="xs" color="fg.muted">
        {item.creditorName}
      </Text>
    </Box>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SearchResultItem({ item, searchTerm }: SearchResultItemProps) {
  switch (item.type) {
    case 'creditor':
      return <CreditorItem item={item} searchTerm={searchTerm} />;
    case 'wallet':
      return <WalletItem item={item} searchTerm={searchTerm} />;
    case 'contract':
      return <ContractItem item={item} searchTerm={searchTerm} />;
  }
}
