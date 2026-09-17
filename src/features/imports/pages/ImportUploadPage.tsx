import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Fieldset,
  Icon,
  Stack,
  Text,
  SimpleGrid,
  FileUpload,
  Badge,
} from '@chakra-ui/react';
import { LuUpload } from 'react-icons/lu';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { useSuggestImportMappingMutation, useUploadImportMutation } from '../api/useImportMutations';
import { PageHeader } from '@/components/common';
import { NativeSelect } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';

const IMPORT_FIELDS = [
  { value: 'debtorDocument', label: 'CPF/CNPJ do devedor', required: true },
  { value: 'contractNumber', label: 'Número do contrato', required: true },
  { value: 'debtType', label: 'Tipo de dívida', required: true },
  { value: 'occurrenceDate', label: 'Data de ocorrência/contratação', required: true },
  { value: 'originalValue', label: 'Valor da dívida', required: true },
  { value: 'updatedValue', label: 'Valor atualizado', required: false },
  { value: 'debtorName', label: 'Nome do devedor', required: false },
  { value: 'debtorBirthDate', label: 'Data de nascimento', required: false },
  { value: 'dueDate', label: 'Data de vencimento', required: false },
  { value: 'debtOrigin', label: 'Origem da dívida', required: false },
  { value: 'productName', label: 'Produto', required: false },
  { value: 'debtorStreet', label: 'Endereço (rua)', required: false },
  { value: 'debtorAddressNumber', label: 'Número do endereço', required: false },
  { value: 'debtorAddressComplement', label: 'Complemento', required: false },
  { value: 'debtorNeighborhood', label: 'Bairro', required: false },
  { value: 'debtorCity', label: 'Cidade', required: false },
  { value: 'debtorState', label: 'UF', required: false },
  { value: 'debtorZipCode', label: 'CEP', required: false },
  { value: 'debtorPhone', label: 'Telefone', required: false },
  { value: 'debtorEmail', label: 'E-mail', required: false },
  { value: 'cancelledAt', label: 'Data de cancelamento', required: false },
] as const;

const REQUIRED_TARGETS = IMPORT_FIELDS.filter((field) => field.required).map((field) => field.value);

const HEADER_SUGGESTIONS: Record<string, string> = {
  cpf: 'debtorDocument', cnpj: 'debtorDocument', documento: 'debtorDocument',
  nome: 'debtorName', cliente: 'debtorName', nome_cliente: 'debtorName',
  data_nascimento: 'debtorBirthDate', dt_nascimento: 'debtorBirthDate', nascimento: 'debtorBirthDate',
  contrato: 'contractNumber', num_adm: 'contractNumber', numero_contrato: 'contractNumber',
  m_contrato: 'occurrenceDate', mes_contrato: 'occurrenceDate', data_ocorrencia: 'occurrenceDate',
  vencimento: 'dueDate', data_vencimento: 'dueDate',
  valor: 'originalValue', vlr: 'originalValue', valor_divida: 'originalValue', valor_original: 'originalValue',
  valor_atualizado: 'updatedValue', valor_atual: 'updatedValue',
  tipo_divida: 'debtType', tipo: 'debtType', produto: 'productName',
  endereco: 'debtorStreet', rua: 'debtorStreet', cidade: 'debtorCity',
  telefone: 'debtorPhone', telefone_cliente: 'debtorPhone', email: 'debtorEmail',
  cep: 'debtorZipCode', uf: 'debtorState', estado: 'debtorState', bairro: 'debtorNeighborhood',
};

function normalizedHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function suggestedFieldMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const target = HEADER_SUGGESTIONS[normalizedHeader(header)];
    if (target && !mapping[target]) mapping[target] = header;
  }
  return mapping;
}

/** Converts a local sample into a type hint without exposing its PII. */
function anonymizedFormat(value: string): string {
  const normalized = value.trim();
  const digits = normalized.replace(/\D/g, '');
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return '[e-mail]';
  if (digits.length === 11 && /[.\-\s]/.test(normalized)) return '[CPF com 11 dígitos]';
  if (digits.length === 14 && /[.\-\/\s]/.test(normalized)) return '[CNPJ com 14 dígitos]';
  if (digits.length >= 10 && digits.length <= 13 && /[()\-\s]/.test(normalized)) return '[telefone]';
  if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(normalized)) return '[data DD/MM/AAAA]';
  if (/^\d{4}[\/-]\d{2}[\/-]\d{2}$/.test(normalized)) return '[data AAAA-MM-DD]';
  if (/^R?\$?\s*[\d.,]+$/.test(normalized)) return '[valor monetário]';
  if (/^\d+$/.test(normalized)) return `[número com ${digits.length} dígitos]`;
  return normalized ? '[texto]' : '[vazio]';
}

export default function ImportUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWalletId = searchParams.get('walletId') || '';
  const [walletId, setWalletId] = useState(preselectedWalletId);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnExamples, setColumnExamples] = useState<Record<string, string>>({});
  // Maps each CRM field to the selected source column. This direction makes
  // all required fields visible even when the spreadsheet does not contain it.
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const { data: walletsData } = useAllWalletsQuery();
  const uploadMutation = useUploadImportMutation();
  const suggestMappingMutation = useSuggestImportMappingMutation();

  const requestAiSuggestion = useCallback((sourceHeaders: string[], examples: Record<string, string>, announce = false) => {
    const sampleFormats = Object.fromEntries(sourceHeaders.map((header) => [header, anonymizedFormat(examples[header] ?? '')]));
    suggestMappingMutation.mutate(
      { headers: sourceHeaders, sampleFormats },
      {
        onSuccess: ({ data }) => {
          if (data.provider !== 'bedrock' || Object.keys(data.mapping).length === 0) {
            if (announce) toaster.create({ type: 'info', title: 'A IA não encontrou sugestões adicionais; revise os campos manualmente.' });
            return;
          }
          setFieldMapping((current) => ({ ...current, ...data.mapping }));
          if (announce) toaster.create({ type: 'success', title: 'Sugestões da IA atualizadas. Revise antes de enviar.' });
        },
        onError: () => {
          if (announce) toaster.create({ type: 'warning', title: 'Não foi possível consultar a IA. As sugestões locais continuam disponíveis.' });
        },
      },
    );
  }, [suggestMappingMutation]);

  const handleFileAccept = useCallback((details: { files: File[] }) => {
    const accepted = details.files[0];
    if (!accepted) return;
    setFile(accepted);
    setHeaders([]);
    setColumnExamples({});
    setFieldMapping({});

    const setDetectedHeaders = (sourceHeaders: unknown[], sampleRow: unknown[] = []) => {
      const uniqueHeaders = sourceHeaders
        .map((header) => String(header ?? '').trim())
        .filter((header, index, values) => header && values.indexOf(header) === index);
      setHeaders(uniqueHeaders);
      const examples = Object.fromEntries(
        sourceHeaders.map((header, index) => [
          String(header ?? '').trim(),
          String(sampleRow[index] ?? '').trim(),
        ]).filter(([header]) => Boolean(header)),
      );
      setColumnExamples(examples);
      setFieldMapping(suggestedFieldMapping(uniqueHeaders));
      // Runs by default using only headers and anonymized formats. The user
      // can still edit every selected field while the suggestion is loading.
      requestAiSuggestion(uniqueHeaders, examples);
    };

    if (accepted.name.endsWith('.csv')) {
      Papa.parse(accepted, {
        preview: 2,
        complete: (results) => {
          setDetectedHeaders(
            (results.data[0] as unknown[]) || [],
            (results.data[1] as unknown[]) || [],
          );
        },
        error: () => {
          toaster.create({ type: 'error', title: 'Erro ao ler headers do arquivo' });
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // Lemos somente cabeçalho e uma linha de amostra, sem converter a
          // planilha inteira no navegador mesmo quando ela for muito grande.
          const workbook = XLSX.read(reader.result, { type: 'array', sheetRows: 2 });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = firstSheet ? workbook.Sheets[firstSheet] : undefined;
          const rows = worksheet ? XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, blankrows: false, range: 0 }) : [];
          setDetectedHeaders(rows[0] ?? [], rows[1] ?? []);
        } catch {
          toaster.create({ type: 'error', title: 'Não foi possível ler os cabeçalhos do XLSX' });
        }
      };
      reader.onerror = () => toaster.create({ type: 'error', title: 'Erro ao ler o arquivo XLSX' });
      reader.readAsArrayBuffer(accepted);
    }
  }, [requestAiSuggestion]);

  const handleMappingChange = (target: string, header: string) => {
    setFieldMapping((prev) => ({ ...prev, [target]: header }));
  };

  const handleAiSuggestion = () => {
    requestAiSuggestion(headers, columnExamples, true);
  };

  const handleSubmit = () => {
    if (!file || !walletId) {
      toaster.create({ type: 'warning', title: 'Selecione arquivo e carteira' });
      return;
    }

    // The API receives source column -> CRM field. The UI intentionally keeps
    // the reverse direction so the user can audit every CRM field first.
    const filteredMapping = Object.fromEntries(
      Object.entries(fieldMapping)
        .filter(([, header]) => Boolean(header))
        .map(([target, header]) => [header, target]),
    );

    const missingRequired = REQUIRED_TARGETS.filter(
      (target) => !Object.values(filteredMapping).includes(target),
    );
    if (missingRequired.length > 0) {
      toaster.create({ type: 'warning', title: 'Mapeie os campos obrigatórios antes de enviar' });
      return;
    }

    uploadMutation.mutate(
      { file, walletId, columnMapping: filteredMapping },
      {
        onSuccess: (response) => {
          navigate(`/imports/${response.data.id}`);
        },
      },
    );
  };

  return (
    <Stack gap="6">
      <PageHeader title="Nova Importação" />

      <Fieldset.Root>
        <Fieldset.Legend>Selecione a carteira</Fieldset.Legend>
        <NativeSelect.Root size="md" width={{ base: '100%', md: '320px' }}>
          <NativeSelect.Field
            placeholder="Selecionar carteira..."
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            {walletsData?.data.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Fieldset.Root>

      <Fieldset.Root>
        <Fieldset.Legend>Arquivo</Fieldset.Legend>
        <FileUpload.Root
          maxFiles={1}
          accept={['.csv', '.xlsx']}
          maxFileSize={104857600}
          onFileAccept={handleFileAccept}
        >
          <FileUpload.HiddenInput />
          <FileUpload.Dropzone>
            <Icon size="xl" color="fg.muted">
              <LuUpload />
            </Icon>
            <FileUpload.DropzoneContent>
              <Box>Arraste o arquivo CSV ou XLSX aqui</Box>
              <Box color="fg.muted" fontSize="sm">Máximo 100 MB</Box>
            </FileUpload.DropzoneContent>
          </FileUpload.Dropzone>
          <FileUpload.ItemGroup>
            <FileUpload.Context>
              {({ acceptedFiles }) =>
                acceptedFiles.map((f) => (
                  <FileUpload.Item key={f.name} file={f}>
                    <FileUpload.ItemPreview />
                    <FileUpload.ItemName />
                    <FileUpload.ItemSizeText />
                    <FileUpload.ItemDeleteTrigger />
                  </FileUpload.Item>
                ))
              }
            </FileUpload.Context>
          </FileUpload.ItemGroup>
        </FileUpload.Root>
      </Fieldset.Root>

      {headers.length > 0 && (
        <Fieldset.Root>
          <Fieldset.Legend>Mapeamento de campos</Fieldset.Legend>
          <Text fontSize="sm" color="fg.muted" mb="3">
            Para cada campo do CRM, selecione a coluna equivalente da sua planilha. Campos obrigatórios precisam ser preenchidos; os demais são opcionais.
          </Text>
          <Button size="sm" variant="outline" mb="3" onClick={handleAiSuggestion} loading={suggestMappingMutation.isPending}>
            Refazer sugestões com IA
          </Button>
          <Text fontSize="xs" color="fg.muted" mb="3">
            A IA recebe somente os títulos das colunas e formatos anonimizados da amostra; nenhum dado pessoal da planilha é enviado.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            {IMPORT_FIELDS.map((field) => {
              const selectedHeader = fieldMapping[field.value] ?? '';
              return (
              <Box key={field.value} borderWidth="1px" rounded="md" p="3">
                <Stack direction="row" justify="space-between" mb="1">
                  <Text fontSize="sm" fontWeight="medium">{field.label}</Text>
                  <Badge colorPalette={field.required ? 'orange' : 'gray'}>{field.required ? 'Obrigatório' : 'Opcional'}</Badge>
                </Stack>
                <Text fontSize="xs" color="fg.muted" mb="2" lineClamp="1">
                  {selectedHeader ? `Amostra de “${selectedHeader}”: ${columnExamples[selectedHeader] || '—'}` : 'Nenhuma coluna selecionada'}
                </Text>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={selectedHeader}
                    onChange={(e) => handleMappingChange(field.value, e.target.value)}
                  >
                    <option value="">{field.required ? 'Selecione a coluna obrigatória' : 'Não importar este campo'}</option>
                    {headers.map((header) => (
                      <option key={header} value={header} disabled={Boolean(fieldMapping && Object.entries(fieldMapping).some(([otherTarget, mappedHeader]) => otherTarget !== field.value && mappedHeader === header))}>
                        {header}
                      </option>
                    ))}
                  </NativeSelect.Field>
                <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
              );
            })}
          </SimpleGrid>
        </Fieldset.Root>
      )}

      <Box>
        <Button
          colorPalette="blue"
          onClick={handleSubmit}
          loading={uploadMutation.isPending}
          disabled={!file || !walletId}
        >
          Enviar Importação
        </Button>
      </Box>
    </Stack>
  );
}
