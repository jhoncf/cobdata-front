import { useEffect, useMemo, useState } from 'react';
import { Button, CloseButton, Dialog, Field, HStack, Input, NativeSelect, Portal, Stack, Tabs, Text, Textarea } from '@chakra-ui/react';
import { LuMail, LuMessageSquare, LuPencil, LuPhoneCall, LuPlus, LuSettings2, LuTrash2 } from 'react-icons/lu';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/formatters';

type Contract = { id: string; contractNumber: string; debtorName: string | null; debtorPhone: string | null; debtorEmail?: string | null; originalValue: number; updatedValue: number; paymentStatus: string; status: string };
type Agent = { name: string; prompt: string; greetings?: string | null; modelVersion: string; voiceId?: string | null; active: boolean };
type EmailTemplateCriteria = { minAgingDays?: number | null; maxAgingDays?: number | null; minOfferValue?: number | null; maxOfferValue?: number | null; paymentStatus?: string | null };
type EmailTemplate = { id: string; name: string; subject: string; body: string; isDefault: boolean; criteria: EmailTemplateCriteria; updatedAt?: string };
type EmailTemplateForm = Omit<EmailTemplate, 'id' | 'updatedAt'>;

const emptyEmailTemplate = (): EmailTemplateForm => ({
  name: '', subject: '', body: 'Olá, {{devedor_nome}}.\n\nHá uma oferta disponível para o contrato {{numero_contrato}}. Acesse {{link_pagamento}} para consultar os detalhes e gerar seu Pix.', isDefault: false,
  criteria: { minAgingDays: null, maxAgingDays: null, minOfferValue: null, maxOfferValue: null, paymentStatus: 'OPEN' },
});

export function LigueLeadDialog({ open, onOpenChange, walletId, contracts, initialContractId, initialTab = 'agent', smsTemplate, filteredSmsFilters, filteredSmsCount }: { open: boolean; onOpenChange: (open: boolean) => void; walletId: string; contracts: Contract[]; initialContractId?: string; initialTab?: 'agent' | 'sms' | 'calls' | 'email'; smsTemplate?: string | null; filteredSmsFilters?: Record<string, unknown>; filteredSmsCount?: number }) {
  const [agent, setAgent] = useState<Agent>({ name: '', prompt: '', greetings: '', modelVersion: 'horizon-1', voiceId: '', active: true });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('Oferta CobCom');
  const [message, setMessage] = useState('Confira os detalhes pelo link seguro.');
  const [loading, setLoading] = useState(false);
  const [engines, setEngines] = useState<{ version: string; voices: { id: string; name: string }[] }[]>([]);
  const [activeTab, setActiveTab] = useState<'agent' | 'sms' | 'calls' | 'email'>(initialTab);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailTemplateForm, setEmailTemplateForm] = useState<EmailTemplateForm>(emptyEmailTemplate);
  const [editingEmailTemplateId, setEditingEmailTemplateId] = useState<string | null>(null);
  const [showEmailTemplateForm, setShowEmailTemplateForm] = useState(false);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  const eligible = useMemo(() => contracts.filter(c => c.debtorPhone?.trim() && c.status === 'ACTIVE' && c.paymentStatus !== 'PAID'), [contracts]);
  const withoutPhone = useMemo(() => contracts.filter(c => !c.debtorPhone?.trim() && c.status === 'ACTIVE' && c.paymentStatus !== 'PAID'), [contracts]);
  const eligibleForEmail = useMemo(() => contracts.filter(c => c.debtorEmail?.trim() && c.status === 'ACTIVE' && c.paymentStatus !== 'PAID'), [contracts]);
  const withoutEmail = useMemo(() => contracts.filter(c => !c.debtorEmail?.trim() && c.status === 'ACTIVE' && c.paymentStatus !== 'PAID'), [contracts]);

  useEffect(() => {
    if (!open) return;
    api.get(`/wallets/${walletId}/liguelead-agent`).then((r) => {
      if (!r.data) return;
      const { name, prompt, greetings, modelVersion, voiceId, active } = r.data;
      setAgent({
        name,
        prompt,
        greetings: greetings ?? '',
        modelVersion,
        voiceId: voiceId ?? '',
        active,
      });
    }).catch(() => undefined);
    api.get('/liguelead/voices').then(r => setEngines(r.data?.engines ?? [])).catch(() => undefined);
    api.get(`/wallets/${walletId}/email-templates`).then((r) => {
      const templates = r.data?.data ?? r.data ?? [];
      if (!Array.isArray(templates)) return;
      setEmailTemplates(templates);
      setSelectedEmailTemplateId(templates.find((template: EmailTemplate) => template.isDefault)?.id ?? templates[0]?.id ?? '');
    }).catch(() => setEmailTemplates([]));
    setSelected(initialContractId ? [initialContractId] : []);
    setActiveTab(initialTab);
    setMessage(smsTemplate ?? 'Confira os detalhes pelo link seguro.');
  }, [open, walletId, initialContractId, initialTab, smsTemplate]);

  const voices = useMemo(() => engines.find(engine => engine.version === agent.modelVersion)?.voices ?? [], [agent.modelVersion, engines]);

  const saveAgent = async () => {
    setLoading(true);
    try { await api.put(`/wallets/${walletId}/liguelead-agent`, agent); toaster.create({ type: 'success', title: 'Agente de IA salvo para esta carteira' }); }
    finally { setLoading(false); }
  };
  const dispatch = async (type: 'sms' | 'calls') => {
    const isFilteredSms = type === 'sms' && filteredSmsFilters !== undefined;
    if (isFilteredSms) {
      setLoading(true);
      try {
        await api.post(`/wallets/${walletId}/liguelead/sms/filtered`, { title, message, filters: filteredSmsFilters });
        toaster.create({ type: 'success', title: `Disparo de SMS enfileirado para os ${filteredSmsCount ?? 0} contrato(s) filtrado(s)` });
        onOpenChange(false);
      } finally { setLoading(false); }
      return;
    }
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
  const startEmailTemplate = (template?: EmailTemplate) => {
    setEditingEmailTemplateId(template?.id ?? null);
    setEmailTemplateForm(template ? { name: template.name, subject: template.subject, body: template.body, isDefault: template.isDefault, criteria: { ...template.criteria } } : emptyEmailTemplate());
    setShowEmailTemplateForm(true);
  };
  const saveEmailTemplate = async () => {
    if (!emailTemplateForm.name.trim() || !emailTemplateForm.subject.trim() || !emailTemplateForm.body.trim()) {
      toaster.create({ type: 'warning', title: 'Preencha o nome, assunto e corpo do template' });
      return;
    }
    setLoading(true);
    try {
      const request = editingEmailTemplateId
        ? api.put(`/wallets/${walletId}/email-templates/${editingEmailTemplateId}`, emailTemplateForm)
        : api.post(`/wallets/${walletId}/email-templates`, emailTemplateForm);
      const response = await request;
      const saved = response.data?.data ?? response.data;
      setEmailTemplates((current) => {
        const normalized: EmailTemplate = saved?.id ? { ...saved, criteria: saved.criteria ?? {} } : { ...emailTemplateForm, id: editingEmailTemplateId ?? crypto.randomUUID() };
        const withoutCurrent = current.filter(template => template.id !== normalized.id).map(template => ({ ...template, isDefault: normalized.isDefault ? false : template.isDefault }));
        return [...withoutCurrent, normalized];
      });
      setSelectedEmailTemplateId(saved?.id ?? editingEmailTemplateId ?? '');
      setShowEmailTemplateForm(false);
      toaster.create({ type: 'success', title: 'Template de e-mail salvo' });
    } finally { setLoading(false); }
  };
  const removeEmailTemplate = async (template: EmailTemplate) => {
    setLoading(true);
    try {
      await api.delete(`/wallets/${walletId}/email-templates/${template.id}`);
      setEmailTemplates(current => current.filter(item => item.id !== template.id));
      if (selectedEmailTemplateId === template.id) setSelectedEmailTemplateId('');
      toaster.create({ type: 'success', title: 'Template de e-mail removido' });
    } finally { setLoading(false); }
  };
  const dispatchEmail = async () => {
    if (!selectedEmailTemplateId) return toaster.create({ type: 'warning', title: 'Selecione um template de e-mail' });
    if (!selected.length) return toaster.create({ type: 'warning', title: 'Selecione ao menos um contrato com e-mail' });
    setLoading(true);
    try {
      await api.post(`/wallets/${walletId}/email-templates/${selectedEmailTemplateId}/send`, { contractIds: selected });
      toaster.create({ type: 'success', title: 'E-mail enfileirado para envio' });
      setSelected([]);
    } finally { setLoading(false); }
  };

  return <Dialog.Root open={open} onOpenChange={e => onOpenChange(e.open)} size={{ mdDown: 'full', md: 'xl' }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
      <Dialog.Header><Dialog.Title>Comunicações — LigueLead</Dialog.Title></Dialog.Header>
      <Dialog.Body><Tabs.Root value={activeTab} onValueChange={event => setActiveTab(event.value as 'agent' | 'sms' | 'calls' | 'email')}><Tabs.List maxW="full" overflowX="auto" overflowY="hidden" whiteSpace="nowrap"><Tabs.Trigger value="agent"><LuSettings2 /> Agente IA</Tabs.Trigger><Tabs.Trigger value="sms"><LuMessageSquare /> SMS</Tabs.Trigger><Tabs.Trigger value="calls"><LuPhoneCall /> Ligação IA</Tabs.Trigger><Tabs.Trigger value="email"><LuMail /> E-mail</Tabs.Trigger></Tabs.List>
        <Tabs.Content value="agent"><Stack gap="4" pt="4"><Text fontSize="sm" color="fg.muted">Este agente fica vinculado exclusivamente a esta carteira. Cada ligação recebe contexto privado com titular, contrato, vencimento, oferta e confirmação segura por CPF.</Text><Field.Root required><Field.Label>Nome do agente</Field.Label><Input value={agent.name} onChange={e => setAgent({ ...agent, name: e.target.value })} /></Field.Root><Field.Root required><Field.Label>Modelo</Field.Label><NativeSelect.Root><NativeSelect.Field value={agent.modelVersion} onChange={e => setAgent({ ...agent, modelVersion: e.target.value, voiceId: '' })}><option value="horizon-1">Horizon</option><option value="lumen-1">Lumen 1</option><option value="lumen-mini">Lumen Mini</option><option value="prisma-1">Prisma 1</option>{engines.filter(engine => !['horizon-1', 'lumen-1', 'lumen-mini', 'prisma-1'].includes(engine.version)).map(engine => <option key={engine.version} value={engine.version}>{engine.version}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Text fontSize="xs" color="fg.muted">Horizon está disponível para os testes. Escolha uma voz compatível antes de salvar.</Text></Field.Root><Field.Root required><Field.Label>Prompt do agente</Field.Label><Textarea rows={8} value={agent.prompt} onChange={e => setAgent({ ...agent, prompt: e.target.value })} placeholder="Defina a abordagem, regras e tom de voz do agente." /></Field.Root><Field.Root><Field.Label>Saudação inicial</Field.Label><Textarea value={agent.greetings ?? ''} onChange={e => setAgent({ ...agent, greetings: e.target.value })} /></Field.Root><Field.Root required><Field.Label>Voz</Field.Label><NativeSelect.Root><NativeSelect.Field value={agent.voiceId ?? ''} onChange={e => setAgent({ ...agent, voiceId: e.target.value })}><option value="">Selecione uma voz</option>{voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Button alignSelf="start" colorPalette="blue" loading={loading} onClick={saveAgent}>Salvar agente</Button></Stack></Tabs.Content>
        <Tabs.Content value="sms"><Stack gap="4" pt="4"><Text fontSize="sm" color="fg.muted">O CRM inicia a mensagem com a oferta válida e o nome do credor. Ao final, inclui automaticamente o link seguro da landing page, filtrado pelo CPF e pelo contrato do destinatário.</Text>{filteredSmsFilters !== undefined && <Text fontSize="sm" color="fg.muted">O disparo considerará os {filteredSmsCount ?? 0} contrato(s) encontrados pelos filtros atuais. Contratos sem telefone, inativos ou pagos serão ignorados.</Text>}<Field.Root required><Field.Label>Título da campanha</Field.Label><Input value={title} onChange={e => setTitle(e.target.value)} /></Field.Root><Field.Root required><Field.Label>Complemento da mensagem</Field.Label><Textarea rows={4} maxLength={1400} value={message} onChange={e => setMessage(e.target.value)} /></Field.Root>{filteredSmsFilters === undefined && <ContractSelector contracts={eligible} withoutPhoneCount={withoutPhone.length} selected={selected} toggle={toggle} selectAll={() => setSelected(eligible.map(c => c.id))} clearSelection={() => setSelected([])} />}<Button colorPalette="blue" loading={loading} onClick={() => dispatch('sms')}>{filteredSmsFilters !== undefined ? `Enviar SMS para ${filteredSmsCount ?? 0} contrato(s) filtrado(s)` : `Enviar SMS para ${selected.length} contrato(s)`}</Button></Stack></Tabs.Content>
        <Tabs.Content value="calls"><Stack gap="4" pt="4"><Text fontSize="sm" color="fg.muted">Cada contrato selecionado gera uma ligação individual. Contratos sem telefone, inativos ou pagos não podem ser selecionados nem enviados.</Text><Field.Root required><Field.Label>Título da campanha</Field.Label><Input value={title} onChange={e => setTitle(e.target.value)} /></Field.Root><ContractSelector contracts={eligible} withoutPhoneCount={withoutPhone.length} selected={selected} toggle={toggle} selectAll={() => setSelected(eligible.map(c => c.id))} clearSelection={() => setSelected([])} /><Button colorPalette="blue" loading={loading} onClick={() => dispatch('calls')}>Iniciar {selected.length} ligação(ões) com IA</Button></Stack></Tabs.Content>
        <Tabs.Content value="email"><Stack gap="4" pt="4">
          <Stack gap="1"><HStack justify="space-between" align="start"><Stack gap="1"><Text fontWeight="semibold">Templates de e-mail</Text><Text fontSize="sm" color="fg.muted">Crie modelos por carteira. O template padrão será sugerido nos envios, mas você pode escolher outro para um contrato específico.</Text></Stack><Button size="sm" colorPalette="blue" onClick={() => startEmailTemplate()}><LuPlus /> Novo template</Button></HStack><Text fontSize="xs" color="fg.muted">Variáveis disponíveis: {'{{devedor_nome}}'}, {'{{numero_contrato}}'}, {'{{valor_oferta}}'}, {'{{credor_nome}}'} e {'{{link_pagamento}}'}. O link é único e registra abertura e clique.</Text></Stack>
          {showEmailTemplateForm ? <EmailTemplateEditor form={emailTemplateForm} setForm={setEmailTemplateForm} onCancel={() => setShowEmailTemplateForm(false)} onSave={saveEmailTemplate} loading={loading} /> : <EmailTemplateList templates={emailTemplates} selectedId={selectedEmailTemplateId} onSelect={setSelectedEmailTemplateId} onEdit={startEmailTemplate} onRemove={removeEmailTemplate} loading={loading} />}
          {!showEmailTemplateForm && emailTemplates.length > 0 && <Stack gap="3" pt="2" borderTopWidth="1px"><Field.Root><Field.Label>Template para este envio</Field.Label><NativeSelect.Root><NativeSelect.Field value={selectedEmailTemplateId} onChange={e => setSelectedEmailTemplateId(e.target.value)}>{emailTemplates.map(template => <option key={template.id} value={template.id}>{template.name}{template.isDefault ? ' (padrão)' : ''}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root><Text fontSize="sm" color="fg.muted">O e-mail será enviado pelo remetente configurado no SES. A abertura e o acesso ao link da oferta entram no histórico do contrato.</Text><EmailContractSelector contracts={eligibleForEmail} withoutEmailCount={withoutEmail.length} selected={selected} toggle={toggle} selectAll={() => setSelected(eligibleForEmail.map(c => c.id))} clearSelection={() => setSelected([])} /><Button alignSelf="start" colorPalette="blue" loading={loading} onClick={dispatchEmail}><LuMail /> Enviar e-mail para {selected.length} contrato(s)</Button></Stack>}
        </Stack></Tabs.Content>
      </Tabs.Root></Dialog.Body><Dialog.Footer><Dialog.ActionTrigger asChild><Button variant="outline">Fechar</Button></Dialog.ActionTrigger></Dialog.Footer><Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}

function EmailTemplateList({ templates, selectedId, onSelect, onEdit, onRemove, loading }: { templates: EmailTemplate[]; selectedId: string; onSelect: (id: string) => void; onEdit: (template: EmailTemplate) => void; onRemove: (template: EmailTemplate) => void; loading: boolean }) {
  if (!templates.length) return <Stack align="start" gap="2" borderWidth="1px" borderStyle="dashed" rounded="md" p="4"><Text fontWeight="medium">Nenhum template cadastrado</Text><Text fontSize="sm" color="fg.muted">Crie o primeiro template de e-mail desta carteira para definir assunto, conteúdo e regras de uso.</Text></Stack>;
  return <Stack gap="2">{templates.map(template => <HStack key={template.id} align="center" gap="3" borderWidth="1px" rounded="md" p="3" bg={selectedId === template.id ? 'blue.subtle' : undefined} cursor="pointer" onClick={() => onSelect(template.id)}><Stack gap="0" flex="1" minW="0"><HStack><Text fontWeight="semibold" truncate>{template.name}</Text>{template.isDefault && <Text fontSize="xs" color="blue.fg" fontWeight="medium">Padrão</Text>}</HStack><Text fontSize="sm" color="fg.muted" truncate>{template.subject}</Text><Text fontSize="xs" color="fg.muted">{criteriaSummary(template.criteria)}</Text></Stack><Button size="xs" variant="ghost" aria-label={`Editar ${template.name}`} onClick={(event) => { event.stopPropagation(); onEdit(template); }}><LuPencil /></Button><Button size="xs" variant="ghost" colorPalette="red" aria-label={`Excluir ${template.name}`} loading={loading} onClick={(event) => { event.stopPropagation(); onRemove(template); }}><LuTrash2 /></Button></HStack>)}</Stack>;
}

function EmailTemplateEditor({ form, setForm, onCancel, onSave, loading }: { form: EmailTemplateForm; setForm: (form: EmailTemplateForm) => void; onCancel: () => void; onSave: () => void; loading: boolean }) {
  const criteria = form.criteria;
  const updateCriteria = (key: keyof EmailTemplateCriteria, value: number | string | null) => setForm({ ...form, criteria: { ...criteria, [key]: value } });
  return <Stack gap="4" borderWidth="1px" rounded="md" p={{ base: '3', md: '4' }}>
    <HStack justify="space-between"><Text fontWeight="semibold">Configuração do template</Text><Button size="xs" variant="outline" onClick={onCancel}>Cancelar</Button></HStack>
    <Field.Root required><Field.Label>Nome do template</Field.Label><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Oferta inicial — até 90 dias" /></Field.Root>
    <Field.Root required><Field.Label>Assunto do e-mail</Field.Label><Input value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} placeholder="Uma oferta está disponível para você" /></Field.Root>
    <Field.Root required><Field.Label>Corpo do e-mail</Field.Label><Textarea rows={8} value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} placeholder="Escreva o conteúdo do e-mail e utilize as variáveis disponíveis." /></Field.Root>
    <Stack gap="2"><Text fontSize="sm" fontWeight="semibold">Critérios de aplicação</Text><Text fontSize="xs" color="fg.muted">Os critérios orientam a escolha automática do template. No envio individual, o operador pode selecionar qualquer template da carteira.</Text><HStack align="end" flexWrap="wrap"><Field.Root flex="1" minW="130px"><Field.Label>Age mínimo (dias)</Field.Label><Input type="number" min="0" value={criteria.minAgingDays ?? ''} onChange={event => updateCriteria('minAgingDays', event.target.value === '' ? null : Number(event.target.value))} /></Field.Root><Field.Root flex="1" minW="130px"><Field.Label>Age máximo (dias)</Field.Label><Input type="number" min="0" value={criteria.maxAgingDays ?? ''} onChange={event => updateCriteria('maxAgingDays', event.target.value === '' ? null : Number(event.target.value))} /></Field.Root><Field.Root flex="1" minW="130px"><Field.Label>Oferta mínima (R$)</Field.Label><Input type="number" min="0" step="0.01" value={criteria.minOfferValue ?? ''} onChange={event => updateCriteria('minOfferValue', event.target.value === '' ? null : Number(event.target.value))} /></Field.Root><Field.Root flex="1" minW="130px"><Field.Label>Oferta máxima (R$)</Field.Label><Input type="number" min="0" step="0.01" value={criteria.maxOfferValue ?? ''} onChange={event => updateCriteria('maxOfferValue', event.target.value === '' ? null : Number(event.target.value))} /></Field.Root></HStack><Field.Root maxW={{ md: '260px' }}><Field.Label>Situação financeira</Field.Label><NativeSelect.Root><NativeSelect.Field value={criteria.paymentStatus ?? ''} onChange={event => updateCriteria('paymentStatus', event.target.value || null)}><option value="">Qualquer situação</option><option value="OPEN">Em aberto</option><option value="IN_AGREEMENT">Em acordo</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root></Stack>
    <Field.Root><HStack><input id="email-template-default" type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} /><Field.Label htmlFor="email-template-default" mb="0">Usar como template padrão desta carteira</Field.Label></HStack><Text fontSize="xs" color="fg.muted">Ao definir este template como padrão, o padrão anterior deixa de ser utilizado.</Text></Field.Root>
    <Button alignSelf="start" colorPalette="blue" loading={loading} onClick={onSave}>Salvar template</Button>
  </Stack>;
}

function EmailContractSelector({ contracts, withoutEmailCount, selected, toggle, selectAll, clearSelection }: { contracts: Contract[]; withoutEmailCount: number; selected: string[]; toggle: (id: string) => void; selectAll: () => void; clearSelection: () => void }) {
  if (!contracts.length) return <Text color="fg.muted">Não há contratos ativos, não pagos e com e-mail nesta página.{withoutEmailCount ? ` ${withoutEmailCount} contrato(s) sem e-mail não pode(m) receber comunicação.` : ''}</Text>;
  return <Stack gap="2"><Text fontSize="sm" color="fg.muted">{contracts.length} contrato(s) elegível(is) nesta página.{withoutEmailCount ? ` ${withoutEmailCount} contrato(s) sem e-mail foram bloqueados.` : ''}</Text><HStack gap="2"><Button size="xs" variant="outline" onClick={selectAll}>Selecionar todos</Button><Button size="xs" variant="ghost" onClick={clearSelection} disabled={!selected.length}>Limpar seleção</Button><Text fontSize="sm">{selected.length} selecionado(s)</Text></HStack><Stack gap="2" maxH="220px" overflowY="auto" borderWidth="1px" rounded="md" p="3">{contracts.map(contract => <label key={contract.id}><input type="checkbox" checked={selected.includes(contract.id)} onChange={() => toggle(contract.id)} style={{ marginRight: 8 }} />{contract.contractNumber} — {contract.debtorName || 'Sem nome'} — {contract.debtorEmail}</label>)}</Stack></Stack>;
}

function criteriaSummary(criteria: EmailTemplateCriteria) {
  const parts: string[] = [];
  if (criteria.minAgingDays != null || criteria.maxAgingDays != null) parts.push(`Aging ${criteria.minAgingDays ?? 0}${criteria.maxAgingDays != null ? `–${criteria.maxAgingDays}` : '+'} dias`);
  if (criteria.minOfferValue != null || criteria.maxOfferValue != null) parts.push(`Oferta ${criteria.minOfferValue ?? 0}${criteria.maxOfferValue != null ? `–${criteria.maxOfferValue}` : '+'}`);
  if (criteria.paymentStatus === 'OPEN') parts.push('Em aberto');
  if (criteria.paymentStatus === 'IN_AGREEMENT') parts.push('Em acordo');
  return parts.length ? parts.join(' • ') : 'Sem critérios: disponível para todos os contratos elegíveis';
}

function ContractSelector({ contracts, withoutPhoneCount, selected, toggle, selectAll, clearSelection }: { contracts: Contract[]; withoutPhoneCount: number; selected: string[]; toggle: (id: string) => void; selectAll: () => void; clearSelection: () => void }) {
  if (!contracts.length) return <Text color="fg.muted">Não há contratos ativos, não pagos e com telefone nesta página.{withoutPhoneCount ? ` ${withoutPhoneCount} contrato(s) sem telefone não pode(m) receber comunicação.` : ''}</Text>;
  return <Stack gap="2">
    <Text fontSize="sm" color="fg.muted">{contracts.length} contrato(s) elegível(is) nesta página.{withoutPhoneCount ? ` ${withoutPhoneCount} contrato(s) sem telefone foram bloqueados.` : ''}</Text>
    <HStack gap="2"><Button size="xs" variant="outline" onClick={selectAll}>Selecionar todos</Button><Button size="xs" variant="ghost" onClick={clearSelection} disabled={!selected.length}>Limpar seleção</Button><Text fontSize="sm">{selected.length} selecionado(s)</Text></HStack>
    <Stack gap="2" maxH="220px" overflowY="auto" borderWidth="1px" rounded="md" p="3">{contracts.map(c => <label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} style={{ marginRight: 8 }} />{c.contractNumber} — {c.debtorName || 'Sem nome'} — {formatCurrency(c.updatedValue)}</label>)}</Stack>
  </Stack>;
}
