import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HStack,
  Table,
  Spinner,
  Stack,
  Button,
  Menu,
  Portal,
  IconButton,
} from '@chakra-ui/react';
import { LuPlus, LuEllipsisVertical } from 'react-icons/lu';
import { NativeSelect } from '@chakra-ui/react';
import { useUsersQuery } from '../api/useUsersQuery';
import { useResendInviteMutation, useForceResetMutation } from '../api/useUserMutations';
import { StatusBadge, PageHeader, PaginationBar, EmptyState, ConfirmDialog } from '@/components/common';
import { InviteStatus } from '@/types/enums';
import type { User } from '@/types/models';
import { InviteUserDialog } from '../components/InviteUserDialog';
import { EditUserDialog } from '../components/EditUserDialog';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERATIONAL: 'Operacional',
  VIEWER: 'Visualizador',
};

export default function UsersListPage() {
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');
  const editId = searchParams.get('id');
  const page = Number(searchParams.get('page')) || 1;
  const statusFilter = searchParams.get('status') || '';

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  // Dialog state derived from URL
  const showInvite = action === 'new';

  // Force reset stays in local state
  const [forceResetUser, setForceResetUser] = useState<User | null>(null);

  const { data, isLoading } = useUsersQuery({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });

  // Edit user derived from URL
  const editUser = action === 'edit' && editId
    ? data?.data.find((u) => u.id === editId) ?? null
    : null;

  const resendMutation = useResendInviteMutation();
  const forceResetMutation = useForceResetMutation();

  const handleOpenInvite = () => {
    updateParams({ action: 'new', id: undefined });
  };

  const handleCloseInvite = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined, id: undefined });
    }
  };

  const handleEditUser = (user: User) => {
    updateParams({ action: 'edit', id: user.id });
  };

  const handleCloseEdit = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined, id: undefined });
    }
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value || undefined, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  return (
    <Stack gap="4">
      <PageHeader title="Usuários">
        <Button colorPalette="blue" size="sm" onClick={handleOpenInvite}>
          <LuPlus /> Convidar Usuário
        </Button>
      </PageHeader>

      <HStack gap="3" wrap="wrap">
        <NativeSelect.Root size="sm" width="180px">
          <NativeSelect.Field
            placeholder="Todos os status"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <EmptyState title="Nenhum usuário encontrado" />
      ) : (
        <>
          <Table.ScrollArea borderWidth="1px" rounded="md">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>E-mail</Table.ColumnHeader>
                  <Table.ColumnHeader>Nome</Table.ColumnHeader>
                  <Table.ColumnHeader>Role</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Criado em</Table.ColumnHeader>
                  <Table.ColumnHeader width="60px">Ações</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.data.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>{user.name ?? '-'}</Table.Cell>
                    <Table.Cell>{ROLE_LABELS[user.role] ?? user.role}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge
                        status={user.status}
                        label={STATUS_LABELS[user.status] ?? user.status}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </Table.Cell>
                    <Table.Cell>
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <IconButton variant="ghost" size="sm" aria-label="Ações">
                            <LuEllipsisVertical />
                          </IconButton>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content>
                              <Menu.Item value="edit" onClick={() => handleEditUser(user)}>
                                Editar
                              </Menu.Item>
                              {user.status === InviteStatus.PENDING && (
                                <Menu.Item
                                  value="resend"
                                  onClick={() => resendMutation.mutate(user.id)}
                                >
                                  Reenviar convite
                                </Menu.Item>
                              )}
                              {user.status === InviteStatus.ACTIVE && (
                                <Menu.Item
                                  value="force-reset"
                                  onClick={() => setForceResetUser(user)}
                                >
                                  Forçar reset de senha
                                </Menu.Item>
                              )}
                            </Menu.Content>
                          </Menu.Positioner>
                        </Portal>
                      </Menu.Root>
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

      <InviteUserDialog open={showInvite} onOpenChange={handleCloseInvite} />

      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={handleCloseEdit}
          user={editUser}
        />
      )}

      <ConfirmDialog
        open={!!forceResetUser}
        onOpenChange={(open) => { if (!open) setForceResetUser(null); }}
        title="Forçar reset de senha"
        message={`O usuário ${forceResetUser?.email ?? ''} será obrigado a trocar a senha no próximo login.`}
        confirmLabel="Forçar Reset"
        colorPalette="orange"
        onConfirm={() => {
          if (forceResetUser) {
            forceResetMutation.mutate(forceResetUser.id, {
              onSuccess: () => setForceResetUser(null),
            });
          }
        }}
        loading={forceResetMutation.isPending}
      />
    </Stack>
  );
}
