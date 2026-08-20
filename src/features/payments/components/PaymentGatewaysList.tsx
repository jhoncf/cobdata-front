import {
  Badge,
  Button,
  HStack,
  Skeleton,
  Stack,
  Table,
  Switch,
} from '@chakra-ui/react';
import { EmptyState } from '@/components/common';
import { usePaymentGateways, useUpdatePaymentGateway } from '../hooks';
import type { PaymentGatewaySummary } from '../types';
import { LuCreditCard } from 'react-icons/lu';

// ─── Labels ──────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  BANCO_DO_BRASIL: 'Banco do Brasil',
};

const ENV_LABELS: Record<string, string> = {
  HOMOLOGATION: 'Homologação',
  PRODUCTION: 'Produção',
};

const METHOD_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  BOLEPIX: 'BolePix',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface PaymentGatewaysListProps {
  onEdit: (gateway: PaymentGatewaySummary) => void;
}

export function PaymentGatewaysList({ onEdit }: PaymentGatewaysListProps) {
  const { data: gateways, isLoading } = usePaymentGateways();
  const updateMutation = useUpdatePaymentGateway();

  const handleToggleEnabled = (gateway: PaymentGatewaySummary) => {
    updateMutation.mutate({
      id: gateway.id,
      input: { enabled: !gateway.enabled },
    });
  };

  if (isLoading) {
    return (
      <Stack gap="3">
        <Skeleton height="40px" />
        <Skeleton height="40px" />
        <Skeleton height="40px" />
      </Stack>
    );
  }

  if (!gateways?.length) {
    return (
      <EmptyState
        icon={LuCreditCard}
        title="Nenhum meio de pagamento configurado"
        description="Configure um meio de pagamento para começar a emitir cobranças."
      />
    );
  }

  return (
    <Table.ScrollArea borderWidth="1px" rounded="md">
      <Table.Root size="sm" stickyHeader interactive>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Nome</Table.ColumnHeader>
            <Table.ColumnHeader>Provedor</Table.ColumnHeader>
            <Table.ColumnHeader>Ambiente</Table.ColumnHeader>
            <Table.ColumnHeader>Modalidades</Table.ColumnHeader>
            <Table.ColumnHeader>Credencial</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader width="150px">Ações</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {gateways.map((gateway) => (
            <Table.Row key={gateway.id}>
              <Table.Cell fontWeight="medium">{gateway.name}</Table.Cell>
              <Table.Cell>
                {PROVIDER_LABELS[gateway.providerType] ?? gateway.providerType}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  colorPalette={gateway.environment === 'PRODUCTION' ? 'green' : 'orange'}
                  variant="subtle"
                  size="sm"
                >
                  {ENV_LABELS[gateway.environment] ?? gateway.environment}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <HStack gap="1" flexWrap="wrap">
                  {gateway.supportedMethods.map((method) => (
                    <Badge key={method} variant="outline" size="sm">
                      {METHOD_LABELS[method] ?? method}
                    </Badge>
                  ))}
                </HStack>
              </Table.Cell>
              <Table.Cell>
                {gateway.hasCredentials ? (
                  <Badge colorPalette="green" variant="subtle" size="sm">
                    Configurada
                  </Badge>
                ) : (
                  <Badge colorPalette="gray" variant="subtle" size="sm">
                    Pendente
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <Switch.Root
                  size="sm"
                  checked={gateway.enabled}
                  onCheckedChange={() => handleToggleEnabled(gateway)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onEdit(gateway)}
                >
                  Editar
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
