import { Badge, Button, Code, HStack, Image, Link, Stack, Text } from '@chakra-ui/react';
import { LuCopy, LuExternalLink } from 'react-icons/lu';
import { toaster } from '@/components/ui/toaster';
import type { PaymentCharge } from '../types';

// ─── Copy Helper ─────────────────────────────────────────────────────────────

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toaster.create({
      type: 'success',
      title: `${label} copiado`,
      description: 'O conteúdo foi copiado para a área de transferência.',
    });
  } catch {
    toaster.create({
      type: 'error',
      title: 'Falha ao copiar',
      description: 'Não foi possível copiar. Tente manualmente.',
    });
  }
}

// ─── Artifact Blocks ─────────────────────────────────────────────────────────

function DigitableLineBlock({ value }: { value: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        Linha digitável
      </Text>
      <HStack gap="2">
        <Code size="sm" wordBreak="break-all" flex="1">
          {value}
        </Code>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => copyToClipboard(value, 'Linha digitável')}
          aria-label="Copiar linha digitável"
        >
          <LuCopy />
        </Button>
      </HStack>
    </Stack>
  );
}

function BarcodeBlock({ value }: { value: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        Código de barras
      </Text>
      <HStack gap="2">
        <Code size="sm" wordBreak="break-all" flex="1">
          {value}
        </Code>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => copyToClipboard(value, 'Código de barras')}
          aria-label="Copiar código de barras"
        >
          <LuCopy />
        </Button>
      </HStack>
    </Stack>
  );
}

function PixCopyPasteBlock({ value }: { value: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        Pix Copia e Cola
      </Text>
      <HStack gap="2">
        <Code size="sm" wordBreak="break-all" flex="1">
          {value}
        </Code>
        <Button
          size="xs"
          variant="outline"
          colorPalette="green"
          onClick={() => copyToClipboard(value, 'Pix Copia e Cola')}
          aria-label="Copiar código Pix"
        >
          <LuCopy /> Copiar
        </Button>
      </HStack>
    </Stack>
  );
}

function QrCodeBlock({ value }: { value: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        QR Code
      </Text>
      <Image
        src={value}
        alt="QR Code para pagamento"
        maxW="200px"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        p="2"
      />
    </Stack>
  );
}

function PdfLinkBlock({ url }: { url: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        Documento
      </Text>
      <Link href={url} target="_blank" rel="noopener noreferrer" colorPalette="blue">
        <HStack gap="1">
          <LuExternalLink />
          <Text fontSize="sm">Abrir boleto (PDF)</Text>
        </HStack>
      </Link>
    </Stack>
  );
}

function ExternalRefBlock({ value }: { value: string }) {
  return (
    <Stack gap="1">
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
        Referência externa
      </Text>
      <Text fontSize="sm" fontFamily="mono">
        {value}
      </Text>
    </Stack>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: 'yellow',
  ISSUED: 'blue',
  PAID: 'green',
  CANCELLED: 'gray',
  EXPIRED: 'orange',
  FAILED: 'red',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: 'Pendente',
  ISSUED: 'Emitido',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
  FAILED: 'Falhou',
};

function ChargeStatusBadge({ status }: { status: string }) {
  return (
    <Badge colorPalette={STATUS_COLOR_MAP[status] ?? 'gray'} variant="subtle">
      {STATUS_LABEL_MAP[status] ?? status}
    </Badge>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface PaymentChargeResultProps {
  charge: PaymentCharge;
}

/**
 * Displays charge result with conditional artifact rendering.
 * Only renders artifacts that are present in the response (Req 3).
 * No placeholders, error indicators, or skeleton for missing artifacts.
 */
export function PaymentChargeResult({ charge }: PaymentChargeResultProps) {
  return (
    <Stack gap="4" aria-label="Resultado da cobrança">
      <ChargeStatusBadge status={charge.status} />
      {charge.digitableLine && <DigitableLineBlock value={charge.digitableLine} />}
      {charge.barcode && <BarcodeBlock value={charge.barcode} />}
      {charge.pixCopyPaste && <PixCopyPasteBlock value={charge.pixCopyPaste} />}
      {charge.qrCode && <QrCodeBlock value={charge.qrCode} />}
      {charge.pdfUrl && <PdfLinkBlock url={charge.pdfUrl} />}
      {charge.externalRef && <ExternalRefBlock value={charge.externalRef} />}
    </Stack>
  );
}
