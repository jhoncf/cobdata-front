import { useState } from 'react';
import { Button, Dialog, Field, HStack, Input, Portal, Stack, Table, Textarea } from '@chakra-ui/react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/common';
import { useCreateSerasaWalletMutation, useDeleteSerasaWalletMutation, useSerasaWalletsQuery } from '../api/useSerasaWallets';
import type { SerasaWallet } from '@/types/models';

export default function SerasaWalletsPage() {
  const [open, setOpen] = useState(false);
  const [externalWalletId, setExternalWalletId] = useState('');
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState('');
  const [removeTarget, setRemoveTarget] = useState<SerasaWallet | null>(null);
  const { data, isLoading } = useSerasaWalletsQuery();
  const create = useCreateSerasaWalletMutation();
  const remove = useDeleteSerasaWalletMutation();
  const submit = () => create.mutate({ externalWalletId, name, criteria: criteria || undefined }, { onSuccess: () => { setOpen(false); setExternalWalletId(''); setName(''); setCriteria(''); } });
  return <Stack gap="6">
    <PageHeader title="Integração Serasa">
      <Button colorPalette="blue" size="sm" onClick={() => setOpen(true)}><LuPlus /> Nova carteira Serasa</Button>
    </PageHeader>
    {!isLoading && !data?.length ? <EmptyState title="Nenhuma carteira Serasa cadastrada" description="Cadastre a ID e as condições da carteira criada no portal Serasa." /> :
      <Table.ScrollArea borderWidth="1px" rounded="md"><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Nome</Table.ColumnHeader><Table.ColumnHeader>ID Serasa</Table.ColumnHeader><Table.ColumnHeader>Critérios / condições</Table.ColumnHeader><Table.ColumnHeader>Carteiras CRM</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header><Table.Body>{data?.map((wallet) => <Table.Row key={wallet.id}><Table.Cell>{wallet.name}</Table.Cell><Table.Cell>{wallet.externalWalletId}</Table.Cell><Table.Cell maxW="420px">{wallet.criteria || '—'}</Table.Cell><Table.Cell>{wallet._count?.crmWallets ?? 0}</Table.Cell><Table.Cell><Button size="xs" variant="ghost" colorPalette="red" onClick={() => setRemoveTarget(wallet)} aria-label="Excluir carteira Serasa"><LuTrash2 /></Button></Table.Cell></Table.Row>)}</Table.Body></Table.Root></Table.ScrollArea>}
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content><Dialog.Header><Dialog.Title>Nova carteira Serasa</Dialog.Title></Dialog.Header><Dialog.Body><Stack gap="4"><Field.Root required><Field.Label>Nome</Field.Label><Input value={name} onChange={(e) => setName(e.target.value)} /></Field.Root><Field.Root required><Field.Label>ID da carteira no Serasa</Field.Label><Input value={externalWalletId} onChange={(e) => setExternalWalletId(e.target.value)} /></Field.Root><Field.Root><Field.Label>Critérios e condições</Field.Label><Textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="Ex.: até 30% de desconto, 6 parcelas..." /></Field.Root></Stack></Dialog.Body><Dialog.Footer><HStack><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button colorPalette="blue" disabled={!name || !externalWalletId} loading={create.isPending} onClick={submit}>Cadastrar</Button></HStack></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
    <ConfirmDialog open={!!removeTarget} onOpenChange={(isOpen) => !isOpen && setRemoveTarget(null)} title="Excluir carteira Serasa" message={`Excluir "${removeTarget?.name ?? ''}"? Ela não pode estar vinculada a uma carteira CRM.`} confirmLabel="Excluir" colorPalette="red" loading={remove.isPending} onConfirm={() => removeTarget && remove.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) })} />
  </Stack>;
}
