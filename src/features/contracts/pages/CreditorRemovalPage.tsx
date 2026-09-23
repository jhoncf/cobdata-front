import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Badge, Box, Button, Card, FileUpload, HStack, NativeSelect, SimpleGrid, Stack, Tabs, Text } from '@chakra-ui/react';
import { LuFileUp, LuRefreshCw, LuSearch, LuTrash2 } from 'react-icons/lu';
import { PageHeader, ConfirmDialog } from '@/components/common';
import api from '@/lib/api';
import { handleApiError } from '@/lib/error-handler';
import { toaster } from '@/components/ui/toaster';

type Field = 'contractNumber' | 'debtorDocument';
type BatchStatus = 'PENDING_VALIDATION' | 'VALIDATING' | 'READY' | 'APPLYING' | 'COMPLETED' | 'FAILED';
type Batch = { id: string; status: BatchStatus; fileName: string; totalLines: number; validLines: number; invalidLines: number; matchedCount: number; unmatchedCount: number; blockedCount: number; duplicateLines: number; cancelledCount: number; queuedForSerasaRemoval: number; errorMessage?: string | null; createdAt: string; updatedAt: string };

const labels: Record<Field, string> = { contractNumber: 'Número do contrato', debtorDocument: 'CPF/CNPJ' };
const statusLabel: Record<BatchStatus, string> = { PENDING_VALIDATION: 'Na fila de conferência', VALIDATING: 'Conferindo arquivo', READY: 'Pronto para confirmação', APPLYING: 'Removendo contratos', COMPLETED: 'Concluído', FAILED: 'Falhou' };
const statusColor: Record<BatchStatus, string> = { PENDING_VALIDATION: 'gray', VALIDATING: 'blue', READY: 'orange', APPLYING: 'blue', COMPLETED: 'green', FAILED: 'red' };

export default function CreditorRemovalPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<Field, string>>({ contractNumber: '', debtorDocument: '' });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mapped = useMemo(() => Object.values(mapping).every(Boolean), [mapping]);
  const selected = batches.find((batch) => batch.id === selectedBatchId) ?? null;

  async function loadBatches(silent = false) {
    try { const { data } = await api.get<Batch[]>('/creditor-removals/batches'); setBatches(data); }
    catch (error) { if (!silent) handleApiError(error); }
  }

  useEffect(() => { void loadBatches(); }, []);
  useEffect(() => {
    const active = batches.some((batch) => ['PENDING_VALIDATION', 'VALIDATING', 'APPLYING'].includes(batch.status));
    if (!active) return;
    const timer = window.setInterval(() => void loadBatches(true), 4000);
    return () => window.clearInterval(timer);
  }, [batches]);

  async function selectFile(selectedFile?: File) {
    setFile(selectedFile ?? null); setHeaders([]); setSelectedBatchId(null);
    if (!selectedFile) return;
    try {
      const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: 'array', sheetRows: 1 });
      const name = workbook.SheetNames[0]; const sheet = name ? workbook.Sheets[name] : undefined;
      if (!sheet) throw new Error();
      const header = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })[0] ?? [];
      const values = header.map(String).map((value) => value.trim()).filter(Boolean); if (!values.length) throw new Error();
      const automatic = (terms: string[]) => values.find((value) => terms.some((term) => value.toLowerCase().includes(term))) ?? '';
      setHeaders(values); setMapping({ contractNumber: automatic(['contrato', 'contract']), debtorDocument: automatic(['cpf', 'documento', 'document']) });
    } catch { toaster.create({ type: 'error', title: 'Não foi possível ler o cabeçalho do arquivo' }); setFile(null); }
  }

  async function queueValidation() {
    if (!file || !mapped) return;
    setLoading(true);
    try {
      const form = new FormData(); form.append('file', file); form.append('columnMapping', JSON.stringify(mapping));
      const { data } = await api.post<Batch>('/creditor-removals/preview', form, { timeout: 2 * 60 * 1000 });
      setBatches((current) => [data, ...current]); setSelectedBatchId(data.id); setFile(null); setHeaders([]);
      toaster.create({ type: 'success', title: 'Arquivo enviado para conferência', description: 'Acompanhe o resultado na fila de alterações em massa.' });
    } catch (error) { handleApiError(error); } finally { setLoading(false); }
  }

  async function confirmBatch() {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.post<Batch>(`/creditor-removals/${selected.id}/confirm`);
      setBatches((current) => current.map((batch) => batch.id === data.id ? data : batch)); setConfirmOpen(false);
      toaster.create({ type: 'success', title: 'Remoção adicionada à fila', description: 'Os contratos serão baixados em segundo plano.' });
    } catch (error) { handleApiError(error); } finally { setLoading(false); }
  }

  const details = selected && <Card.Root><Card.Body gap="4"><Text fontWeight="semibold">Resultado da conferência</Text>
    {['PENDING_VALIDATION', 'VALIDATING'].includes(selected.status) && <Text color="fg.muted">O arquivo está sendo conferido em segundo plano. Esta tela será atualizada automaticamente.</Text>}
    {selected.status === 'FAILED' && <Text color="red.fg">{selected.errorMessage || 'Não foi possível conferir este arquivo.'}</Text>}
    {['READY', 'APPLYING', 'COMPLETED'].includes(selected.status) && <><SimpleGrid columns={{ base: 2, md: 4 }} gap="3">
      <Metric label="Serão removidos" value={selected.matchedCount} color="red.fg" /><Metric label="Não encontrados/divergentes" value={selected.unmatchedCount} /><Metric label="Bloqueados (pagos/cancelados)" value={selected.blockedCount} /><Metric label="Linhas inválidas/repetidas" value={selected.invalidLines + selected.duplicateLines} />
    </SimpleGrid>
    {selected.status === 'READY' && <Button alignSelf="start" colorPalette="red" disabled={!selected.matchedCount} onClick={() => setConfirmOpen(true)}><LuTrash2 /> Confirmo a remoção de {selected.matchedCount} cadastro(s)</Button>}
    {selected.status === 'APPLYING' && <Text color="fg.muted">{selected.cancelledCount} de {selected.matchedCount} contratos já foram removidos.</Text>}
    {selected.status === 'COMPLETED' && <Text color="green.fg">{selected.cancelledCount} contrato(s) removido(s). {selected.queuedForSerasaRemoval} remoção(ões) foram encaminhadas aos canais ativos.</Text>}</>}
  </Card.Body></Card.Root>;

  return <Stack gap="5"><PageHeader title="Remover dívidas" />
    <Tabs.Root defaultValue="upload"><Tabs.List mb="1"><Tabs.Trigger value="upload">Importar arquivo</Tabs.Trigger><Tabs.Trigger value="queue">Fila de alterações em massa</Tabs.Trigger><Tabs.Indicator /></Tabs.List>
      <Tabs.Content value="upload"><Stack gap="5"><Card.Root><Card.Body gap="4"><Stack gap="1"><Text fontWeight="semibold">Importar arquivo para remoção em massa</Text><Text fontSize="sm" color="fg.muted">Envie CSV ou XLSX. A conferência acontece em segundo plano; depois, confirme a quantidade exata antes de qualquer baixa.</Text></Stack>
        <FileUpload.Root accept=".csv,.xlsx" maxFiles={1} onFileChange={(details) => void selectFile(details.acceptedFiles[0])}><FileUpload.HiddenInput /><FileUpload.Trigger asChild><Button variant="outline"><LuFileUp /> Selecionar arquivo</Button></FileUpload.Trigger>{file && <Text fontSize="sm">Arquivo selecionado: {file.name}</Text>}</FileUpload.Root>
        {headers.length > 0 && <><Text fontWeight="medium">Mapeamento dos campos</Text><SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{(Object.keys(labels) as Field[]).map((field) => <Stack key={field} gap="1"><Text fontSize="sm">{labels[field]}</Text><NativeSelect.Root><NativeSelect.Field value={mapping[field]} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">Selecione uma coluna</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Stack>)}</SimpleGrid><Button alignSelf="start" colorPalette="blue" loading={loading} disabled={!mapped} onClick={() => void queueValidation()}><LuSearch /> Enviar para conferência</Button></>}
      </Card.Body></Card.Root>{details}</Stack></Tabs.Content>
      <Tabs.Content value="queue"><Stack gap="4"><HStack justify="space-between"><Text fontSize="sm" color="fg.muted">A tela atualiza automaticamente enquanto houver uma tarefa em andamento.</Text><Button size="sm" variant="outline" onClick={() => void loadBatches()}><LuRefreshCw /> Atualizar</Button></HStack>{batches.length === 0 ? <Card.Root><Card.Body><Text color="fg.muted">Nenhuma alteração em massa foi enviada.</Text></Card.Body></Card.Root> : batches.map((batch) => <Card.Root key={batch.id} borderColor={selectedBatchId === batch.id ? 'blue.500' : undefined} onClick={() => setSelectedBatchId(batch.id)} cursor="pointer"><Card.Body><HStack justify="space-between" align="start"><Stack gap="1"><Text fontWeight="semibold">{batch.fileName}</Text><Text fontSize="sm" color="fg.muted">{new Date(batch.createdAt).toLocaleString('pt-BR')} · {batch.cancelledCount}/{batch.matchedCount} removidos</Text>{batch.errorMessage && <Text fontSize="sm" color="red.fg">{batch.errorMessage}</Text>}</Stack><Badge colorPalette={statusColor[batch.status]}>{statusLabel[batch.status]}</Badge></HStack></Card.Body></Card.Root>)}</Stack></Tabs.Content>
    </Tabs.Root>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title={`Confirmar ${selected?.matchedCount ?? 0} remoção(ões)`} message={`${selected?.matchedCount ?? 0} cadastro(s) serão enviados à fila de baixa. Você poderá acompanhar o progresso nesta página.`} confirmLabel={`Remover ${selected?.matchedCount ?? 0} cadastro(s)`} colorPalette="red" loading={loading} onConfirm={() => void confirmBatch()} />
  </Stack>;
}

function Metric({ label, value, color }: { label: string; value: number; color?: string }) { return <Box><Text fontSize="xs" color="fg.muted">{label}</Text><Text fontSize="2xl" fontWeight="bold" color={color}>{value}</Text></Box>; }
