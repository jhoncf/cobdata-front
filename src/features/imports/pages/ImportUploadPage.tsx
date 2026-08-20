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
import { useUploadImportMutation } from '../api/useImportMutations';
import { PageHeader } from '@/components/common';
import { NativeSelect } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';

const TARGET_FIELDS = [
  { value: '', label: '(Ignorar coluna)' },
  { value: 'debtorDocument', label: 'CPF/CNPJ do Devedor' },
  { value: 'debtorName', label: 'Nome do Devedor' },
  { value: 'contractNumber', label: 'Número do Contrato (NUM_ADM)' },
  { value: 'debtType', label: 'Tipo de Dívida' },
  { value: 'occurrenceDate', label: 'Data de Contratação (MES_CONTRATO)' },
  { value: 'dueDate', label: 'Data de Vencimento' },
  { value: 'originalValue', label: 'Valor em Aberto' },
  { value: 'updatedValue', label: 'Valor Atualizado' },
  { value: 'debtOrigin', label: 'Origem da Dívida' },
  { value: 'productName', label: 'Produto' },
  { value: 'debtorStreet', label: 'Endereço (Rua)' },
  { value: 'debtorAddressNumber', label: 'Número do Endereço' },
  { value: 'debtorAddressComplement', label: 'Complemento' },
  { value: 'debtorNeighborhood', label: 'Bairro' },
  { value: 'debtorCity', label: 'Cidade' },
  { value: 'debtorState', label: 'UF' },
  { value: 'debtorZipCode', label: 'CEP' },
  { value: 'debtorPhone', label: 'Telefone' },
  { value: 'debtorEmail', label: 'E-mail' },
  { value: 'cancelledAt', label: 'Mês Cancelamento' },
];

const REQUIRED_TARGETS = ['debtorDocument', 'contractNumber', 'occurrenceDate', 'originalValue'];

const HEADER_SUGGESTIONS: Record<string, string> = {
  cpf: 'debtorDocument', cnpj: 'debtorDocument', documento: 'debtorDocument',
  nome: 'debtorName', cliente: 'debtorName', nome_cliente: 'debtorName',
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

function suggestedMapping(headers: string[]): Record<string, string> {
  return Object.fromEntries(
    headers.map((header) => [header, HEADER_SUGGESTIONS[normalizedHeader(header)] ?? '']),
  );
}

export default function ImportUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWalletId = searchParams.get('walletId') || '';
  const [walletId, setWalletId] = useState(preselectedWalletId);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const { data: walletsData } = useAllWalletsQuery();
  const uploadMutation = useUploadImportMutation();

  const handleFileAccept = useCallback((details: { files: File[] }) => {
    const accepted = details.files[0];
    if (!accepted) return;
    setFile(accepted);
    setHeaders([]);
    setColumnMapping({});

    const setDetectedHeaders = (sourceHeaders: unknown[]) => {
      const uniqueHeaders = sourceHeaders
        .map((header) => String(header ?? '').trim())
        .filter((header, index, values) => header && values.indexOf(header) === index);
      setHeaders(uniqueHeaders);
      setColumnMapping(suggestedMapping(uniqueHeaders));
    };

    if (accepted.name.endsWith('.csv')) {
      Papa.parse(accepted, {
        preview: 1,
        complete: (results) => {
          setDetectedHeaders((results.data[0] as string[]) || []);
        },
        error: () => {
          toaster.create({ type: 'error', title: 'Erro ao ler headers do arquivo' });
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const workbook = XLSX.read(reader.result, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = firstSheet ? workbook.Sheets[firstSheet] : undefined;
          const rows = worksheet ? XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, blankrows: false }) : [];
          setDetectedHeaders(rows[0] ?? []);
        } catch {
          toaster.create({ type: 'error', title: 'Não foi possível ler os cabeçalhos do XLSX' });
        }
      };
      reader.onerror = () => toaster.create({ type: 'error', title: 'Erro ao ler o arquivo XLSX' });
      reader.readAsArrayBuffer(accepted);
    }
  }, []);

  const handleMappingChange = (header: string, target: string) => {
    setColumnMapping((prev) => ({ ...prev, [header]: target }));
  };

  const handleSubmit = () => {
    if (!file || !walletId) {
      toaster.create({ type: 'warning', title: 'Selecione arquivo e carteira' });
      return;
    }

    // Filter out empty mappings
    const filteredMapping: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([key, val]) => {
      if (val) filteredMapping[key] = val;
    });

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
          <Fieldset.Legend>Mapeamento de Colunas</Fieldset.Legend>
          <Text fontSize="sm" color="fg.muted" mb="3">
            Confirme o destino de cada coluna. As sugestões podem ser alteradas livremente.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            {headers.map((header) => (
              <Box key={header} borderWidth="1px" rounded="md" p="3">
                <Stack direction="row" justify="space-between" mb="1">
                  <Text fontSize="sm" fontWeight="medium">{header}</Text>
                  {REQUIRED_TARGETS.includes(columnMapping[header] ?? '') && <Badge colorPalette="orange">Obrigatório</Badge>}
                </Stack>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={columnMapping[header] ?? ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                  >
                    {TARGET_FIELDS.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </NativeSelect.Field>
                <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            ))}
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
