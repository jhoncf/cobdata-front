import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, HStack, Input } from '@chakra-ui/react';
import { LuPlus, LuSearch, LuPencil, LuTrash2 } from 'react-icons/lu';
import {
  PageHeader,
  DataTable,
  PaginationBar,
  ConfirmDialog,
} from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useCreditorsQuery } from '../api/useCreditorsQuery';
import {
  useCreateCreditorMutation,
  useUpdateCreditorMutation,
  useDeleteCreditorMutation,
} from '../api/useCreditorMutations';
import { CreditorFormDialog } from '../components/CreditorFormDialog';
import { usePermission } from '@/hooks/usePermission';
import { formatCNPJ, formatDate } from '@/lib/formatters';
import type { Creditor } from '@/types/models';

export default function CreditorsListPage() {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePermission();

  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');
  const editId = searchParams.get('id');
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';

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

  const { data, isLoading } = useCreditorsQuery({ page, limit, search });
  const createMutation = useCreateCreditorMutation();
  const updateMutation = useUpdateCreditorMutation();
  const deleteMutation = useDeleteCreditorMutation();

  // Dialog state derived from URL
  const formOpen = action === 'new' || action === 'edit';
  const editingCreditor = action === 'edit' && editId
    ? data?.data.find((c) => c.id === editId) ?? null
    : null;

  // Delete stays in local state (doesn't need URL persistence)
  const [deleteTarget, setDeleteTarget] = useState<Creditor | null>(null);

  const handleSearch = () => {
    updateParams({ search: searchInput || undefined, page: undefined });
  };

  const handleCreate = () => {
    updateParams({ action: 'new', id: undefined });
  };

  const handleEdit = (creditor: Creditor) => {
    updateParams({ action: 'edit', id: creditor.id });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined, id: undefined });
    }
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleFormSubmit = (formData: Parameters<typeof createMutation.mutate>[0]) => {
    if (editingCreditor) {
      updateMutation.mutate(
        { id: editingCreditor.id, data: formData },
        { onSuccess: () => updateParams({ action: undefined, id: undefined }) },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => updateParams({ action: undefined, id: undefined }),
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const columns: DataTableColumn<Creditor>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    {
      key: 'cnpj',
      header: 'CNPJ',
      cell: (row) => (row.cnpj ? formatCNPJ(row.cnpj) : '—'),
    },
    {
      key: 'contacts',
      header: 'Contatos',
      cell: (row) => row.contacts?.length ?? 0,
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
            cell: (row: Creditor) => (
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
      <PageHeader title="Credores">
        {canCreate && (
          <Button colorPalette="blue" size="sm" onClick={handleCreate}>
            <LuPlus /> Novo Credor
          </Button>
        )}
      </PageHeader>

      <HStack mb="4" gap="2">
        <Input
          placeholder="Buscar por nome..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          maxW="320px"
          size="sm"
        />
        <Button size="sm" variant="outline" onClick={handleSearch}>
          <LuSearch />
        </Button>
      </HStack>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/creditors/${row.id}`)}
      />

      <PaginationBar
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        pageSize={limit}
        onChange={handlePageChange}
      />

      <CreditorFormDialog
        open={formOpen}
        onOpenChange={handleCloseDialog}
        creditor={editingCreditor}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Credor"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
