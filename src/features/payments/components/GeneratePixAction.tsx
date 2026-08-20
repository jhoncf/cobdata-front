import { useState } from 'react';
import {
  Button,
  CloseButton,
  Code,
  Dialog,
  HStack,
  Portal,
  QrCode,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { LuCopy, LuQrCode } from 'react-icons/lu';
import { toaster } from '@/components/ui/toaster';
import { useGeneratePix } from '../hooks';
import { mapChargeError } from '../error-map';
import { ChargeErrorFeedback } from './ChargeErrorFeedback';
import type { GeneratePixResponse, UserFriendlyError } from '../types';
import type { Contract } from '@/types/models';
import type { AxiosError } from 'axios';

// ─── Props ───────────────────────────────────────────────────────────────────

interface GeneratePixActionProps {
  contract: Contract;
}

// ─── Copy Helper ─────────────────────────────────────────────────────────────

async function copyPixCode(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toaster.create({
      type: 'success',
      title: 'Pix copiado',
      description: 'Código Pix copiado para a área de transferência.',
    });
  } catch {
    toaster.create({
      type: 'error',
      title: 'Falha ao copiar',
      description: 'Não foi possível copiar o código Pix.',
    });
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * "Gerar Pix" action button for contract listing.
 * Checks for existing valid Pix; if exists, shows it. Otherwise emits new one.
 * Visible only to ADMIN and OPERATIONAL roles (handled by parent via usePermission).
 */
export function GeneratePixAction({ contract }: GeneratePixActionProps) {
  const [open, setOpen] = useState(false);
  const [pixResult, setPixResult] = useState<GeneratePixResponse | null>(null);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const generatePix = useGeneratePix(contract.id);

  const handleOpen = () => {
    setOpen(true);
    setPixResult(null);
    setError(null);

    // Call generate Pix API — backend handles reuse of existing Pix
    generatePix.mutate(undefined, {
      onSuccess: (response) => {
        setPixResult(response);
      },
      onError: (err) => {
        const friendlyError = mapChargeError(err as AxiosError);
        setError(friendlyError);
      },
    });
  };

  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        colorPalette="green"
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        aria-label="Gerar Pix"
      >
        <LuQrCode />
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: 'full', md: 'md' }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Pix — {contract.contractNumber}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {/* Loading state */}
                {generatePix.isPending && (
                  <HStack gap="3" justify="center" py="6">
                    <Spinner size="md" />
                    <Text>Gerando Pix...</Text>
                  </HStack>
                )}

                {/* Error state */}
                {error && <ChargeErrorFeedback error={error} />}

                {/* Success: show Pix copy-paste */}
                {pixResult && (
                  <Stack gap="4">
                    <Text fontSize="sm" color="fg.muted">
                      Pix gerado com sucesso. Use o código abaixo para realizar o pagamento.
                    </Text>

                    <Stack gap="2">
                      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                        Pix Copia e Cola
                      </Text>
                      <Code
                        size="sm"
                        wordBreak="break-all"
                        p="3"
                        display="block"
                      >
                        {pixResult.pixCopyPaste}
                      </Code>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="green"
                        onClick={() => copyPixCode(pixResult.pixCopyPaste)}
                        aria-label="Copiar código Pix"
                      >
                        <LuCopy /> Copiar código Pix
                      </Button>
                    </Stack>

                    <Stack gap="2" align="center">
                      <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                        QR Code
                      </Text>
                      <QrCode.Root value={pixResult.pixCopyPaste} size="2xl">
                        <QrCode.Frame>
                          <QrCode.Pattern />
                        </QrCode.Frame>
                      </QrCode.Root>
                    </Stack>

                    <HStack gap="4" fontSize="xs" color="fg.muted">
                      <Text>
                        Valor: <strong>{pixResult.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      </Text>
                      <Text>
                        Expira em: <strong>{new Date(pixResult.expiresAt).toLocaleString('pt-BR')}</strong>
                      </Text>
                    </HStack>
                  </Stack>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
