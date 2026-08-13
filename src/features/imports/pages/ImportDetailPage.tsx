import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  HStack,
  Spinner,
  Stack,
  Table,
  Text,
  Badge,
  Button,
  SimpleGrid,
} from '@chakra-ui/react';
import { useImportBatchQuery, useImportErrorsQuery } from '../api/useImportsQuery';
import { useConfirmImportMutation, useCancelImportMutation } from '../api/useImportMutations';
import { StatusBadge, PageHeader, PaginationBar, ConfirmDialog } from '@/components/common';
import { IMPORT_STATUS_LABELS } from '@/lib/constants';
import { ImportBatchStatus } from '@/types/enums';
import { usePermission } from '@/hooks/usePermission';

const INTERMEDIATE_STATES: string[] = [
  ImportBatchStatus.PENDING_VALIDATION,
  ImportBatchStatus.VALIDATING,
  ImportBatchStatus.APPLYING,
];

const CONFIRMABLE_STATES: string[] = [
  ImportBatchStatus.VALIDATED,
  ImportBatchStatus.VALIDATED_WITH_ERRORS,
];

const CANCELLABLE_STATES: string[] = [
  ImportBatchStatus.PENDING_VALIDATION,
  ImportBatchStatus.VALIDATED,
  ImportBatchStatus.VALIDATED_WITH_ERRORS,
];

export default function ImportDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { canCreate } = usePermission();
  const [errorsPage, setErrorsPage] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: batch, isLoading } = useImportBatchQuery(batchId ?? '');
  const { data: errorsData } = useImportErrorsQuery(batchId ?? '', {
    page: errorsPage,
    limit: 50,
  });

  const confirmMutation = useConfirmImportMutation();
  const cancelMutation = useCancelImportMutation();

  if (isLoading || !batch) {
    return <Spinner />;
  }

  const isIntermediate = INTERMEDIATE_STATES.includes(batch.status);
  const canConfirm = canCreate && CONFIRMABLE_STATES.includes(batch.status);
  const canCancel = canCreate && CANCELLABLE_STATES.includes(batch.status);

  return (
    <Stack gap="6">
      <PageHeader title={`Importação: ${batch.fileName}`}>
        {canConfirm && (
          <Button
            colorPalette="green"
            size="sm"
            onClick={() => setShowConfirmDialog(true)}
          >
            Confirmar
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancelar
          </Button>
        )}
      </PageHeader>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Status</Text>
          <HStack mt="1">
            <StatusBadge
              status={batch.status}
              label={IMPORT_STATUS_LABELS[batch.status as ImportBatchStatus] ?? batch.status}
            />
            {isIntermediate && <Spinner size="sm" />}
          </HStack>
        </Box>
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Total de Linhas</Text>
          <Text fontWeight="bold" fontSize="lg">{batch.totalRows}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="4">
          <Text fontSize="sm" color="fg.muted">Carteira</Text>
          <Text fontWeight="medium">{batch.wallet?.name ?? '-'}</Text>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap="4">
        <Box borderWidth="1px" rounded="md" p="3">
          <Text fontSize="xs" color="fg.muted">Válidas</Text>
          <Text fontWeight="bold" color="green.fg">{batch.validRows}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="3">
          <Text fontSize="xs" color="fg.muted">Inválidas</Text>
          <Text fontWeight="bold" color="red.fg">{batch.invalidRows}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="3">
          <Text fontSize="xs" color="fg.muted">Criadas</Text>
          <Text fontWeight="bold">{batch.createdRows}</Text>
        </Box>
        <Box borderWidth="1px" rounded="md" p="3">
          <Text fontSize="xs" color="fg.muted">Atualizadas</Text>
          <Text fontWeight="bold">{batch.updatedRows}</Text>
        </Box>
      </SimpleGrid>

      {/* Errors table */}
      {errorsData && errorsData.data.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb="3">
            Erros ({errorsData.meta.total})
          </Text>
          <Table.ScrollArea borderWidth="1px" rounded="md">
            <Table.Root size="sm" stickyHeader>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Linha</Table.ColumnHeader>
                  <Table.ColumnHeader>Campo</Table.ColumnHeader>
                  <Table.ColumnHeader>Código</Table.ColumnHeader>
                  <Table.ColumnHeader>Valor</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {errorsData.data.map((err) => (
                  <Table.Row key={err.id}>
                    <Table.Cell>{err.row}</Table.Cell>
                    <Table.Cell>{err.field}</Table.Cell>
                    <Table.Cell>
                      <Badge variant="subtle" size="sm">{err.code}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">{err.value}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
          <PaginationBar
            page={errorsPage}
            totalPages={errorsData.meta.totalPages}
            pageSize={50}
            onChange={setErrorsPage}
          />
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmar importação"
        message="Tem certeza que deseja confirmar esta importação? Os contratos serão criados/atualizados."
        confirmLabel="Confirmar"
        colorPalette="green"
        onConfirm={() => {
          confirmMutation.mutate(batchId!, {
            onSuccess: () => setShowConfirmDialog(false),
          });
        }}
        loading={confirmMutation.isPending}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancelar importação"
        message="Tem certeza que deseja cancelar esta importação?"
        confirmLabel="Cancelar importação"
        colorPalette="red"
        onConfirm={() => {
          cancelMutation.mutate(batchId!, {
            onSuccess: () => setShowCancelDialog(false),
          });
        }}
        loading={cancelMutation.isPending}
      />
    </Stack>
  );
}
