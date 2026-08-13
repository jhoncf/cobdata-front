import { Badge } from '@chakra-ui/react';
import { STATUS_COLORS } from '@/theme/tokens';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorPalette = STATUS_COLORS[status] ?? 'gray';

  return (
    <Badge
      colorPalette={colorPalette}
      variant="subtle"
      size="sm"
      rounded="md"
      fontWeight="medium"
    >
      {label ?? status}
    </Badge>
  );
}
