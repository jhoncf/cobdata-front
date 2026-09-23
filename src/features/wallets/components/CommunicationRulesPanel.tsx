import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Box, Button, Card, Flex, HStack, Input, NativeSelect, Separator, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react';
import { LuCopy, LuPlus, LuSave, LuTrash2 } from 'react-icons/lu';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';

type Channel = 'SMS' | 'EMAIL' | 'AI_VOICE_CALL';
type Condition = { field: string; operator: string; value: string | number };
type Template = { id: string; name: string; channel: Channel; content: string; isDefault: boolean };
type Rule = { id: string; name: string; active: boolean; schedule: { frequency: 'DAILY' | 'WEEKLY'; time: string }; conditions: Condition[]; templateId: string; template: Template };

const channelNames: Record<Channel, string> = { SMS: 'SMS', EMAIL: 'E-mail', AI_VOICE_CALL: 'Ligação com IA' };
const blankCondition: Condition = { field: 'paymentStatus', operator: 'eq', value: 'OPEN' };
const fieldNames: Record<string, string> = { paymentStatus: 'status financeiro', offerValue: 'valor da oferta', agingDays: 'tempo de dívida' };
const operatorNames: Record<string, string> = { eq: 'igual a', gt: 'maior que', lt: 'menor que' };

export function CommunicationRulesPanel({ walletId, canEdit }: { walletId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'rules' | 'templates'>('rules');
  const [selectedRuleId, setSelectedRuleId] = useState<string | 'new' | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [time, setTime] = useState('07:00');
  const [conditions, setConditions] = useState<Condition[]>([{ ...blankCondition }]);
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateChannel, setTemplateChannel] = useState<Channel>('SMS');
  const [templateContent, setTemplateContent] = useState('');

  const templatesQuery = useQuery({ queryKey: ['communication-templates', walletId], queryFn: async () => (await api.get<Template[]>(`/wallets/${walletId}/communication/templates`)).data });
  const rulesQuery = useQuery({ queryKey: ['communication-rules', walletId], queryFn: async () => (await api.get<Rule[]>(`/wallets/${walletId}/communication/rules`)).data });
  const templates = templatesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId), [templateId, templates]);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['communication-templates', walletId] }), queryClient.invalidateQueries({ queryKey: ['communication-rules', walletId] })]);

  const createRule = useMutation({
    mutationFn: async () => api.post(`/wallets/${walletId}/communication/rules`, { name: ruleName, schedule: { frequency, time }, conditions, templateId }),
    onSuccess: () => { void refresh(); setSelectedRuleId(null); toaster.create({ title: 'Régua criada', type: 'success' }); },
    onError: () => toaster.create({ title: 'Não foi possível criar a régua', type: 'error' }),
  });
  const toggleRule = useMutation({ mutationFn: async (rule: Rule) => api.patch(`/wallets/${walletId}/communication/rules/${rule.id}`, { active: !rule.active }), onSuccess: () => void refresh() });
  const deleteRule = useMutation({ mutationFn: async (rule: Rule) => api.delete(`/wallets/${walletId}/communication/rules/${rule.id}`), onSuccess: () => { void refresh(); setSelectedRuleId(null); } });
  const createTemplate = useMutation({
    mutationFn: async () => api.post(`/wallets/${walletId}/communication/templates`, { channel: templateChannel, name: templateName, content: templateContent }),
    onSuccess: () => { void refresh(); setTemplateName(''); setTemplateContent(''); toaster.create({ title: 'Modelo criado', type: 'success' }); },
    onError: () => toaster.create({ title: 'Não foi possível criar o modelo', type: 'error' }),
  });
  const exportTemplate = useMutation({ mutationFn: async (template: Template) => api.post(`/wallets/${walletId}/communication/templates/${template.id}/export-default`), onSuccess: () => { void refresh(); toaster.create({ title: 'Modelo exportado como padrão da conta', type: 'success' }); } });

  const newRule = () => { setView('rules'); setRuleName('Nova régua'); setFrequency('DAILY'); setTime('07:00'); setConditions([{ ...blankCondition }]); setTemplateId(''); setSelectedRuleId('new'); };
  const pickRule = (rule: Rule) => { setView('rules'); setSelectedRuleId(rule.id); setRuleName(rule.name); setFrequency(rule.schedule.frequency); setTime(rule.schedule.time); setConditions(rule.conditions); setTemplateId(rule.templateId); };
  const updateCondition = (index: number, patch: Partial<Condition>) => setConditions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  return <Flex gap="5" align="start" direction={{ base: 'column', lg: 'row' }}>
    <Card.Root width={{ base: 'full', lg: '280px' }} flexShrink="0">
      <Card.Header pb="3"><Flex justify="space-between" align="center"><Box><Card.Title>Régua</Card.Title><Text fontSize="xs" color="fg.muted">Fluxos desta carteira</Text></Box>{canEdit && <Button size="sm" aria-label="Criar nova régua" title="Criar nova régua" onClick={newRule}><LuPlus /></Button>}</Flex></Card.Header>
      <Card.Body pt="0"><Stack gap="1"><Button justifyContent="start" variant={view === 'rules' ? 'subtle' : 'ghost'} onClick={() => setView('rules')}>Réguas de comunicação</Button><Button justifyContent="start" variant={view === 'templates' ? 'subtle' : 'ghost'} onClick={() => { setView('templates'); setSelectedRuleId(null); }}>Modelos de comunicação</Button></Stack><Separator my="4" />{view === 'rules' && <Stack gap="1">{rules.map((rule) => <Button key={rule.id} justifyContent="space-between" variant={selectedRuleId === rule.id ? 'subtle' : 'ghost'} onClick={() => pickRule(rule)}><Text truncate>{rule.name}</Text><Badge colorPalette={rule.active ? 'green' : 'gray'} size="sm">{rule.active ? 'Ativa' : 'Pausada'}</Badge></Button>)}{!rules.length && <Text fontSize="sm" color="fg.muted">Nenhuma régua criada.</Text>}</Stack>}</Card.Body>
    </Card.Root>
    <Box flex="1" minW="0">
      {view === 'templates' ? <Stack gap="5">
        <Box><Text fontSize="xl" fontWeight="semibold">Modelos de comunicação</Text><Text color="fg.muted">Cada modelo define seu canal e conteúdo. A régua apenas escolhe qual modelo usar.</Text></Box>
        <Card.Root><Card.Header><Card.Title>Novo modelo</Card.Title></Card.Header><Card.Body><Stack gap="3"><SimpleGrid columns={{ base: 1, md: 2 }} gap="3"><NativeSelect.Root><NativeSelect.Field value={templateChannel} onChange={(event) => setTemplateChannel(event.target.value as Channel)} aria-label="Canal do modelo"><option value="SMS">SMS</option><option value="EMAIL">E-mail</option><option value="AI_VOICE_CALL">Ligação com IA</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Nome do modelo" aria-label="Nome do modelo" /></SimpleGrid><Textarea value={templateContent} onChange={(event) => setTemplateContent(event.target.value)} minH="140px" placeholder={templateChannel === 'AI_VOICE_CALL' ? 'Prompt e instruções da ligação' : 'Conteúdo da mensagem'} aria-label="Conteúdo do modelo" /><Button alignSelf="start" colorPalette="blue" loading={createTemplate.isPending} disabled={!canEdit || !templateName.trim() || !templateContent.trim()} onClick={() => createTemplate.mutate()}><LuPlus /> Criar modelo</Button></Stack></Card.Body></Card.Root>
        <Stack gap="3">{templates.map((template) => <Card.Root key={template.id} size="sm"><Card.Body><Flex gap="3" justify="space-between" align="start"><Box minW="0"><HStack><Text fontWeight="semibold">{template.name}</Text><Badge>{channelNames[template.channel]}</Badge>{template.isDefault && <Badge colorPalette="blue">Padrão</Badge>}</HStack><Text mt="2" whiteSpace="pre-wrap" fontSize="sm" color="fg.muted">{template.content}</Text></Box>{!template.isDefault && <Button size="sm" variant="outline" flexShrink="0" disabled={!canEdit || exportTemplate.isPending} onClick={() => exportTemplate.mutate(template)}><LuCopy /> Exportar</Button>}</Flex></Card.Body></Card.Root>)}{!templates.length && <Text color="fg.muted">Nenhum modelo cadastrado.</Text>}</Stack>
      </Stack> : selectedRuleId === 'new' ? <Card.Root>
        <Card.Header><Card.Title>Criar régua de comunicação</Card.Title><Text color="fg.muted">Defina quando executar, quem recebe e como será enviada.</Text></Card.Header>
        <Card.Body><Stack gap="6"><Input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="Nome da régua" aria-label="Nome da régua" />
          <Box><Text fontWeight="semibold" mb="1">1. Quando</Text><Text fontSize="sm" color="fg.muted" mb="3">Defina a frequência e o horário de execução.</Text><HStack align="end" flexWrap="wrap"><Box><Text fontSize="sm" mb="1">Frequência</Text><NativeSelect.Root><NativeSelect.Field value={frequency} onChange={(event) => setFrequency(event.target.value as 'DAILY' | 'WEEKLY')}><option value="DAILY">Todos os dias</option><option value="WEEKLY">Toda semana</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box><Box><Text fontSize="sm" mb="1">Horário</Text><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Horário de execução" /></Box></HStack></Box>
          <Box><Flex justify="space-between" align="center" mb="1"><Text fontWeight="semibold">2. Quem</Text><Button size="xs" variant="outline" onClick={() => setConditions((items) => [...items, { ...blankCondition }])}><LuPlus /> Condição</Button></Flex><Text fontSize="sm" color="fg.muted" mb="3">Somente contratos que atendam a todas as condições receberão a comunicação.</Text><Stack gap="2">{conditions.map((condition, index) => <HStack key={index} align="start" flexWrap={{ base: 'wrap', md: 'nowrap' }}><NativeSelect.Root minW="190px"><NativeSelect.Field value={condition.field} onChange={(event) => { const field = event.target.value; updateCondition(index, { field, operator: field === 'paymentStatus' ? 'eq' : 'gt', value: field === 'paymentStatus' ? 'OPEN' : 0 }); }}><option value="paymentStatus">Status financeiro</option><option value="offerValue">Valor da oferta</option><option value="agingDays">Tempo de dívida</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>{condition.field === 'paymentStatus' ? <NativeSelect.Root minW="180px"><NativeSelect.Field value={String(condition.value)} onChange={(event) => updateCondition(index, { value: event.target.value })}><option value="OPEN">Em aberto</option><option value="IN_AGREEMENT">Em acordo</option><option value="INSTALLMENT">Parcelado</option><option value="AGREEMENT_BREACHED">Acordo quebrado</option><option value="PAID">Pago</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root> : <><NativeSelect.Root minW="130px"><NativeSelect.Field value={condition.operator} onChange={(event) => updateCondition(index, { operator: event.target.value })}><option value="gt">Maior que</option><option value="lt">Menor que</option><option value="eq">Igual a</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Input type="number" min="0" value={String(condition.value)} onChange={(event) => updateCondition(index, { value: Number(event.target.value) })} aria-label="Valor da condição" /></>}{conditions.length > 1 && <Button size="sm" variant="ghost" colorPalette="red" aria-label="Remover condição" onClick={() => setConditions((items) => items.filter((_, itemIndex) => itemIndex !== index))}><LuTrash2 /></Button>}</HStack>)}</Stack></Box>
          <Box><Text fontWeight="semibold" mb="1">3. Como</Text><Text fontSize="sm" color="fg.muted" mb="3">Escolha o modelo. O canal é definido pelo próprio modelo.</Text><NativeSelect.Root maxW="lg"><NativeSelect.Field value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Escolha um modelo</option>{templates.map((template) => <option key={template.id} value={template.id}>{channelNames[template.channel]} · {template.name}{template.isDefault ? ' (padrão)' : ''}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>{selectedTemplate ? <HStack mt="2"><Badge colorPalette="blue">Canal: {channelNames[selectedTemplate.channel]}</Badge><Text fontSize="sm" color="fg.muted">{selectedTemplate.content.slice(0, 150)}{selectedTemplate.content.length > 150 ? '…' : ''}</Text></HStack> : <Text mt="2" fontSize="sm" color="fg.muted">Crie um modelo no menu lateral antes de finalizar a régua.</Text>}</Box>
          <Button alignSelf="start" colorPalette="blue" loading={createRule.isPending} disabled={!canEdit || !ruleName.trim() || !templateId} onClick={() => createRule.mutate()}><LuSave /> Salvar régua</Button>
        </Stack></Card.Body>
      </Card.Root> : selectedRule ? <Card.Root><Card.Header><Flex justify="space-between" align="start" gap="3"><Box><Card.Title>{selectedRule.name}</Card.Title><Text color="fg.muted">Resumo da configuração desta régua.</Text></Box><Badge colorPalette={selectedRule.active ? 'green' : 'gray'}>{selectedRule.active ? 'Ativa' : 'Pausada'}</Badge></Flex></Card.Header><Card.Body><Stack gap="5"><Box><Text fontWeight="semibold">Quando</Text><Text>Executa {selectedRule.schedule.frequency === 'DAILY' ? 'todos os dias' : 'toda semana'} às {selectedRule.schedule.time}.</Text></Box><Box><Text fontWeight="semibold">Quem</Text><Text>{selectedRule.conditions.map((condition) => `${fieldNames[condition.field] ?? condition.field} ${operatorNames[condition.operator] ?? condition.operator} ${condition.value}`).join(' e ')}.</Text></Box><Box><Text fontWeight="semibold">Como</Text><Text>{channelNames[selectedRule.template.channel]} usando o modelo “{selectedRule.template.name}”.</Text></Box><HStack><Button variant="outline" disabled={!canEdit} onClick={() => toggleRule.mutate(selectedRule)}>{selectedRule.active ? 'Pausar régua' : 'Ativar régua'}</Button><Button variant="outline" colorPalette="red" disabled={!canEdit} onClick={() => deleteRule.mutate(selectedRule)}><LuTrash2 /> Excluir</Button></HStack></Stack></Card.Body></Card.Root> : <Card.Root><Card.Body py="10"><Stack align="center"><Text fontWeight="semibold">Selecione uma régua</Text><Text color="fg.muted">Ou crie uma nova para definir quando executar, quem recebe e como será enviada.</Text>{canEdit && <Button colorPalette="blue" onClick={newRule}><LuPlus /> Nova régua</Button>}</Stack></Card.Body></Card.Root>}
    </Box>
  </Flex>;
}
