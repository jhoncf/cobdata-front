import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Stack,
  HStack,
  Text,
  Spinner,
  Button,
  Card,
  Heading,
  Badge,
  Input,
  SimpleGrid,
  Flex,
} from '@chakra-ui/react';
import { LuPencil, LuPlus, LuSave, LuTrash2 } from 'react-icons/lu';
import { useCreditorCommercialRulesQuery, useCreditorQuery } from '../api/useCreditorsQuery';
import { useInviteCreditorUserMutation, useUpdateCreditorCommercialRulesMutation, useUpdateCreditorMutation } from '../api/useCreditorMutations';
import { PageHeader } from '@/components/common';
import type { CreditorDiscountBand } from '@/types/models';
import { CreditorFormDialog } from '../components/CreditorFormDialog';
import { usePermission } from '@/hooks/usePermission';

const CONTACT_TYPE_LABELS: Record<string, string> = {
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
};

export default function CreditorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: creditor, isLoading } = useCreditorQuery(id!);
  const { data: commercialRules } = useCreditorCommercialRulesQuery(id!);
  const commercialRulesMutation = useUpdateCreditorCommercialRulesMutation();
  const creditorMutation = useUpdateCreditorMutation();
  const invitePortalUserMutation = useInviteCreditorUserMutation();
  const { canEdit, canManageUsers } = usePermission();
  const [editOpen, setEditOpen] = useState(false);
  const [discountBands, setDiscountBands] = useState<CreditorDiscountBand[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalName, setPortalName] = useState('');

  useEffect(() => {
    if (commercialRules) {
      setDiscountBands(commercialRules.discountBands);
      setCommissionPercent(Number(commercialRules.commissionPercent ?? 0));
    }
  }, [commercialRules]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!creditor) {
    return <Text>Credor não encontrado.</Text>;
  }

  return (
    <Stack gap="4">
      <HStack>
      </HStack>

      <PageHeader title={creditor.name}>
        {canEdit && <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><LuPencil /> Editar</Button>}
      </PageHeader>

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

      {canManageUsers && (
        <Card.Root>
          <Card.Body gap="3">
            <Stack gap="0">
              <Heading size="sm">Usuários do credor</Heading>
              <Text fontSize="sm" color="fg.muted">Este acesso permite somente consultar os contratos deste credor. O convite para criação de senha expira em 72 horas.</Text>
            </Stack>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="3" alignItems="end">
              <Stack gap="1"><Text fontSize="xs">Nome</Text><Input value={portalName} onChange={(event) => setPortalName(event.target.value)} placeholder="Nome do usuário" /></Stack>
              <Stack gap="1"><Text fontSize="xs">E-mail</Text><Input type="email" value={portalEmail} onChange={(event) => setPortalEmail(event.target.value)} placeholder="usuario@empresa.com" /></Stack>
              <Button colorPalette="blue" loading={invitePortalUserMutation.isPending} disabled={!portalEmail} onClick={() => invitePortalUserMutation.mutate({ creditorId: id!, data: { email: portalEmail, ...(portalName ? { name: portalName } : {}) } }, { onSuccess: () => { setPortalEmail(''); setPortalName(''); } })}>Enviar convite</Button>
            </SimpleGrid>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root>
        <Card.Body gap="4">
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="2">
            <Stack gap="0">
              <Heading size="sm">Regras comerciais</Heading>
              <Text fontSize="xs" color="fg.muted">A estratégia da carteira não pode ultrapassar o desconto máximo definido aqui.</Text>
            </Stack>
            <Button size="sm" colorPalette="blue" loading={commercialRulesMutation.isPending} onClick={() => commercialRulesMutation.mutate({
              id: id!,
              data: {
                discountBands: discountBands.map(({ minAgingDays, maxAgingDays, cashDiscountPercent, installmentDiscountPercent }) => ({ minAgingDays, maxAgingDays, cashDiscountPercent, installmentDiscountPercent })),
                commissionPercent,
              },
            })}>
              <LuSave /> Salvar regras
            </Button>
          </Flex>

          <Stack gap="2">
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="medium">Faixas de desconto</Text>
              <Button size="xs" variant="outline" onClick={() => setDiscountBands((bands) => [...bands, { minAgingDays: 0, maxAgingDays: null, cashDiscountPercent: 0, installmentDiscountPercent: 0 }])}><LuPlus /> Adicionar faixa</Button>
            </Flex>
            {!discountBands.length ? <Text fontSize="sm" color="fg.muted">Sem faixas: a carteira usa o desconto configurado nela.</Text> : discountBands.map((band, index) => (
              <SimpleGrid key={band.id ?? index} columns={{ base: 1, sm: 5 }} gap="2" alignItems="end">
                <Stack gap="1"><Text fontSize="xs">De (dias)</Text><Input size="sm" type="number" min="0" value={band.minAgingDays} onChange={(e) => setDiscountBands((bands) => bands.map((item, i) => i === index ? { ...item, minAgingDays: Number(e.target.value) } : item))} /></Stack>
                <Stack gap="1"><Text fontSize="xs">Até (dias)</Text><Input size="sm" type="number" min="0" placeholder="Sem limite" value={band.maxAgingDays ?? ''} onChange={(e) => setDiscountBands((bands) => bands.map((item, i) => i === index ? { ...item, maxAgingDays: e.target.value === '' ? null : Number(e.target.value) } : item))} /></Stack>
                <Stack gap="1"><Text fontSize="xs">Desconto à vista (%)</Text><Input size="sm" type="number" min="0" max="100" value={band.cashDiscountPercent} onChange={(e) => setDiscountBands((bands) => bands.map((item, i) => i === index ? { ...item, cashDiscountPercent: Number(e.target.value) } : item))} /></Stack>
                <Stack gap="1"><Text fontSize="xs">Desconto parcelado (%)</Text><Input size="sm" type="number" min="0" max="100" value={band.installmentDiscountPercent} onChange={(e) => setDiscountBands((bands) => bands.map((item, i) => i === index ? { ...item, installmentDiscountPercent: Number(e.target.value) } : item))} /></Stack>
                <Button size="sm" variant="ghost" colorPalette="red" onClick={() => setDiscountBands((bands) => bands.filter((_, i) => i !== index))}><LuTrash2 /> Remover</Button>
              </SimpleGrid>
            ))}
          </Stack>

          <Stack gap="1" maxW="280px">
            <Text fontSize="sm" fontWeight="medium">Comissão CobCom sobre o repasse (%)</Text>
            <Input size="sm" type="number" min="0" max="100" value={commissionPercent} onChange={(event) => setCommissionPercent(Number(event.target.value))} />
            <Text fontSize="xs" color="fg.muted">Percentual fixo do credor, aplicado ao valor de repasse de cada contrato.</Text>
          </Stack>
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

      <CreditorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        creditor={creditor}
        loading={creditorMutation.isPending}
        onSubmit={(data) => creditorMutation.mutate({ id: creditor.id, data }, { onSuccess: () => setEditOpen(false) })}
      />
    </Stack>
  );
}
