import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  QrCode,
  Stack,
  Text,
} from '@chakra-ui/react';
import { LuCircleCheck, LuCopy, LuMessageCircle, LuSearch, LuShieldCheck } from 'react-icons/lu';

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: { run: (config: { websiteToken: string; baseUrl: string }) => void };
    $chatwoot?: { toggle: (state: 'open' | 'close') => void };
  }
}

type Contract = {
  id: string;
  contractNumber: string;
  debtorName: string;
  productName: string | null;
  dueDate: string | null;
  amount: string;
  updatedAmount?: string;
  cobcomDiscountPercent?: string;
  creditor: { name: string; cnpj: string | null };
};

type Pix = {
  chargeId: string;
  amount: number;
  pixCopyPaste: string;
  status: 'ISSUED' | 'PAID' | 'EXPIRED' | 'FAILED';
};

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatCnpj(value: string | null) {
  if (!value) return 'CNPJ não informado';
  const digits = onlyDigits(value);
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function RegularizeDebtPage() {
  const [searchParams] = useSearchParams();
  const [cpf, setCpf] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasLoadedUrlCpf, setHasLoadedUrlCpf] = useState(false);
  const hasValidCpf = useMemo(() => onlyDigits(cpf).length === 11, [cpf]);

  useEffect(() => {
    const baseUrl = 'https://chat.maisqpago.com.br';
    const websiteToken = 'qB4eYwd9pFYWJu9xLf1BjhGp';
    const scriptId = 'chatwoot-sdk';

    window.chatwootSettings = { hideMessageBubble: true, position: 'right', locale: 'pt_BR' };
    const start = () => window.chatwootSDK?.run({ websiteToken, baseUrl });
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.chatwootSDK) start();
      else existing.addEventListener('load', start, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.onload = start;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!pix || pix.status === 'PAID') return;
    const timer = window.setInterval(async () => {
      try {
        const { data } = await publicApi.get<{ status: Pix['status'] }>(`/public/debts/charges/${pix.chargeId}`, {
          params: { debtorDocument: onlyDigits(cpf) },
        });
        setPix((current) => current ? { ...current, status: data.status } : current);
      } catch {
        // Keep the existing Pix available even if a polling request is transiently unavailable.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [cpf, pix]);

  async function lookup() {
    if (!hasValidCpf) {
      setError('Informe os 11 números do seu CPF.');
      return;
    }
    await lookupByDocument(onlyDigits(cpf));
  }

  useEffect(() => {
    if (hasLoadedUrlCpf) return;

    const cpfFromUrl = onlyDigits(searchParams.get('cpf') ?? '');
    setHasLoadedUrlCpf(true);
    if (cpfFromUrl.length !== 11) return;

    setCpf(formatCpf(cpfFromUrl));
    void lookupByDocument(cpfFromUrl);
  // The URL is intentionally consumed only once when the page opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedUrlCpf, searchParams]);

  async function lookupByDocument(document: string) {
    setLoading(true);
    setError('');
    setSelected(null);
    setPix(null);
    try {
      const { data } = await publicApi.post<{ contracts: Contract[] }>('/public/debts/lookup', {
        debtorDocument: document,
      });
      setContracts(data.contracts);
      // SMS links carry a contract id. It is only selected after the backend
      // has confirmed that it belongs to the informed CPF and is payable.
      const contractIdFromUrl = searchParams.get('contract');
      if (contractIdFromUrl) {
        setSelected(data.contracts.find((contract) => contract.id === contractIdFromUrl) ?? null);
      }
    } catch (requestError) {
      const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
      setContracts([]);
      setError(status === 429
        ? 'Muitas consultas. Aguarde alguns minutos antes de tentar novamente.'
        : 'Não foi possível concluir a consulta. Confira o CPF e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function generatePix() {
    if (!selected) return;
    setIssuing(true);
    setError('');
    try {
      const { data } = await publicApi.post<Pix>('/public/debts/pix', {
        debtorDocument: onlyDigits(cpf),
        contractId: selected.id,
      });
      setPix(data);
    } catch (requestError) {
      const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
      setError(status === 429
        ? 'Muitas tentativas de emissão. Aguarde alguns minutos antes de tentar novamente.'
        : 'Não foi possível gerar o Pix agora. Tente novamente em alguns instantes.');
    } finally {
      setIssuing(false);
    }
  }

  async function copyPix() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.pixCopyPaste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Box minH="100vh" bg="#f5f9fd" color="#2c2f34">
      <Box bg="white" borderBottomWidth="1px" borderColor="blackAlpha.100" px={{ base: 5, md: 12 }} py="4">
        <Box maxW="6xl" mx="auto">
          <img src="https://bm.cobcomvc.com.br/wp-content/uploads/2026/05/Logo-cobcom-caixa-recorrente.jpeg" alt="CobCom" style={{ width: '150px', height: 'auto' }} />
        </Box>
      </Box>

      <Flex px={{ base: 3, sm: 4 }} py={{ base: 8, md: 20 }} justify="center">
        <Stack w="full" maxW="2xl" gap="6">
          <Stack textAlign="center" align="center" gap="3">
            <Box bg="#e7f3ff" color="#0088ff" p="3" rounded="full"><LuShieldCheck size={28} /></Box>
            <Heading size={{ base: 'xl', md: '2xl' }} letterSpacing="tight">Consulte seus débitos e regularize sua vida financeira</Heading>
            <Text color="gray.600" maxW="xl">Informe seu CPF para consultar cobranças pendentes e pagar com Pix de forma simples e segura.</Text>
          </Stack>

          <Card.Root shadow="lg" borderTopWidth="4px" borderTopColor="#0088ff">
            <Card.Body>
              <Stack gap="4">
                <Field.Root invalid={!!error && contracts.length === 0} required>
                  <Field.Label htmlFor="public-cpf">CPF</Field.Label>
                  <HStack align="start" flexDir={{ base: 'column', sm: 'row' }} w="full">
                    <Input id="public-cpf" size="lg" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} onKeyDown={(event) => event.key === 'Enter' && lookup()} w="full" />
                    <Button size="lg" bg="#0088ff" color="white" _hover={{ bg: '#0074dc' }} loading={loading} onClick={lookup} disabled={!hasValidCpf} w={{ base: 'full', sm: 'auto' }}>
                      <LuSearch /> Consultar
                    </Button>
                  </HStack>
                  <Field.HelperText>Seus dados são usados apenas para localizar as cobranças vinculadas ao seu CPF.</Field.HelperText>
                  <Field.ErrorText>{error}</Field.ErrorText>
                </Field.Root>
              </Stack>
            </Card.Body>
          </Card.Root>

          {contracts.length > 0 && !pix && (
            <Card.Root variant="outline" overflow="hidden">
              <Card.Header><Heading size="md">Selecione uma cobrança para pagar</Heading></Card.Header>
              <Card.Body pt="0" px={{ base: 3, sm: 5 }}><Stack gap="3">
                {contracts.map((contract) => (
                  <Box key={contract.id} borderWidth="2px" borderColor={selected?.id === contract.id ? '#0088ff' : 'gray.100'} rounded="md" p={{ base: 3, sm: 4 }} cursor="pointer" bg={selected?.id === contract.id ? '#f0f8ff' : 'white'} onClick={() => setSelected(contract)}>
                    <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'stretch', sm: 'start' }} gap={{ base: 4, sm: 6 }} minW="0">
                      <Stack gap="1" minW="0" flex="1"><Text fontWeight="bold" wordBreak="break-word">{contract.creditor.name}</Text><Text fontSize="sm" color="gray.600" wordBreak="break-word">CNPJ: {formatCnpj(contract.creditor.cnpj)}</Text>{contract.debtorName && <Text fontSize="sm" color="gray.700" fontWeight="medium" wordBreak="break-word">Em nome de: {contract.debtorName}</Text>}{contract.productName && <Text fontSize="sm" color="gray.700" wordBreak="break-word">{contract.productName}</Text>}<Text fontSize="sm" color="gray.600" wordBreak="break-word">Contrato: {contract.contractNumber}{contract.dueDate ? ` · Vencimento: ${new Date(contract.dueDate).toLocaleDateString('pt-BR')}` : ''}</Text></Stack>
                      <Stack gap="0" align={{ base: 'start', sm: 'end' }} flexShrink="0">
                        {Number(contract.cobcomDiscountPercent ?? 0) > 0 && <Text fontSize="sm" color="gray.600">Valor atualizado: {formatMoney(contract.updatedAmount ?? contract.amount)}</Text>}
                        <Text fontWeight="bold" color="#006dc9" fontSize={{ base: 'md', sm: 'sm' }} wordBreak="break-word">{Number(contract.cobcomDiscountPercent ?? 0) > 0 ? `Com Desconto CobCom: ${formatMoney(contract.amount)}` : formatMoney(contract.amount)}</Text>
                      </Stack>
                    </Flex>
                  </Box>
                ))}
                <Button mt="2" size="lg" bg="#0088ff" color="white" _hover={{ bg: '#0074dc' }} disabled={!selected} loading={issuing} onClick={generatePix}>Gerar Pix</Button>
              </Stack></Card.Body>
            </Card.Root>
          )}

          {contracts.length === 0 && !loading && !error && cpf && <Text textAlign="center" color="gray.600">Nenhuma cobrança pendente foi encontrada para este CPF.</Text>}

          {pix && pix.status === 'PAID' && (
            <Card.Root bg="green.50" borderColor="green.300" borderWidth="1px"><Card.Body><HStack align="start" gap="3"><Box color="green.600" mt="1"><LuCircleCheck size={28} /></Box><Stack gap="1"><Heading size="md" color="green.800">Recebemos seu pagamento</Heading><Text color="green.800">Nos próximos dias, seu CPF será removido de todos os canais de cobrança.</Text></Stack></HStack></Card.Body></Card.Root>
          )}

          {pix && pix.status !== 'PAID' && (
            <Card.Root shadow="md"><Card.Header><Heading size="md">Pague com Pix</Heading><Text color="gray.600">Escaneie o QR Code ou copie o código abaixo.</Text></Card.Header><Card.Body><Stack align="center" gap="5"><Box p="4" bg="white" borderWidth="1px" rounded="md"><QrCode.Root value={pix.pixCopyPaste} size="2xl"><QrCode.Frame><QrCode.Pattern /></QrCode.Frame></QrCode.Root></Box><Box w="full" bg="gray.50" p="3" rounded="md" fontSize="xs" wordBreak="break-all">{pix.pixCopyPaste}</Box><Button variant="outline" borderColor="#0088ff" color="#006dc9" onClick={copyPix}><LuCopy />{copied ? 'Código copiado' : 'Copiar código Pix'}</Button><Text fontSize="sm" color="gray.600">Aguardando a confirmação do pagamento…</Text></Stack></Card.Body></Card.Root>
          )}
        </Stack>
      </Flex>
      <Box textAlign="center" pb="8"><Text fontSize="sm" color="gray.600">© {new Date().getFullYear()} CobCom. Todos os direitos reservados.</Text></Box>

      <Box position="fixed" right={{ base: 3, sm: 5 }} bottom={{ base: 3, sm: 5 }} zIndex="overlay">
        <Button
          rounded="full"
          size="lg"
          bg="#2563EB"
          color="white"
          shadow="lg"
          _hover={{ bg: '#1D4ED8' }}
          onClick={() => window.$chatwoot?.toggle('open')}
        >
          <LuMessageCircle /> Regularize agora sua dívida
        </Button>
      </Box>
    </Box>
  );
}
