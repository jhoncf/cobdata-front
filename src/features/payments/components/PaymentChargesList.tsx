import { useState } from 'react';
import {
  Badge,
  Button,
  HStack,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { LuRefreshCw, LuRotateCw } from 'react-icons/lu';
import { EmptyState } from '@/components/common';
import { useChargesByContract, useResyncCharge } from '../hooks';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { SettlementInfo } from './SettlementInfo';
import type { PaymentCharge } from '../types';

// ─── Status labels / colors ──────────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: 'yellow',
  ISSUED: 'blue',
  PAID: 'green',
  CANCELLED: 'gray',
  EXPIRED: 'orange',
  FAILED: 'red',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: 'Pendente',
  ISSUED: 'Emitido',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
  FAILED: 'Falhou',
};

const METHOD_LABEL_MAP: Record<string, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  BOLEPIX: 'BolePix',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface PaymentChargesListProps {
  contractId: string;
}

/**
 * Displays the charge history for a contract (Req 4).
 * Ordered by createdAt DESC. Supports "Atualizar status" and per-charge "Ressincronizar".
 */
export function PaymentChargesList({ contractId }: PaymentChargesListProps) {
  const { data: charges, isLoading, refetch, isRefetching } = useChargesByContract(contractId);
  const resyncMutation = useResyncCharge();
  const { canEdit } = usePermission();
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const handleRefresh = () => {
    refetch();
  };

  const handleResync = (chargeId: string) => {
    setResyncingId(chargeId);
    resyncMutation.mutate(chargeId, {
      onSettled: () => {
        setResyncingId(null);
        refetch();
      },
    });
  };

  if (isLoading) {
    return (
      <Stack gap="3">
        <Skeleton height="36px" />
        <Skeleton height="36px" />
        <Skeleton height="36px" />
      </Stack>
    );
  }

  // Sort by createdAt DESC (Req 4 AC2)
  const sortedCharges = [...(charges ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Stack gap="3">
      {/* Toolbar */}
      <HStack justify="space-between">
        <Text fontWeight="semibold" fontSize="sm">
          Histórico de cobranças ({sortedCharges.length})
        </Text>
        {canEdit && (
          <Button
            size="xs"
            variant="outline"
            onClick={handleRefresh}
            loading={isRefetching}
            aria-label="Atualizar status das cobranças"
          >
            <LuRefreshCw /> Atualizar status
          </Button>
        )}
      </HStack>

      {/* Empty state */}
      {sortedCharges.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança emitida"
          description="Emita uma cobrança para visualizar o histórico aqui."
        />
      ) : (
        <Table.ScrollArea borderWidth="1px" rounded="md">
          <Table.Root size="sm" stickyHeader interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Modalidade</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Valor</Table.ColumnHeader>
                <Table.ColumnHeader>Vencimento</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Data emissão</Table.ColumnHeader>
                <Table.ColumnHeader>Ref. externa</Table.ColumnHeader>
                {canEdit && <Table.ColumnHeader width="120px">Ações</Table.ColumnHeader>}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedCharges.map((charge: PaymentCharge) => (
                <Table.Row key={charge.id}>
                  <Table.Cell>
                    <Badge variant="outline" size="sm">
                      {METHOD_LABEL_MAP[charge.method] ?? charge.method}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="end">{formatCurrency(charge.amount)}</Table.Cell>
                  <Table.Cell>{formatDate(charge.dueDate)}</Table.Cell>
                  <Table.Cell>
                    <Stack gap="1">
                      <Badge
                        colorPalette={STATUS_COLOR_MAP[charge.status] ?? 'gray'}
                        variant="subtle"
                        size="sm"
                      >
                        {STATUS_LABEL_MAP[charge.status] ?? charge.status}
                      </Badge>
                      {(charge.status === 'PAID') && (
                        <SettlementInfo charge={charge} />
                      )}
                    </Stack>
                  </Table.Cell>
                  <Table.Cell fontSize="xs">{formatDateTime(charge.createdAt)}</Table.Cell>
                  <Table.Cell>
                    {charge.externalRef && (
                      <Text fontSize="xs" fontFamily="mono" truncate maxW="120px">
                        {charge.externalRef}
                      </Text>
                    )}
                  </Table.Cell>
                  {canEdit && (
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleResync(charge.id)}
                        loading={resyncingId === charge.id}
                        disabled={resyncingId === charge.id}
                        aria-label="Ressincronizar pagamento"
                      >
                        <LuRotateCw /> Sync
                      </Button>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}
    </Stack>
  );
}
