import { Button, List, Stack, Text } from '@chakra-ui/react';
import { LuPencil } from 'react-icons/lu';
import type { PaymentPreflightResult } from '../types';

/**
 * Maps backend field identifiers to user-friendly names in Portuguese.
 */
const FIELD_LABELS: Record<string, string> = {
  debtorDocument: 'CPF/CNPJ do devedor',
  debtorName: 'Nome do devedor',
  debtorStreet: 'Endereço do devedor',
  debtorCity: 'Cidade do devedor',
  debtorState: 'Estado (UF) do devedor',
  debtorZipCode: 'CEP do devedor',
  debtorNeighborhood: 'Bairro do devedor',
  debtorAddressNumber: 'Número do endereço',
  debtorPhone: 'Telefone do devedor',
  debtorEmail: 'E-mail do devedor',
  dueDate: 'Data de vencimento',
  originalValue: 'Valor original',
  updatedValue: 'Valor atualizado',
  amount: 'Valor da cobrança',
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

interface PreflightErrorsProps {
  preflight: PaymentPreflightResult;
  onEditContract: () => void;
}

/**
 * Displays preflight validation errors with user-friendly field names
 * and a CTA to edit the contract.
 *
 * Uses role="alert" for screen reader accessibility (Req 2 AC4).
 */
export function PreflightErrors({ preflight, onEditContract }: PreflightErrorsProps) {
  if (preflight.valid || preflight.missingFields.length === 0) {
    return null;
  }

  return (
    <Stack gap="3" role="alert" aria-live="assertive">
      <Text fontWeight="semibold" color="fg.error">
        O contrato possui dados incompletos para emissão:
      </Text>
      <List.Root gap="1" ps="4">
        {preflight.missingFields.map((item) => (
          <List.Item key={item.field}>
            <Text fontSize="sm">
              <Text as="span" fontWeight="medium">
                {getFieldLabel(item.field)}
              </Text>
              {item.reason && (
                <Text as="span" color="fg.muted">
                  {' — '}{item.reason}
                </Text>
              )}
            </Text>
          </List.Item>
        ))}
      </List.Root>
      <Button
        variant="outline"
        colorPalette="blue"
        size="sm"
        onClick={onEditContract}
        alignSelf="flex-start"
      >
        <LuPencil /> Editar contrato
      </Button>
    </Stack>
  );
}
