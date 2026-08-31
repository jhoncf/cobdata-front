import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Checkbox, Dialog, Field, HStack, Input, NativeSelect, Portal, Stack, Table, Text } from '@chakra-ui/react';
import { LuCopy, LuKeyRound, LuPlus, LuTrash2 } from 'react-icons/lu';
import api from '@/lib/api';
import { EmptyState, ConfirmDialog, PageHeader } from '@/components/common';
import { toaster } from '@/components/ui/toaster';
import { handleApiError } from '@/lib/error-handler';
import type { IntegrationApiKey } from '@/types/models';
import { useAllCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';

const SCOPES = [
  { value: 'PIX_CREATE', label: 'Gerar Pix', description: 'Permite gerar ou reutilizar Pix para um contrato.' },
  { value: 'CONTRACTS_READ', label: 'Consultar contratos', description: 'Permite consultar contratos pendentes por CPF/CNPJ.' },
  { value: 'CONTRACT_CONTACTS_WRITE', label: 'Atualizar contatos', description: 'Permite atualizar telefone e e-mail do contrato.' },
];

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['PIX_CREATE']);
  const [creditorId, setCreditorId] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<IntegrationApiKey | null>(null);
  const queryClient = useQueryClient();
  const { data: keys, isLoading } = useQuery({ queryKey: ['integration-api-keys'], queryFn: () => api.get<IntegrationApiKey[]>('/integrations/api-keys').then((r) => r.data) });
  const { data: creditors } = useAllCreditorsQuery();
  const create = useMutation({
    mutationFn: () => api.post('/integrations/api-keys', { name, scopes, creditorId }).then((r) => r.data),
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] }); setOpen(false); setName(''); setScopes(['PIX_CREATE']); setCreditorId(''); setCreatedToken(data.token); },
    onError: handleApiError,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/api-keys/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] }); setRevokeTarget(null); toaster.create({ type: 'success', title: 'Chave revogada' }); },
    onError: handleApiError,
  });
  const copy = async () => { if (!createdToken) return; await navigator.clipboard.writeText(createdToken); toaster.create({ type: 'success', title: 'Token copiado' }); };
  const toggleScope = (scope: string, checked: boolean) => setScopes((current) => checked ? [...current, scope] : current.filter((item) => item !== scope));

  return <Stack gap="6">
    <PageHeader title="Chaves de API">
      <Button size="sm" colorPalette="blue" onClick={() => setOpen(true)}><LuPlus /> Nova chave</Button>
    </PageHeader>
    <Text color="fg.muted">Crie uma chave por integração. O token completo é exibido uma única vez.</Text>
    {!isLoading && !keys?.length ? <EmptyState title="Nenhuma chave criada" description="Crie uma chave para liberar uma integração externa." /> :
      <Table.ScrollArea borderWidth="1px" rounded="md"><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Nome</Table.ColumnHeader><Table.ColumnHeader>Credor autorizado</Table.ColumnHeader><Table.ColumnHeader>Token</Table.ColumnHeader><Table.ColumnHeader>Permissões</Table.ColumnHeader><Table.ColumnHeader>Último uso</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header><Table.Body>{keys?.map((key) => <Table.Row key={key.id}><Table.Cell>{key.name}</Table.Cell><Table.Cell>{key.creditor ? <><Text>{key.creditor.name}</Text><Text fontSize="xs" color="fg.muted">{key.creditor.cnpj ?? 'CNPJ não informado'}</Text></> : 'Não vinculado (bloqueada)'}</Table.Cell><Table.Cell fontFamily="mono">{key.tokenPrefix}…</Table.Cell><Table.Cell><HStack gap="1" wrap="wrap">{key.scopes.map((scope) => <Badge key={scope} size="sm">{scope}</Badge>)}</HStack></Table.Cell><Table.Cell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('pt-BR') : 'Nunca'}</Table.Cell><Table.Cell><Badge colorPalette={key.revokedAt ? 'red' : 'green'}>{key.revokedAt ? 'Revogada' : 'Ativa'}</Badge></Table.Cell><Table.Cell>{!key.revokedAt && <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setRevokeTarget(key)} aria-label="Revogar chave"><LuTrash2 /></Button>}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></Table.ScrollArea>}
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>Nova chave de API</Dialog.Title></Dialog.Header><Dialog.Body><Stack gap="4"><Field.Root required><Field.Label>Nome da integração</Field.Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Parceiro WhatsApp" /></Field.Root><Field.Root required><Field.Label>Credor autorizado</Field.Label><NativeSelect.Root><NativeSelect.Field value={creditorId} onChange={(e) => setCreditorId(e.target.value)}><option value="">Selecione o credor</option>{creditors?.data.map((creditor) => <option key={creditor.id} value={creditor.id}>{creditor.name}{creditor.cnpj ? ` — ${creditor.cnpj}` : ''}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Text fontSize="xs" color="fg.muted">A chave só poderá acessar contratos das carteiras deste credor.</Text></Field.Root><Field.Root required><Field.Label>Permissões</Field.Label><Stack gap="2">{SCOPES.map((scope) => <Checkbox.Root key={scope.value} checked={scopes.includes(scope.value)} onCheckedChange={(e) => toggleScope(scope.value, e.checked === true)}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label><Text fontWeight="medium">{scope.label}</Text><Text fontSize="xs" color="fg.muted">{scope.description}</Text></Checkbox.Label></Checkbox.Root>)}</Stack></Field.Root></Stack></Dialog.Body><Dialog.Footer><HStack><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button colorPalette="blue" loading={create.isPending} disabled={!name || !creditorId || !scopes.length} onClick={() => create.mutate()}><LuKeyRound /> Gerar chave</Button></HStack></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    <Dialog.Root open={!!createdToken} onOpenChange={(e) => !e.open && setCreatedToken(null)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>Copie seu token agora</Dialog.Title></Dialog.Header><Dialog.Body><Text mb="3">Ele não será exibido novamente.</Text><Input value={createdToken ?? ''} readOnly fontFamily="mono" /></Dialog.Body><Dialog.Footer><HStack><Button onClick={copy}><LuCopy /> Copiar token</Button><Button colorPalette="blue" onClick={() => setCreatedToken(null)}>Concluído</Button></HStack></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    <ConfirmDialog open={!!revokeTarget} onOpenChange={(isOpen) => !isOpen && setRevokeTarget(null)} title="Revogar chave" message={`Revogar a chave "${revokeTarget?.name ?? ''}"? A integração deixará de funcionar imediatamente.`} confirmLabel="Revogar" colorPalette="red" loading={revoke.isPending} onConfirm={() => revokeTarget && revoke.mutate(revokeTarget.id)} />
  </Stack>;
}
