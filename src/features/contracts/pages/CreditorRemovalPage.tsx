import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Box, Button, Card, FileUpload, HStack, Input, NativeSelect, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { LuCheck, LuFileUp, LuSearch, LuTrash2 } from 'react-icons/lu';
import { PageHeader, ConfirmDialog } from '@/components/common';
import api from '@/lib/api';
import { handleApiError } from '@/lib/error-handler';
import { toaster } from '@/components/ui/toaster';

type Field = 'contractNumber' | 'debtorDocument' | 'value' | 'occurrenceDate';
type Preview = { totalLines: number; validLines: number; invalidLines: number; matchedCount: number; unmatchedCount: number; blockedCount: number; duplicateLines: number; samples: Array<{ contractNumber: string; debtorDocument: string; updatedValue: number; occurrenceDate: string }> };

const labels: Record<Field, string> = {
  contractNumber: 'Número do contrato',
  debtorDocument: 'CPF/CNPJ',
  value: 'Valor da dívida',
  occurrenceDate: 'Data da dívida',
};

export default function CreditorRemovalPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<Field, string>>({ contractNumber: '', debtorDocument: '', value: '', occurrenceDate: '' });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mapped = useMemo(() => Object.values(mapping).every(Boolean), [mapping]);

  async function selectFile(selected?: File) {
    setPreview(null); setFile(selected ?? null); setHeaders([]);
    if (!selected) return;
    try {
      const workbook = XLSX.read(await selected.arrayBuffer(), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error();
      const firstSheet = workbook.Sheets[sheetName];
      if (!firstSheet) throw new Error();
      const header = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: '' })[0] ?? [];
      const values = header.map((value) => String(value).trim()).filter(Boolean);
      if (!values.length) throw new Error();
      setHeaders(values);
      const automatic = (terms: string[]) => values.find((value) => terms.some((term) => value.toLowerCase().includes(term)) || '');
      setMapping({
        contractNumber: automatic(['contrato', 'contract']) ?? '',
        debtorDocument: automatic(['cpf', 'documento', 'document']) ?? '',
        value: automatic(['valor', 'value']) ?? '',
        occurrenceDate: automatic(['data', 'vencimento', 'ocorrência', 'ocorrencia']) ?? '',
      });
    } catch {
      toaster.create({ type: 'error', title: 'Não foi possível ler o cabeçalho do arquivo' });
      setFile(null);
    }
  }

  async function send(endpoint: 'preview' | 'confirm') {
    if (!file || !mapped) return;
    setLoading(true);
    try {
      const form = new FormData(); form.append('file', file); form.append('columnMapping', JSON.stringify(mapping));
      const { data } = await api.post(endpoint === 'preview' ? '/creditor-removals/preview' : '/creditor-removals/confirm', form);
      if (endpoint === 'preview') setPreview(data);
      else { setConfirmOpen(false); setPreview(null); setFile(null); setHeaders([]); toaster.create({ type: 'success', title: `${data.cancelledCount} cadastro(s) removido(s)`, description: data.queuedForSerasaRemoval ? `${data.queuedForSerasaRemoval} remoção(ões) foram enviadas aos canais ativos.` : undefined }); }
    } catch (error) { handleApiError(error); }
    finally { setLoading(false); }
  }

  return <Stack gap="5">
    <PageHeader title="Remover dívidas" />
    <Card.Root><Card.Body gap="4">
      <Stack gap="1"><Text fontWeight="semibold">Importar arquivo para remoção em massa</Text><Text fontSize="sm" color="fg.muted">Envie CSV ou XLSX. Antes da confirmação, o CRM confere contrato, CPF/CNPJ, valor atualizado e data da dívida. Somente cadastros do seu credor podem ser removidos.</Text></Stack>
      <FileUpload.Root accept=".csv,.xlsx" maxFiles={1} onFileChange={(details) => void selectFile(details.acceptedFiles[0])}>
        <FileUpload.HiddenInput />
        <FileUpload.Trigger asChild><Button variant="outline"><LuFileUp /> Selecionar arquivo</Button></FileUpload.Trigger>
        {file && <Text fontSize="sm">Arquivo selecionado: {file.name}</Text>}
      </FileUpload.Root>
      {headers.length > 0 && <>
        <Text fontWeight="medium">Mapeamento dos campos</Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
          {(Object.keys(labels) as Field[]).map((field) => <Stack key={field} gap="1"><Text fontSize="sm">{labels[field]}</Text><NativeSelect.Root><NativeSelect.Field value={mapping[field]} onChange={(event) => { setPreview(null); setMapping((current) => ({ ...current, [field]: event.target.value })); }}><option value="">Selecione uma coluna</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Stack>)}
        </SimpleGrid>
        <Button alignSelf="start" colorPalette="blue" loading={loading} disabled={!mapped} onClick={() => void send('preview')}><LuSearch /> Conferir cadastros</Button>
      </>}
    </Card.Body></Card.Root>
    {preview && <Card.Root><Card.Body gap="4">
      <Text fontWeight="semibold">Resultado da conferência</Text>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap="3">
        <Box><Text fontSize="xs" color="fg.muted">Serão removidos</Text><Text fontSize="2xl" fontWeight="bold" color="red.fg">{preview.matchedCount}</Text></Box>
        <Box><Text fontSize="xs" color="fg.muted">Não encontrados ou divergentes</Text><Text fontSize="2xl" fontWeight="bold">{preview.unmatchedCount}</Text></Box>
        <Box><Text fontSize="xs" color="fg.muted">Bloqueados (pagos/cancelados)</Text><Text fontSize="2xl" fontWeight="bold">{preview.blockedCount}</Text></Box>
        <Box><Text fontSize="xs" color="fg.muted">Linhas inválidas/repetidas</Text><Text fontSize="2xl" fontWeight="bold">{preview.invalidLines + preview.duplicateLines}</Text></Box>
      </SimpleGrid>
      {preview.samples.length > 0 && <Stack gap="1"><Text fontSize="sm" fontWeight="medium">Amostra dos cadastros conferidos</Text>{preview.samples.map((row) => <Text key={row.contractNumber} fontSize="sm">Contrato {row.contractNumber} · CPF/CNPJ {row.debtorDocument} · R$ {Number(row.updatedValue).toFixed(2).replace('.', ',')} · {new Date(row.occurrenceDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Text>)}</Stack>}
      <HStack><Button colorPalette="red" disabled={!preview.matchedCount} onClick={() => setConfirmOpen(true)}><LuTrash2 /> Confirmo a remoção de {preview.matchedCount} cadastro(s)</Button></HStack>
    </Card.Body></Card.Root>}
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Confirmar remoção em massa" message={`Tem certeza que deseja remover ${preview?.matchedCount ?? 0} cadastro(s)? Eles serão cancelados no CRM e retirados dos canais de cobrança ativos.`} confirmLabel="Confirmar remoção" colorPalette="red" loading={loading} onConfirm={() => void send('confirm')} />
  </Stack>;
}
