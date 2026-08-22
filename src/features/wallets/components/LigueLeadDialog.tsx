import { useEffect, useMemo, useState } from 'react';
import { Button, CloseButton, Dialog, Field, Input, NativeSelect, Portal, Stack, Tabs, Text, Textarea } from '@chakra-ui/react';
import { LuMessageSquare, LuPhoneCall, LuSettings2 } from 'react-icons/lu';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/formatters';

type Contract = { id: string; contractNumber: string; debtorName: string | null; debtorPhone: string | null; originalValue: number; updatedValue?: number | null; paymentStatus: string; status: string };
type Agent = { name: string; prompt: string; greetings?: string | null; modelVersion: string; voiceId?: string | null; active: boolean };

export function LigueLeadDialog({ open, onOpenChange, walletId, contracts }: { open: boolean; onOpenChange: (open: boolean) => void; walletId: string; contracts: Contract[] }) {
  const [agent, setAgent] = useState<Agent>({ name: '', prompt: '', greetings: '', modelVersion: 'lumen-1', voiceId: '', active: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('Cobrança CobCom');
  const [message, setMessage] = useState('Olá! Identificamos uma pendência. Acesse a CobCom para consultar e regularizar sua situação.');
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const eligible = useMemo(() => contracts.filter(c => c.debtorPhone && c.status === 'ACTIVE' && c.paymentStatus !== 'PAID'), [contracts]);

  useEffect(() => {
    if (!open) return;
    api.get(`/wallets/${walletId}/liguelead-agent`).then(r => r.data && setAgent({ ...r.data, greetings: r.data.greetings ?? '', voiceId: r.data.voiceId ?? '' })).catch(() => undefined);
    api.get('/liguelead/voices').then(r => setVoices((r.data?.engines ?? []).find((engine: { version: string }) => engine.version === 'lumen-1')?.voices ?? [])).catch(() => undefined);
    setSelected([]);
  }, [open, walletId]);

  const saveAgent = async () => {
    setLoading(true);
    try { await api.put(`/wallets/${walletId}/liguelead-agent`, agent); toaster.create({ type: 'success', title: 'Agente de IA salvo para esta carteira' }); }
    finally { setLoading(false); }
  };
  const dispatch = async (type: 'sms' | 'calls') => {
    if (!selected.length) return toaster.create({ type: 'warning', title: 'Selecione ao menos um contrato com telefone' });
    setLoading(true);
    try {
      const body = type === 'sms' ? { title, message, contractIds: selected } : { title, contractIds: selected };
      await api.post(`/wallets/${walletId}/liguelead/${type}`, body);
      toaster.create({ type: 'success', title: type === 'sms' ? 'SMS enfileirado para envio' : 'Ligações com IA enfileiradas' });
      setSelected([]);
    } finally { setLoading(false); }
  };
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return <Dialog.Root open={open} onOpenChange={e => onOpenChange(e.open)} size={{ mdDown: 'full', md: 'xl' }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
      <Dialog.Header><Dialog.Title>Comunicações — LigueLead</Dialog.Title></Dialog.Header>
      <Dialog.Body><Tabs.Root defaultValue="agent"><Tabs.List><Tabs.Trigger value="agent"><LuSettings2 /> Agente IA</Tabs.Trigger><Tabs.Trigger value="sms"><LuMessageSquare /> SMS</Tabs.Trigger><Tabs.Trigger value="calls"><LuPhoneCall /> Ligação IA</Tabs.Trigger></Tabs.List>
        <Tabs.Content value="agent"><Stack gap="4" pt="4"><Text fontSize="sm" color="fg.muted">Este agente fica vinculado exclusivamente a esta carteira. O contexto de cada ligação inclui nome, CPF, contrato e valor atualizado.</Text><Field.Root required><Field.Label>Nome do agente</Field.Label><Input value={agent.name} onChange={e => setAgent({ ...agent, name: e.target.value })} /></Field.Root><Field.Root required><Field.Label>Prompt do agente</Field.Label><Textarea rows={8} value={agent.prompt} onChange={e => setAgent({ ...agent, prompt: e.target.value })} placeholder="Defina a abordagem, regras e tom de voz do agente." /></Field.Root><Field.Root><Field.Label>Saudação inicial</Field.Label><Textarea value={agent.greetings ?? ''} onChange={e => setAgent({ ...agent, greetings: e.target.value })} /></Field.Root><Field.Root required><Field.Label>Voz</Field.Label><NativeSelect.Root><NativeSelect.Field value={agent.voiceId ?? ''} onChange={e => setAgent({ ...agent, voiceId: e.target.value })}><option value="">Selecione uma voz</option>{voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Button alignSelf="start" colorPalette="blue" loading={loading} onClick={saveAgent}>Salvar agente</Button></Stack></Tabs.Content>
        <Tabs.Content value="sms"><Stack gap="4" pt="4"><Field.Root required><Field.Label>Título da campanha</Field.Label><Input value={title} onChange={e => setTitle(e.target.value)} /></Field.Root><Field.Root required><Field.Label>Mensagem</Field.Label><Textarea rows={4} maxLength={1600} value={message} onChange={e => setMessage(e.target.value)} /></Field.Root><ContractSelector contracts={eligible} selected={selected} toggle={toggle} /><Button colorPalette="blue" loading={loading} onClick={() => dispatch('sms')}>Enviar SMS para {selected.length} contrato(s)</Button></Stack></Tabs.Content>
        <Tabs.Content value="calls"><Stack gap="4" pt="4"><Text fontSize="sm" color="fg.muted">As ligações usam o agente salvo nesta carteira. Nenhuma informação da dívida é inserida no prompt: ela é entregue como contexto individual e temporário para cada ligação.</Text><Field.Root required><Field.Label>Título da campanha</Field.Label><Input value={title} onChange={e => setTitle(e.target.value)} /></Field.Root><ContractSelector contracts={eligible} selected={selected} toggle={toggle} /><Button colorPalette="blue" loading={loading} onClick={() => dispatch('calls')}>Iniciar ligação IA para {selected.length} contrato(s)</Button></Stack></Tabs.Content>
      </Tabs.Root></Dialog.Body><Dialog.Footer><Dialog.ActionTrigger asChild><Button variant="outline">Fechar</Button></Dialog.ActionTrigger></Dialog.Footer><Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}

function ContractSelector({ contracts, selected, toggle }: { contracts: Contract[]; selected: string[]; toggle: (id: string) => void }) {
  if (!contracts.length) return <Text color="fg.muted">Não há contratos ativos, não pagos e com telefone nesta página.</Text>;
  return <Stack gap="2" maxH="220px" overflowY="auto" borderWidth="1px" rounded="md" p="3">{contracts.map(c => <label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} style={{ marginRight: 8 }} />{c.contractNumber} — {c.debtorName || 'Sem nome'} — {formatCurrency(c.updatedValue ?? c.originalValue)}</label>)}</Stack>;
}
