import { Badge, HStack, Text } from '@chakra-ui/react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PaymentCharge } from '../types';

interface SettlementInfoProps {
  charge: PaymentCharge;
}

/**
 * Displays settlement information when a charge is PAID.
 * Shows paid amount, date, and distinguishes partial vs full settlement (Req 4 AC6).
 */
export function SettlementInfo({ charge }: SettlementInfoProps) {
  if (!charge.paidAmount || !charge.settlementDate) return null;

  const isFullSettlement = charge.paidAmount >= charge.amount;

  return (
    <HStack gap="2" flexWrap="wrap">
      <Badge
        colorPalette={isFullSettlement ? 'green' : 'yellow'}
        variant="subtle"
        size="sm"
      >
        {isFullSettlement ? 'Quitação total' : 'Pagamento parcial'}
      </Badge>
      <Text fontSize="xs" color="fg.muted">
        Pago: {formatCurrency(charge.paidAmount)}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        em {formatDate(charge.settlementDate)}
      </Text>
    </HStack>
  );
}
