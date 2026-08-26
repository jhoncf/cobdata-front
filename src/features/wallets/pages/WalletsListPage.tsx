import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, HStack, Input } from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { LuPlus, LuSearch, LuPencil, LuTrash2 } from 'react-icons/lu';
import {
  PageHeader,
  DataTable,
  PaginationBar,
  StatusBadge,
  ConfirmDialog,
} from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import { useWalletsQuery } from '../api/useWalletsQuery';
import {
  useCreateWalletMutation,
  useUpdateWalletMutation,
  useDeleteWalletMutation,
} from '../api/useWalletMutations';
import { WalletFormDialog } from '../components/WalletFormDialog';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/formatters';
import type { Wallet } from '@/types/models';

const LAST_CREDITOR_SESSION_KEY = 'cobdata.wallets.lastCreditorId';

export default function WalletsListPage() {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePermission();

  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');
  const editId = searchParams.get('id');
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const selectedCreditorId =
    searchParams.get('creditorId') ??
    sessionStorage.getItem(LAST_CREDITOR_SESSION_KEY) ??
    '';

  const [searchInput, setSearchInput] = useState(search);
  const limit = 20;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  // Load creditors for filter dropdown
  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });

  const { data, isLoading } = useWalletsQuery({
    page,
    limit,
    search,
    creditorId: selectedCreditorId || undefined,
  });
  const createMutation = useCreateWalletMutation();
  const updateMutation = useUpdateWalletMutation();
  const deleteMutation = useDeleteWalletMutation();

  // Dialog state derived from URL
  const formOpen = action === 'new' || action === 'edit';
  const editingWallet = action === 'edit' && editId
    ? data?.data.find((w) => w.id === editId) ?? null
    : null;

  // Delete stays in local state
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null);

  const handleSearch = () => {
    updateParams({ search: searchInput || undefined, page: undefined });
  };

  const handleCreditorChange = (creditorId: string) => {
    if (creditorId) {
      sessionStorage.setItem(LAST_CREDITOR_SESSION_KEY, creditorId);
    } else {
      sessionStorage.removeItem(LAST_CREDITOR_SESSION_KEY);
    }
    updateParams({ creditorId: creditorId || undefined, page: undefined });
  };

  const handleCreate = () => {
    updateParams({ action: 'new', id: undefined });
  };

  const handleEdit = (wallet: Wallet) => {
    updateParams({ action: 'edit', id: wallet.id });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined, id: undefined });
    }
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleFormSubmit = (formData: { name: string; creditorId: string; serasaWalletId?: string }) => {
    if (editingWallet) {
      updateMutation.mutate(
        { id: editingWallet.id, data: { name: formData.name, serasaWalletId: formData.serasaWalletId || null } },
        { onSuccess: () => updateParams({ action: undefined, id: undefined }) },
      );
    } else {
      createMutation.mutate(
        { creditorId: formData.creditorId, data: { name: formData.name, serasaWalletId: formData.serasaWalletId || undefined } },
        { onSuccess: () => updateParams({ action: undefined, id: undefined }) },
      );
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const columns: DataTableColumn<Wallet>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    {
      key: 'creditor',
      header: 'Credor',
      cell: (row) => row.creditor?.name ?? '—',
    },
    {
      key: 'contracts',
      header: 'Contratos',
      textAlign: 'end',
      cell: (row) => row._count?.contracts ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      cell: (row) => formatDate(row.createdAt),
    },
    ...(canEdit || canDelete
      ? [
          {
            key: 'actions',
            header: 'Ações',
            textAlign: 'end' as const,
            cell: (row: Wallet) => (
              <HStack gap="1" justify="end">
                {canEdit && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(row);
                    }}
                    aria-label="Editar"
                  >
                    <LuPencil />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(row);
                    }}
                    aria-label="Excluir"
                  >
                    <LuTrash2 />
                  </Button>
                )}
              </HStack>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Carteiras">
        {canCreate && (
          <Button colorPalette="blue" size="sm" onClick={handleCreate}>
            <LuPlus /> Nova Carteira
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <HStack mb="4" gap="3" wrap="wrap">
        <NativeSelect.Root size="sm" width="220px">
          <NativeSelect.Field
            value={selectedCreditorId}
            onChange={(e) => handleCreditorChange(e.target.value)}
          >
            <option value="">Todos os credores</option>
            {creditorsData?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <HStack gap="2">
          <Input
            placeholder="Buscar por nome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            maxW="240px"
            size="sm"
          />
          <Button size="sm" variant="outline" onClick={handleSearch}>
            <LuSearch />
          </Button>
        </HStack>
      </HStack>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/wallets/${row.id}`)}
      />

      <PaginationBar
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        pageSize={limit}
        onChange={handlePageChange}
      />

      <WalletFormDialog
        open={formOpen}
        onOpenChange={handleCloseDialog}
        wallet={editingWallet}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Carteira"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
