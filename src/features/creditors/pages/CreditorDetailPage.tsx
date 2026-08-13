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
import { useCreditorQuery } from '../api/useCreditorsQuery';
import { PageHeader } from '@/components/common';

const CONTACT_TYPE_LABELS: Record<string, string> = {
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
};

export default function CreditorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: creditor, isLoading } = useCreditorQuery(id!);

  if (isLoading) {
    return <Spinner />;
  }

  if (!creditor) {
    return <Text>Credor não encontrado.</Text>;
  }

  return (
    <Stack gap="4">
      <HStack>
        <Button variant="ghost" size="sm" onClick={() => navigate('/creditors')}>
          <LuArrowLeft /> Voltar
        </Button>
      </HStack>

      <PageHeader title={creditor.name} />

      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Dados Gerais</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">CNPJ</Text>
              <Text>{creditor.cnpj ?? 'Não informado'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Criado em</Text>
              <Text>{new Date(creditor.createdAt).toLocaleDateString('pt-BR')}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {creditor.contacts && creditor.contacts.length > 0 && (
        <Card.Root>
          <Card.Body gap="3">
            <Heading size="sm">Contatos</Heading>
            <Stack gap="2">
              {creditor.contacts.map((contact, idx) => (
                <HStack key={idx} gap="3">
                  <Badge size="sm">{CONTACT_TYPE_LABELS[contact.type] ?? contact.type}</Badge>
                  <Text fontSize="sm">{contact.value}</Text>
                </HStack>
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>
      )}

      {creditor.address && (
        <Card.Root>
          <Card.Body gap="3">
            <Heading size="sm">Endereço</Heading>
            <Text fontSize="sm">
              {creditor.address.street}, {creditor.address.number}
              {creditor.address.complement ? ` - ${creditor.address.complement}` : ''}
            </Text>
            <Text fontSize="sm">
              {creditor.address.neighborhood} - {creditor.address.city}/{creditor.address.state}
            </Text>
            <Text fontSize="sm">CEP: {creditor.address.zipCode}</Text>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  );
}
