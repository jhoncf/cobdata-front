import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  HStack,
  Spinner,
  Stack,
  Table,
  Text,
  Button,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import { useOperationQuery, useOperationItemsQuery } from '../api/useOperationsQuery';
import { useCancelOperationMutation } from '../api/useOperationMutations';
import { StatusBadge, PageHeader, PaginationBar, ConfirmDialog } from '@/components/common';
import { OPERATION_STATUS_LABELS } from '@/lib/constants';
import { OperationStatus } from '@/types/enums';
import { usePermission } from '@/hooks/usePermission';

const ACTION_LABELS: Record<string, string> = {
  CREATE_OR_UPDATE: 'Incluir/Atualizar',
  REMOVE: 'Remover',
};

const CANCELLABLE_STATES: string[] = [
  OperationStatus.PENDING,
  OperationStatus.PROCESSING,
];

export default function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canCreate } = usePermission();
  const [itemsPage, setItemsPage] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: operation, isLoading } = useOperationQuery(id ?? '');
  const { data: itemsData } = useOperationItemsQuery(id ?? '', {
    page: itemsPage,
    limit: 20,
  });

  const cancelMutation = useCancelOperationMutation();

  if (isLoading || !operation) {
    return <Spinner />;
  }

  const canCancel = canCreate && CANCELLABLE_STATES.includes(operation.status);
  const isProcessing = operation.status === OperationStatus.PENDING || operation.status === OperationStatus.PROCESSING;

  return (
    <Stack gap="6">
      <PageHeader title={`Operação: ${ACTION_LABELS[operation.action] ?? operation.action}`}>
        {canCancel && (
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancelar Operação
          </Button>
        )}
      </PageHeader>

      <SimpleGrid columns={{ base: 1, md: 4 }} gap="4">
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Status</Text>
          <HStack mt="1">
            <StatusBadge
              status={operation.status}
              label={OPERATION_STATUS_LABELS[operation.status as OperationStatus] ?? operation.status}
            />
            {isProcessing && <Spinner size="sm" />}
          </HStack>
        </Box>
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Carteira</Text>
          <Text fontWeight="medium">{operation.wallet?.name ?? '-'}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Total Itens</Text>
          <Text fontWeight="bold" fontSize="lg">{operation.totalItems}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Processados / Falhas</Text>
          <Text fontWeight="bold">
            {operation.processedItems} / <Text as="span" color="red.fg">{operation.failedItems}</Text>
          </Text>
        </Box>
      </SimpleGrid>

      {/* Operation items */}
      {itemsData && itemsData.data.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb="3">
            Itens ({itemsData.meta.total})
          </Text>
          <Table.ScrollArea borderWidth="1px" rounded="md">
            <Table.Root size="sm" stickyHeader>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Contrato</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Erro</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {itemsData.data.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.contractId}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={item.status} />
                    </Table.Cell>
                    <Table.Cell>
                      {item.errorCode ? (
                        <Text fontSize="sm" color="red.fg">
                          [{item.errorCode}] {item.errorMessage}
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
          <PaginationBar
            page={itemsPage}
            totalPages={itemsData.meta.totalPages}
            pageSize={20}
            onChange={setItemsPage}
          />
        </Box>
      )}

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancelar operação"
        message="Tem certeza que deseja cancelar esta operação? Itens já processados não serão revertidos."
        confirmLabel="Cancelar Operação"
        colorPalette="red"
        onConfirm={() => {
          cancelMutation.mutate(id!, {
            onSuccess: () => setShowCancelDialog(false),
          });
        }}
        loading={cancelMutation.isPending}
      />
    </Stack>
  );
}
