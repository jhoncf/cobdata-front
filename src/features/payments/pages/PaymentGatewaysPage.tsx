import { useState } from 'react';
import { Button, Stack } from '@chakra-ui/react';
import { LuPlus } from 'react-icons/lu';
import { PageHeader } from '@/components/common';
import { PaymentGatewaysList } from '../components/PaymentGatewaysList';
import { PaymentGatewayFormDialog } from '../components/PaymentGatewayFormDialog';
import type { PaymentGatewaySummary } from '../types';

export default function PaymentGatewaysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editGateway, setEditGateway] = useState<PaymentGatewaySummary | null>(null);

  return (
    <Stack gap="6">
      <PageHeader title="Meios de pagamento">
        <Button colorPalette="blue" size="sm" onClick={() => setShowCreate(true)}>
          <LuPlus /> Nova configuração
        </Button>
      </PageHeader>

      <PaymentGatewaysList onEdit={setEditGateway} />

      <PaymentGatewayFormDialog
        open={showCreate || !!editGateway}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setEditGateway(null);
          }
        }}
        gateway={editGateway}
      />
    </Stack>
  );
}
