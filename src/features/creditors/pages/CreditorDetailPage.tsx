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
  Tabs,
  Dialog,
  Portal,
  Field,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { LuPencil, LuPlus, LuSave, LuTrash2, LuPlug, LuTestTube, LuDatabase, LuClock3 } from 'react-icons/lu';
import {
  useCreditorCommercialRulesQuery,
  useCreditorIxcIntegrationQuery,
  useCreditorQuery,
} from '../api/useCreditorsQuery';
import {
  useInviteCreditorUserMutation,
  useTestCreditorIxcIntegrationMutation,
  useUpdateCreditorCommercialRulesMutation,
  useUpdateCreditorMutation,
  useUpsertCreditorIxcIntegrationMutation,
} from '../api/useCreditorMutations';
import { PageHeader } from '@/components/common';
import type { CreditorDiscountBand } from '@/types/models';
import { CreditorFormDialog } from '../components/CreditorFormDialog';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

const CONTACT_TYPE_LABELS: Record<string, string> = {
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
};

export default function CreditorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: creditor, isLoading } = useCreditorQuery(id!);
  const { data: commercialRules } = useCreditorCommercialRulesQuery(id!);
  const { data: ixcIntegration } = useCreditorIxcIntegrationQuery(id!);
  const commercialRulesMutation = useUpdateCreditorCommercialRulesMutation();
  const creditorMutation = useUpdateCreditorMutation();
  const invitePortalUserMutation = useInviteCreditorUserMutation();
  const saveIxcIntegrationMutation = useUpsertCreditorIxcIntegrationMutation();
  const testIxcIntegrationMutation = useTestCreditorIxcIntegrationMutation();
  const { canEdit, canManageUsers } = usePermission();
  const [editOpen, setEditOpen] = useState(false);
  const [discountBands, setDiscountBands] = useState<CreditorDiscountBand[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalName, setPortalName] = useState('');
  const [ixcBaseUrl, setIxcBaseUrl] = useState('');
  const [ixcAccessToken, setIxcAccessToken] = useState('');
  const [ixcDialogOpen, setIxcDialogOpen] = useState(false);
  const [ixcMinOverdueDays, setIxcMinOverdueDays] = useState(0);
  const [ixcMinDebtValue, setIxcMinDebtValue] = useState(0);
  const [ixcEveryDays, setIxcEveryDays] = useState(1);
  const [ixcSyncTime, setIxcSyncTime] = useState('07:00');
  const { data: portalUsers = [] } = useQuery({
    queryKey: ['creditors', id, 'portal-users'],
    queryFn: async () =>
      (
        await api.get<
          Array<{
            id: string;
            name: string | null;
            email: string;
            status: string;
            createdAt: string;
          }>
        >(`/creditors/${id}/users`)
      ).data,
    enabled: Boolean(id && canManageUsers),
  });

  useEffect(() => {
    if (commercialRules) {
      setDiscountBands(commercialRules.discountBands);
      setCommissionPercent(Number(commercialRules.commissionPercent ?? 0));
    }
  }, [commercialRules]);

  useEffect(() => {
    if (!ixcIntegration) return;
    setIxcBaseUrl(ixcIntegration.baseUrl);
    setIxcMinOverdueDays(ixcIntegration.syncMinOverdueDays ?? 0);
    setIxcMinDebtValue(ixcIntegration.syncMinDebtValue ?? 0);
    setIxcEveryDays(ixcIntegration.syncEveryDays ?? 1);
    setIxcSyncTime(`${String(ixcIntegration.syncAtHour ?? 7).padStart(2, '0')}:${String(ixcIntegration.syncAtMinute ?? 0).padStart(2, '0')}`);
  }, [ixcIntegration]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!creditor) {
    return <Text>Credor não encontrado.</Text>;
  }

  return (
    <Stack gap="4">
      <HStack></HStack>

      <PageHeader title={creditor.name}>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <LuPencil /> Editar
          </Button>
        )}
      </PageHeader>

      <Tabs.Root defaultValue="general">
        <Tabs.List mb="4" maxW="full" overflowX="auto" overflowY="hidden" whiteSpace="nowrap">
          <Tabs.Trigger value="general">Informações gerais</Tabs.Trigger>
          {canEdit && <Tabs.Trigger value="integrations">Integrações</Tabs.Trigger>}
          {canManageUsers && <Tabs.Trigger value="users">Usuários</Tabs.Trigger>}
        </Tabs.List>
        <Tabs.Content value="general">
          <Stack gap="4">
            <Card.Root>
              <Card.Body gap="3">
                <Heading size="sm">Dados Gerais</Heading>
                <HStack gap="8" wrap="wrap">
                  <Stack gap="0">
                    <Text fontSize="xs" color="fg.muted">
                      CNPJ
                    </Text>
                    <Text>{creditor.cnpj ?? 'Não informado'}</Text>
                  </Stack>
                  <Stack gap="0">
                    <Text fontSize="xs" color="fg.muted">
                      Criado em
                    </Text>
                    <Text>{new Date(creditor.createdAt).toLocaleDateString('pt-BR')}</Text>
                  </Stack>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body gap="4">
                <Flex
                  justify="space-between"
                  align={{ base: 'start', md: 'center' }}
                  direction={{ base: 'column', md: 'row' }}
                  gap="2"
                >
                  <Stack gap="0">
                    <Heading size="sm">Regras comerciais</Heading>
                    <Text fontSize="xs" color="fg.muted">
                      A estratégia da carteira não pode ultrapassar o desconto máximo definido aqui.
                    </Text>
                  </Stack>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    loading={commercialRulesMutation.isPending}
                    onClick={() =>
                      commercialRulesMutation.mutate({
                        id: id!,
                        data: {
                          discountBands: discountBands.map(
                            ({
                              minAgingDays,
                              maxAgingDays,
                              cashDiscountPercent,
                              installmentDiscountPercent,
                            }) => ({
                              minAgingDays,
                              maxAgingDays,
                              cashDiscountPercent,
                              installmentDiscountPercent,
                            }),
                          ),
                          commissionPercent,
                        },
                      })
                    }
                  >
                    <LuSave /> Salvar regras
                  </Button>
                </Flex>

                <Stack gap="2">
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="medium">
                      Faixas de desconto
                    </Text>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        setDiscountBands((bands) => [
                          ...bands,
                          {
                            minAgingDays: 0,
                            maxAgingDays: null,
                            cashDiscountPercent: 0,
                            installmentDiscountPercent: 0,
                          },
                        ])
                      }
                    >
                      <LuPlus /> Adicionar faixa
                    </Button>
                  </Flex>
                  {!discountBands.length ? (
                    <Text fontSize="sm" color="fg.muted">
                      Sem faixas: a carteira usa o desconto configurado nela.
                    </Text>
                  ) : (
                    discountBands.map((band, index) => (
                      <SimpleGrid
                        key={band.id ?? index}
                        columns={{ base: 1, sm: 5 }}
                        gap="2"
                        alignItems="end"
                      >
                        <Stack gap="1">
                          <Text fontSize="xs">De (dias)</Text>
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            value={band.minAgingDays}
                            onChange={(e) =>
                              setDiscountBands((bands) =>
                                bands.map((item, i) =>
                                  i === index
                                    ? { ...item, minAgingDays: Number(e.target.value) }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Stack>
                        <Stack gap="1">
                          <Text fontSize="xs">Até (dias)</Text>
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            placeholder="Sem limite"
                            value={band.maxAgingDays ?? ''}
                            onChange={(e) =>
                              setDiscountBands((bands) =>
                                bands.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        maxAgingDays:
                                          e.target.value === '' ? null : Number(e.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Stack>
                        <Stack gap="1">
                          <Text fontSize="xs">Desconto à vista (%)</Text>
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            max="100"
                            value={band.cashDiscountPercent}
                            onChange={(e) =>
                              setDiscountBands((bands) =>
                                bands.map((item, i) =>
                                  i === index
                                    ? { ...item, cashDiscountPercent: Number(e.target.value) }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Stack>
                        <Stack gap="1">
                          <Text fontSize="xs">Desconto parcelado (%)</Text>
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            max="100"
                            value={band.installmentDiscountPercent}
                            onChange={(e) =>
                              setDiscountBands((bands) =>
                                bands.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        installmentDiscountPercent: Number(e.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Stack>
                        <Button
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() =>
                            setDiscountBands((bands) => bands.filter((_, i) => i !== index))
                          }
                        >
                          <LuTrash2 /> Remover
                        </Button>
                      </SimpleGrid>
                    ))
                  )}
                </Stack>

                <Stack gap="1" maxW="280px">
                  <Text fontSize="sm" fontWeight="medium">
                    Comissão CobCom sobre o repasse (%)
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(event) => setCommissionPercent(Number(event.target.value))}
                  />
                  <Text fontSize="xs" color="fg.muted">
                    Percentual fixo do credor, aplicado ao valor de repasse de cada contrato.
                  </Text>
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
                    {creditor.address.neighborhood} - {creditor.address.city}/
                    {creditor.address.state}
                  </Text>
                  <Text fontSize="sm">CEP: {creditor.address.zipCode}</Text>
                </Card.Body>
              </Card.Root>
            )}
          </Stack>
        </Tabs.Content>
        {canEdit && (
          <Tabs.Content value="integrations">
            <Stack gap="4">
              <Stack gap="0">
                <Heading size="sm">Integrações</Heading>
                <Text fontSize="sm" color="fg.muted">Selecione uma integração para configurar credenciais e regras próprias.</Text>
              </Stack>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="4">
                <Card.Root cursor="pointer" borderColor={ixcIntegration ? 'blue.500' : undefined} _hover={{ borderColor: 'blue.500', shadow: 'md' }} transition="all 0.2s" onClick={() => setIxcDialogOpen(true)}>
                  <Card.Body gap="3">
                    <Flex justify="space-between" align="start">
                      <Flex bg="blue.50" color="blue.600" rounded="lg" p="3"><LuDatabase size={24} /></Flex>
                      <Badge colorPalette={ixcIntegration ? 'green' : 'gray'}>{ixcIntegration ? 'Configurada' : 'Disponível'}</Badge>
                    </Flex>
                    <Stack gap="0"><Heading size="sm">IXC ERP</Heading><Text fontSize="sm" color="fg.muted">Cobranças e dados de contato do sistema IXC.</Text></Stack>
                    <Text fontSize="xs" color="blue.600" fontWeight="medium">Configurar integração →</Text>
                  </Card.Body>
                </Card.Root>
              </SimpleGrid>
            </Stack>

            <Dialog.Root open={ixcDialogOpen} onOpenChange={(details) => setIxcDialogOpen(details.open)} size="lg">
              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content>
                    <Dialog.Header><Stack gap="0"><Dialog.Title>Configurar IXC ERP</Dialog.Title><Text fontSize="sm" color="fg.muted">As credenciais ficam protegidas e as regras serão usadas na sincronização do ERP.</Text></Stack></Dialog.Header>
                    <Dialog.Body>
                      <Stack gap="5">
                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
                          <Field.Root required><Field.Label>URL do IXC</Field.Label><Input value={ixcBaseUrl} onChange={(event) => setIxcBaseUrl(event.target.value)} placeholder="https://ixc.exemplo.com.br" /></Field.Root>
                          <Field.Root required={!ixcIntegration?.hasAccessToken}><Field.Label>Token de acesso</Field.Label><Input type="password" value={ixcAccessToken} onChange={(event) => setIxcAccessToken(event.target.value)} placeholder={ixcIntegration?.hasAccessToken ? 'Token salvo — informe apenas para alterá-lo' : 'usuário:token'} autoComplete="new-password" /></Field.Root>
                        </SimpleGrid>
                        <Text fontSize="xs" color="fg.muted">O token é criptografado antes de ser salvo e não volta a ser exibido no CRM.</Text>
                        <Stack gap="1"><HStack><LuClock3 /><Heading size="xs">Critérios de sincronização</Heading></HStack><Text fontSize="xs" color="fg.muted">Aplicáveis às cobranças buscadas do ERP. A importação automática só será ativada quando o destino da carteira for definido.</Text></Stack>
                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
                          <Field.Root><Field.Label>Em aberto há pelo menos (dias)</Field.Label><Input type="number" min="0" value={ixcMinOverdueDays} onChange={(event) => setIxcMinOverdueDays(Number(event.target.value))} /></Field.Root>
                          <Field.Root><Field.Label>Valor mínimo (R$)</Field.Label><Input type="number" min="0" step="0.01" value={ixcMinDebtValue} onChange={(event) => setIxcMinDebtValue(Number(event.target.value))} /></Field.Root>
                          <Field.Root><Field.Label>Atualizar a cada (dias)</Field.Label><Input type="number" min="1" max="365" value={ixcEveryDays} onChange={(event) => setIxcEveryDays(Number(event.target.value))} /></Field.Root>
                          <Field.Root><Field.Label>Horário da atualização</Field.Label><Input type="time" value={ixcSyncTime} onChange={(event) => setIxcSyncTime(event.target.value)} /></Field.Root>
                        </SimpleGrid>
                      </Stack>
                    </Dialog.Body>
                    <Dialog.Footer><HStack><Button variant="outline" onClick={() => setIxcDialogOpen(false)}>Cancelar</Button><Button variant="outline" loading={testIxcIntegrationMutation.isPending} disabled={!ixcBaseUrl || (!ixcAccessToken && !ixcIntegration?.hasAccessToken)} onClick={() => testIxcIntegrationMutation.mutate({ creditorId: id!, data: { baseUrl: ixcBaseUrl, ...(ixcAccessToken ? { accessToken: ixcAccessToken } : {}) } })}><LuTestTube /> Testar conexão</Button><Button colorPalette="blue" loading={saveIxcIntegrationMutation.isPending} disabled={!ixcBaseUrl || (!ixcAccessToken && !ixcIntegration?.hasAccessToken)} onClick={() => { const [hours, minutes] = ixcSyncTime.split(':').map(Number); saveIxcIntegrationMutation.mutate({ creditorId: id!, data: { baseUrl: ixcBaseUrl, ...(ixcAccessToken ? { accessToken: ixcAccessToken } : {}), syncMinOverdueDays: ixcMinOverdueDays, syncMinDebtValue: ixcMinDebtValue, syncEveryDays: ixcEveryDays, syncAtHour: hours, syncAtMinute: minutes } }, { onSuccess: () => { setIxcAccessToken(''); setIxcDialogOpen(false); } }); }}><LuSave /> Salvar</Button></HStack></Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </Tabs.Content>
        )}
        {canManageUsers && (
          <Tabs.Content value="users">
            <Stack gap="4">
              <Card.Root>
                <Card.Body gap="3">
                  <Stack gap="0">
                    <Heading size="sm">Convidar usuário</Heading>
                    <Text fontSize="sm" color="fg.muted">
                      O acesso é somente leitura e fica restrito aos contratos deste credor.
                    </Text>
                  </Stack>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap="3" alignItems="end">
                    <Stack gap="1">
                      <Text fontSize="xs">Nome</Text>
                      <Input
                        value={portalName}
                        onChange={(event) => setPortalName(event.target.value)}
                        placeholder="Nome do usuário"
                      />
                    </Stack>
                    <Stack gap="1">
                      <Text fontSize="xs">E-mail</Text>
                      <Input
                        type="email"
                        value={portalEmail}
                        onChange={(event) => setPortalEmail(event.target.value)}
                        placeholder="usuario@empresa.com"
                      />
                    </Stack>
                    <Button
                      colorPalette="blue"
                      loading={invitePortalUserMutation.isPending}
                      disabled={!portalEmail}
                      onClick={() =>
                        invitePortalUserMutation.mutate(
                          {
                            creditorId: id!,
                            data: {
                              email: portalEmail,
                              ...(portalName ? { name: portalName } : {}),
                            },
                          },
                          {
                            onSuccess: () => {
                              setPortalEmail('');
                              setPortalName('');
                            },
                          },
                        )
                      }
                    >
                      Enviar convite
                    </Button>
                  </SimpleGrid>
                </Card.Body>
              </Card.Root>
              <Card.Root>
                <Card.Body gap="3">
                  <Heading size="sm">Usuários cadastrados</Heading>
                  {portalUsers.length === 0 ? (
                    <Text fontSize="sm" color="fg.muted">
                      Nenhum usuário cadastrado.
                    </Text>
                  ) : (
                    portalUsers.map((portalUser) => (
                      <Flex
                        key={portalUser.id}
                        justify="space-between"
                        align="center"
                        py="2"
                        borderBottomWidth="1px"
                      >
                        <Stack gap="0">
                          <Text fontWeight="medium">{portalUser.name || 'Usuário sem nome'}</Text>
                          <Text fontSize="sm" color="fg.muted">
                            {portalUser.email}
                          </Text>
                        </Stack>
                        <Badge colorPalette={portalUser.status === 'ACTIVE' ? 'green' : 'orange'}>
                          {portalUser.status === 'ACTIVE' ? 'Ativo' : 'Convite pendente'}
                        </Badge>
                      </Flex>
                    ))
                  )}
                </Card.Body>
              </Card.Root>
            </Stack>
          </Tabs.Content>
        )}
      </Tabs.Root>

      <CreditorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        creditor={creditor}
        loading={creditorMutation.isPending}
        onSubmit={(data) =>
          creditorMutation.mutate(
            { id: creditor.id, data },
            { onSuccess: () => setEditOpen(false) },
          )
        }
      />
    </Stack>
  );
}
