import { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Spinner,
  Stack,
  Table,
  Text,
  Badge,
} from '@chakra-ui/react';
import { LuPlus } from 'react-icons/lu';
import { useProvidersQuery } from '../api/useProvidersQuery';
import { PageHeader, EmptyState } from '@/components/common';
import { usePermission } from '@/hooks/usePermission';
import { ProviderFormDialog } from '../components/ProviderFormDialog';
import { WalletMappingsPanel } from '../components/WalletMappingsPanel';
import type { Provider } from '@/types/models';

const ENV_LABELS: Record<string, string> = {
  HOMOLOGATION: 'Homologação',
  PRODUCTION: 'Produção',
};

const TYPE_LABELS: Record<string, string> = {
  SERASA_LNOP: 'Serasa LNOP',
};

export default function ProvidersPage() {
  const { canManageProviders } = usePermission();
  const [showCreate, setShowCreate] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { data: providers, isLoading } = useProvidersQuery();

  return (
    <Stack gap="6">
      <PageHeader title="Canais">
        {canManageProviders && (
          <Button colorPalette="blue" size="sm" onClick={() => setShowCreate(true)}>
            <LuPlus /> Novo Canal
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <Spinner />
      ) : !providers?.length ? (
        <EmptyState title="Nenhum canal configurado" />
      ) : (
        <Table.ScrollArea borderWidth="1px" rounded="md">
          <Table.Root size="sm" stickyHeader interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                <Table.ColumnHeader>Ambiente</Table.ColumnHeader>
                <Table.ColumnHeader>Criado em</Table.ColumnHeader>
                <Table.ColumnHeader width="150px">Ações</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {providers.map((provider) => (
                <Table.Row key={provider.id}>
                  <Table.Cell>{TYPE_LABELS[provider.type] ?? provider.type}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={provider.environment === 'PRODUCTION' ? 'green' : 'orange'}
                      variant="subtle"
                      size="sm"
                    >
                      {ENV_LABELS[provider.environment] ?? provider.environment}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(provider.createdAt).toLocaleDateString('pt-BR')}
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap="1">
                      {canManageProviders && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setEditProvider(provider)}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        Mappings
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}

      {/* Wallet Mappings Panel */}
      {selectedProvider && (
        <WalletMappingsPanel
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}

      {/* Create / Edit Dialog */}
      <ProviderFormDialog
        open={showCreate || !!editProvider}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setEditProvider(null);
          }
        }}
        provider={editProvider}
      />
    </Stack>
  );
}
