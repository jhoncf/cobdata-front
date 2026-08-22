import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  HStack,
  Text,
  Spinner,
  Button,
  Card,
  Heading,
  Badge,
} from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { useContractQuery } from '../api/useContractsQuery';
import { PageHeader } from '@/components/common';

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading } = useContractQuery(id!);

  if (isLoading) {
    return <Spinner />;
  }

  if (!contract) {
    return <Text>Contrato não encontrado.</Text>;
  }

  return (
    <Stack gap="4">
      <HStack>
        <Button variant="ghost" size="sm" onClick={() => navigate('/contracts')}>
          <LuArrowLeft /> Voltar
        </Button>
      </HStack>

      <PageHeader title={`Contrato ${contract.contractNumber}`} />

      {/* Card 1: Dados do Devedor */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Dados do Devedor</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Nome</Text>
              <Text>{contract.debtorName ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">CPF</Text>
              <Text>{formatCPF(contract.debtorDocument)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Telefone</Text>
              <Text>{contract.debtorPhone ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">E-mail</Text>
              <Text>{contract.debtorEmail ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Endereço</Text>
              <Text>
                {[contract.debtorStreet, contract.debtorCity].filter(Boolean).join(', ') || '—'}
              </Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 2: Dados do Contrato */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Dados do Contrato</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Nº Contrato</Text>
              <Text>{contract.contractNumber}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Tipo de Dívida</Text>
              <Text>{contract.debtType}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Data de Ocorrência</Text>
              <Text>{formatDate(contract.occurrenceDate)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Data de Vencimento</Text>
              <Text>{contract.dueDate ? formatDate(contract.dueDate) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Origem da Dívida</Text>
              <Text>{contract.debtOrigin ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Produto</Text>
              <Text>{contract.productName ?? '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 3: Valores */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Valores</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor Original</Text>
              <Text>{formatCurrency(contract.originalValue)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor Atualizado</Text>
              <Text>{contract.updatedValue != null ? formatCurrency(contract.updatedValue) : '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 4: Status */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Status</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Situação administrativa</Text>
              <Badge>{contract.status}</Badge>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Situação financeira</Text>
              <Badge>{contract.paymentStatus}</Badge>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Serasa</Text>
              <Badge>{contract.serasaStatus}</Badge>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Negativado</Text>
              <Text>{contract.isNegativated ? 'Sim' : 'Não'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Cancelado em</Text>
              <Text>{contract.cancelledAt ? formatDate(contract.cancelledAt) : '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 5: Carteira */}
      {contract.wallet && (
        <Card.Root>
          <Card.Body gap="3">
            <Heading size="sm">Carteira</Heading>
            <HStack gap="8" wrap="wrap">
              <Stack gap="0">
                <Text fontSize="xs" color="fg.muted">Carteira</Text>
                <Text>{contract.wallet.name}</Text>
              </Stack>
              {contract.wallet.creditor && (
                <Stack gap="0">
                  <Text fontSize="xs" color="fg.muted">Credor</Text>
                  <Text>{contract.wallet.creditor.name}</Text>
                </Stack>
              )}
            </HStack>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  );
}
