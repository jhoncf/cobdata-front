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
} from '@chakra-ui/react';
import { LuUpload } from 'react-icons/lu';
import Papa from 'papaparse';
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
  { value: 'debtorCity', label: 'Cidade' },
  { value: 'debtorPhone', label: 'Telefone' },
  { value: 'debtorEmail', label: 'E-mail' },
  { value: 'cancelledAt', label: 'Mês Cancelamento' },
];

export default function ImportUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWalletId = searchParams.get('walletId') || '';
  const [walletId, setWalletId] = useState(preselectedWalletId);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const { data: walletsData } = useAllWalletsQuery();
  const uploadMutation = useUploadImportMutation();

  const handleFileAccept = useCallback((details: { files: File[] }) => {
    const accepted = details.files[0];
    if (!accepted) return;
    setFile(accepted);
    setCsvHeaders([]);
    setColumnMapping({});

    // Parse first row to get headers
    if (accepted.name.endsWith('.csv')) {
      Papa.parse(accepted, {
        preview: 1,
        complete: (results) => {
          const headers = (results.data[0] as string[]) || [];
          setCsvHeaders(headers);
          // Auto-initialize mapping
          const initial: Record<string, string> = {};
          headers.forEach((h) => { initial[h] = ''; });
          setColumnMapping(initial);
        },
        error: () => {
          toaster.create({ type: 'error', title: 'Erro ao ler headers do arquivo' });
        },
      });
    } else {
      // For xlsx, we can't parse client-side without a library – show info
      toaster.create({ type: 'info', title: 'Arquivo XLSX selecionado. Mapeamento de colunas será definido pelo servidor.' });
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

    if (Object.keys(filteredMapping).length === 0 && csvHeaders.length > 0) {
      toaster.create({ type: 'warning', title: 'Mapeie ao menos uma coluna' });
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

      {csvHeaders.length > 0 && (
        <Fieldset.Root>
          <Fieldset.Legend>Mapeamento de Colunas</Fieldset.Legend>
          <Text fontSize="sm" color="fg.muted" mb="3">
            Para cada coluna do arquivo, selecione o campo de destino correspondente.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            {csvHeaders.map((header) => (
              <Box key={header} borderWidth="1px" rounded="md" p="3">
                <Text fontSize="sm" fontWeight="medium" mb="1">
                  {header}
                </Text>
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
