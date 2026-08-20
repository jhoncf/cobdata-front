import { Alert, Code, Text } from '@chakra-ui/react';
import type { UserFriendlyError } from '../types';

interface ChargeErrorFeedbackProps {
  error: UserFriendlyError;
}

/**
 * Displays a user-friendly, non-technical error message after charge issuance failure.
 * Uses role="alert" and aria-live="assertive" for screen reader announcement (Req 5 AC4).
 * Never exposes HTTP status codes, stack traces, or raw JSON (Req 5 AC3).
 */
export function ChargeErrorFeedback({ error }: ChargeErrorFeedbackProps) {
  return (
    <Alert.Root status="error" role="alert" aria-live="assertive">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Erro na emissão</Alert.Title>
        <Alert.Description>{error.message}</Alert.Description>
        {error.supportReference && (
          <Text fontSize="sm" mt="2" color="fg.muted">
            Referência para suporte: <Code size="sm">{error.supportReference}</Code>
          </Text>
        )}
      </Alert.Content>
    </Alert.Root>
  );
}
