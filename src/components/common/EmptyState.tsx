import { VStack, Text, Button, Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuInbox } from 'react-icons/lu';

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon: IconComponent = LuInbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <VStack
      py="16"
      gap="3"
      bg="card.bg"
      rounded="xl"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border"
    >
      <Box
        color="fg.subtle"
        p="3"
        rounded="full"
        bg="bg.subtle"
      >
        <IconComponent size={28} />
      </Box>
      <Text fontWeight="semibold" color="fg.muted" fontSize="md">
        {title}
      </Text>
      {description && (
        <Text fontSize="sm" color="fg.subtle" maxW="sm" textAlign="center">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button size="sm" colorPalette="blue" onClick={onAction} mt="3">
          {actionLabel}
        </Button>
      )}
      {children}
    </VStack>
  );
}
