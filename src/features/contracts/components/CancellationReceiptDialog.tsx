import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { LuDownload } from 'react-icons/lu';
import type { Contract } from '@/types/models';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface CancellationReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

function cancellationReasonLabel(reason: Contract['cancellationReason']) {
  if (reason === 'CONTESTATION') return 'Contestação';
  if (reason === 'CREDITOR_REQUEST') return 'Solicitação do credor';
  return 'Baixa administrativa';
}

export function CancellationReceiptDialog({
  open,
  onOpenChange,
  contract,
}: CancellationReceiptDialogProps) {
  if (!contract) return null;

  const cancelledAt = contract.cancelledAt ? formatDate(contract.cancelledAt) : 'Data não registrada';
  const reason = cancellationReasonLabel(contract.cancellationReason);

  const downloadPdf = () => {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[character] ?? character));
    const receiptWindow = window.open('', '_blank', 'width=800,height=900');
    if (!receiptWindow) return;
    const rows = [
      ['Contrato', contract.contractNumber],
      ['CPF/CNPJ', contract.debtorDocument],
      ['Devedor', contract.debtorName || 'Não informado'],
      ['Valor atualizado', formatCurrency(contract.updatedValue)],
      ['Data da baixa', cancelledAt],
      ['Motivo', reason],
      ['Situação atual', 'Cancelado / baixado da carteira'],
    ].map(([label, value]) => `<tr><th>${escapeHtml(label ?? '')}</th><td>${escapeHtml(value ?? '')}</td></tr>`).join('');
    receiptWindow.document.write(`<!doctype html><html lang="pt-BR"><head><title>Comprovante de baixa - ${escapeHtml(contract.contractNumber)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0}.header{background:#2563eb;color:#fff;padding:24px 42px;font-weight:700;font-size:20px}.content{padding:42px;max-width:720px;margin:auto}.status{background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:16px;margin:24px 0}.status strong{display:block;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:13px 10px;border-bottom:1px solid #dbe1ea;text-align:left}th{width:36%;color:#526078;font-size:13px}td{font-weight:600}.footer{color:#667085;font-size:12px;border-top:1px solid #dbe1ea;margin-top:28px;padding-top:16px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="header">COBCOM - COMPROVANTE DE BAIXA</div><main class="content"><p>Este documento confirma o registro de baixa administrativa no CRM CobCom.</p><div class="status"><strong>Baixa registrada</strong>O contrato foi cancelado e retirado da carteira em ${escapeHtml(cancelledAt)}.</div><table>${rows}</table><p class="footer">Emitido em ${escapeHtml(formatDate(new Date().toISOString()))} pelo Portal CobCom. Para exportar, escolha “Salvar como PDF” na janela de impressão.</p></main><script>window.onload=()=>window.print();</script></body></html>`);
    receiptWindow.document.close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(event) => onOpenChange(event.open)} size={{ mdDown: 'full', md: 'lg' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Comprovante de baixa</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="5">
                <Box borderWidth="1px" borderColor="green.muted" bg="green.subtle" rounded="md" p="4">
                  <Text fontWeight="semibold" color="green.fg">Baixa registrada</Text>
                  <Text mt="1" fontSize="sm">O contrato foi cancelado e retirado da carteira em {cancelledAt}.</Text>
                </Box>
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
                  <ReceiptField label="Contrato" value={contract.contractNumber} />
                  <ReceiptField label="Data da baixa" value={cancelledAt} />
                  <ReceiptField label="CPF/CNPJ" value={contract.debtorDocument} />
                  <ReceiptField label="Motivo" value={reason} />
                  <ReceiptField label="Devedor" value={contract.debtorName || 'Não informado'} />
                  <ReceiptField label="Valor atualizado" value={formatCurrency(contract.updatedValue)} />
                </SimpleGrid>
                <Text fontSize="xs" color="fg.muted">
                  Este comprovante registra a baixa no CRM CobCom. Se o contrato estava ativo em um canal externo, a remoção desse canal segue o respectivo processamento.
                </Text>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                <Button colorPalette="blue" onClick={downloadPdf}><LuDownload /> Exportar PDF</Button>
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted">{label}</Text>
      <Text fontWeight="medium">{value}</Text>
    </Box>
  );
}
