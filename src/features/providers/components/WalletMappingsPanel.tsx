import { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Table,
  Text,
  IconButton,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { NativeSelect } from '@chakra-ui/react';
import { useWalletMappingsQuery } from '../api/useProvidersQuery';
import { useCreateMappingMutation, useDeleteMappingMutation } from '../api/useProviderMutations';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { usePermission } from '@/hooks/usePermission';
import { ConfirmDialog } from '@/components/common';
import type { Provider, WalletMapping } from '@/types/models';

interface WalletMappingsPanelProps {
  provider: Provider;
  onClose: () => void;
}

export function WalletMappingsPanel({ provider, onClose }: WalletMappingsPanelProps) {
  const { canManageProviders } = usePermission();
  const [newWalletId, setNewWalletId] = useState('');
  const [newExternalId, setNewExternalId] = useState('');
  const [deleteMapping, setDeleteMapping] = useState<WalletMapping | null>(null);

  const { data: mappings } = useWalletMappingsQuery(provider.id);
  const { data: walletsData } = useAllWalletsQuery();
  const createMappingMutation = useCreateMappingMutation(provider.id);
  const deleteMappingMutation = useDeleteMappingMutation(provider.id);

  // Filter wallets that are not already mapped
  const mappedWalletIds = mappings?.map((m) => m.walletId) ?? [];
  const availableWallets = walletsData?.data.filter((w) => !mappedWalletIds.includes(w.id)) ?? [];

  const handleCreateMapping = () => {
    if (!newWalletId || !newExternalId) return;
    createMappingMutation.mutate(
      { walletId: newWalletId, externalWalletId: newExternalId },
      {
        onSuccess: () => {
          setNewWalletId('');
          setNewExternalId('');
        },
      },
    );
  };

  return (
    <Box borderWidth="1px" rounded="md" p="4">
      <HStack justify="space-between" mb="4">
        <Text fontWeight="medium">Mapeamentos de Carteira</Text>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </HStack>

      {mappings && mappings.length > 0 && (
        <Table.ScrollArea borderWidth="1px" rounded="md" mb="4">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Carteira</Table.ColumnHeader>
                <Table.ColumnHeader>ID Externo</Table.ColumnHeader>
                {canManageProviders && <Table.ColumnHeader width="60px" />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {mappings.map((mapping) => (
                <Table.Row key={mapping.id}>
                  <Table.Cell>{mapping.wallet?.name ?? mapping.walletId}</Table.Cell>
                  <Table.Cell>{mapping.externalWalletId}</Table.Cell>
                  {canManageProviders && (
                    <Table.Cell>
                      <IconButton
                        variant="ghost"
                        size="xs"
                        colorPalette="red"
                        aria-label="Remover mapeamento"
                        onClick={() => setDeleteMapping(mapping)}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}

      {canManageProviders && (
        <Stack gap="2">
          <Text fontSize="sm" fontWeight="medium">Adicionar mapeamento</Text>
          <HStack gap="2" wrap="wrap">
            <NativeSelect.Root size="sm" width="200px">
              <NativeSelect.Field
                placeholder="Selecionar carteira..."
                value={newWalletId}
                onChange={(e) => setNewWalletId(e.target.value)}
              >
                {availableWallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </NativeSelect.Field>
            <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Input
              size="sm"
              width="180px"
              placeholder="ID externo"
              value={newExternalId}
              onChange={(e) => setNewExternalId(e.target.value)}
            />
            <Button
              size="sm"
              colorPalette="blue"
              onClick={handleCreateMapping}
              loading={createMappingMutation.isPending}
              disabled={!newWalletId || !newExternalId}
            >
              <LuPlus /> Adicionar
            </Button>
          </HStack>
        </Stack>
      )}

      <ConfirmDialog
        open={!!deleteMapping}
        onOpenChange={(open) => { if (!open) setDeleteMapping(null); }}
        title="Remover mapeamento"
        message={`Tem certeza que deseja remover o mapeamento da carteira "${deleteMapping?.wallet?.name ?? ''}"?`}
        confirmLabel="Remover"
        colorPalette="red"
        onConfirm={() => {
          if (deleteMapping) {
            deleteMappingMutation.mutate(deleteMapping.id, {
              onSuccess: () => setDeleteMapping(null),
            });
          }
        }}
        loading={deleteMappingMutation.isPending}
      />
    </Box>
  );
}
