import { Link as RouterLink } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import {
  HStack,
  Table,
  Link,
  Spinner,
  Stack,
  Button,
} from '@chakra-ui/react';
import { LuPlus } from 'react-icons/lu';
import { NativeSelect } from '@chakra-ui/react';
import { useOperationsQuery } from '../api/useOperationsQuery';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { StatusBadge, PageHeader, PaginationBar, EmptyState } from '@/components/common';
import { OPERATION_STATUS_LABELS } from '@/lib/constants';
import { OperationStatus } from '@/types/enums';
import { usePermission } from '@/hooks/usePermission';
import { CreateOperationDialog } from '../components/CreateOperationDialog';

const ACTION_LABELS: Record<string, string> = {
  CREATE_OR_UPDATE: 'Incluir/Atualizar',
  REMOVE: 'Remover',
};

export default function OperationsListPage() {
  const { canCreate } = usePermission();

  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');
  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';
  const walletId = searchParams.get('walletId') || '';

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  // Dialog state derived from URL
  const showCreate = action === 'new';

  const { data, isLoading } = useOperationsQuery({
    page,
    limit: 20,
    status: status || undefined,
    walletId: walletId || undefined,
  });

  const { data: walletsData } = useAllWalletsQuery();

  const handleOpenCreate = () => {
    updateParams({ action: 'new' });
  };

  const handleCloseCreate = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined });
    }
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value || undefined, page: undefined });
  };

  const handleWalletChange = (value: string) => {
    updateParams({ walletId: value || undefined, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  return (
    <Stack gap="4">
      <PageHeader title="Operações">
        {canCreate && (
          <Button colorPalette="blue" size="sm" onClick={handleOpenCreate}>
            <LuPlus /> Nova Operação
          </Button>
        )}
      </PageHeader>

      <HStack gap="3" wrap="wrap">
        <NativeSelect.Root size="sm" width="200px">
          <NativeSelect.Field
            placeholder="Todos os status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {Object.entries(OPERATION_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" width="220px">
          <NativeSelect.Field
            placeholder="Todas as carteiras"
            value={walletId}
            onChange={(e) => handleWalletChange(e.target.value)}
          >
            {walletsData?.data.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <EmptyState title="Nenhuma operação encontrada" />
      ) : (
        <>
          <Table.ScrollArea borderWidth="1px" rounded="md">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Carteira</Table.ColumnHeader>
                  <Table.ColumnHeader>Ação</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Itens</Table.ColumnHeader>
                  <Table.ColumnHeader>Processados</Table.ColumnHeader>
                  <Table.ColumnHeader>Falhas</Table.ColumnHeader>
                  <Table.ColumnHeader>Criado em</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.data.map((op) => (
                  <Table.Row key={op.id}>
                    <Table.Cell>
                      <Link asChild colorPalette="blue">
                        <RouterLink to={`/operations/${op.id}`}>
                          {op.wallet?.name ?? '-'}
                        </RouterLink>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{ACTION_LABELS[op.action] ?? op.action}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge
                        status={op.status}
                        label={OPERATION_STATUS_LABELS[op.status as OperationStatus] ?? op.status}
                      />
                    </Table.Cell>
                    <Table.Cell>{op.totalItems}</Table.Cell>
                    <Table.Cell>{op.processedItems}</Table.Cell>
                    <Table.Cell>{op.failedItems}</Table.Cell>
                    <Table.Cell>
                      {new Date(op.createdAt).toLocaleDateString('pt-BR')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>

          <PaginationBar
            page={page}
            totalPages={data.meta.totalPages}
            pageSize={data.meta.limit}
            onChange={handlePageChange}
          />
        </>
      )}

      <CreateOperationDialog
        open={showCreate}
        onOpenChange={handleCloseCreate}
      />
    </Stack>
  );
}
