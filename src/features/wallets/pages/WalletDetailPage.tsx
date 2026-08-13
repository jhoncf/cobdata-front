import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Stat,
  Table,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { LuArrowLeft, LuUpload, LuPlus } from 'react-icons/lu';
import { PageHeader, StatusBadge, LoadingOverlay, PaginationBar, EmptyState } from '@/components/common';
import { useWalletDetailQuery } from '../api/useWalletDetailQuery';
import { useContractsQuery } from '@/features/contracts/api/useContractsQuery';
import { useCreateContractMutation } from '@/features/contracts/api/useContractMutations';
import { ContractFormDialog } from '@/features/contracts/components/ContractFormDialog';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { PROVIDER_STATUS_LABELS } from '@/lib/constants';
import type { ProviderStatus } from '@/types/enums';
import type { CreateContractDto } from '@/types/api';

export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractsPage, setContractsPage] = useState(1);
  const [showContractForm, setShowContractForm] = useState(false);

  const { data: wallet, isLoading } = useWalletDetailQuery(id ?? '');
  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery({
    walletId: id,
    page: contractsPage,
    limit: 20,
  });
  const createContractMutation = useCreateContractMutation();

  const handleCreateContract = (data: CreateContractDto) => {
    // Pre-fill walletId from the current wallet
    const payload = { ...data, walletId: id! };
    createContractMutation.mutate(payload, {
      onSuccess: () => setShowContractForm(false),
    });
  };

  if (isLoading) return <LoadingOverlay />;
  if (!wallet) return <Text>Carteira não encontrada.</Text>;

  return (
    <>
      <PageHeader title={wallet.name}>
        <HStack gap="2">
          <Button
            size="sm"
            colorPalette="green"
            onClick={() => setShowContractForm(true)}
          >
            <LuPlus /> Novo Contrato
          </Button>
          <Button
            asChild
            size="sm"
            colorPalette="blue"
          >
            <RouterLink to={`/imports/new?walletId=${id}`}>
              <LuUpload /> Importar Contratos
            </RouterLink>
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/wallets')}>
            <LuArrowLeft /> Voltar
          </Button>
        </HStack>
      </PageHeader>

      <Stack gap="6">
        {/* Informações Gerais */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Informações Gerais</Card.Title>
          </Card.Header>
          <Card.Body>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Credor
                </Text>
                <Text>{wallet.creditor?.name ?? '—'}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Status
                </Text>
                <StatusBadge status={wallet.status} />
              </Box>
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Criado em
                </Text>
                <Text>{formatDate(wallet.createdAt)}</Text>
              </Box>
            </SimpleGrid>
          </Card.Body>
        </Card.Root>

        {/* Dashboard da Carteira */}
        {wallet.summary && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Resumo da Carteira</Card.Title>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 2, md: 4 }} gap="6">
                <Stat.Root>
                  <Stat.Label>Total de Contratos</Stat.Label>
                  <Stat.ValueText>{wallet.summary.totalContracts}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root>
                  <Stat.Label>Valor Total</Stat.Label>
                  <Stat.ValueText>
                    {formatCurrency(wallet.summary.totalValue)}
                  </Stat.ValueText>
                </Stat.Root>
                {wallet.summary.contractsByStatus &&
                  Object.entries(wallet.summary.contractsByStatus).map(
                    ([status, count]) => (
                      <Stat.Root key={status}>
                        <Stat.Label>
                          {PROVIDER_STATUS_LABELS[status as ProviderStatus] ?? status}
                        </Stat.Label>
                        <Stat.ValueText>{count as number}</Stat.ValueText>
                      </Stat.Root>
                    ),
                  )}
              </SimpleGrid>
            </Card.Body>
          </Card.Root>
        )}

        {/* Listagem de Contratos */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Contratos</Card.Title>
          </Card.Header>
          <Card.Body>
            {contractsLoading ? (
              <Spinner />
            ) : !contractsData?.data.length ? (
              <EmptyState title="Nenhum contrato nesta carteira" />
            ) : (
              <Stack gap="4">
                <Table.ScrollArea borderWidth="1px" rounded="md">
                  <Table.Root size="sm" stickyHeader interactive>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Nº Contrato</Table.ColumnHeader>
                        <Table.ColumnHeader>Documento</Table.ColumnHeader>
                        <Table.ColumnHeader>Valor Original</Table.ColumnHeader>
                        <Table.ColumnHeader>Valor Atualizado</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                        <Table.ColumnHeader>Provedor</Table.ColumnHeader>
                        <Table.ColumnHeader>Data Ocorrência</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {contractsData.data.map((contract) => (
                        <Table.Row key={contract.id}>
                          <Table.Cell fontWeight="medium">
                            {contract.contractNumber}
                          </Table.Cell>
                          <Table.Cell>{contract.debtorDocument}</Table.Cell>
                          <Table.Cell>
                            {formatCurrency(contract.originalValue)}
                          </Table.Cell>
                          <Table.Cell>
                            {contract.updatedValue
                              ? formatCurrency(contract.updatedValue)
                              : '—'}
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge status={contract.status} />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge size="sm" variant="subtle">
                              {PROVIDER_STATUS_LABELS[contract.providerStatus as ProviderStatus] ?? contract.providerStatus}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {formatDate(contract.occurrenceDate)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Table.ScrollArea>

                {contractsData.meta && contractsData.meta.totalPages > 1 && (
                  <PaginationBar
                    page={contractsPage}
                    totalPages={contractsData.meta.totalPages}
                    pageSize={20}
                    onChange={setContractsPage}
                  />
                )}
              </Stack>
            )}
          </Card.Body>
        </Card.Root>
      </Stack>

      <ContractFormDialog
        open={showContractForm}
        onOpenChange={setShowContractForm}
        onSubmit={(data) => handleCreateContract(data as CreateContractDto)}
        loading={createContractMutation.isPending}
      />
    </>
  );
}
