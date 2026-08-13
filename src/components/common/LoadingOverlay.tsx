import { Flex, Spinner, Text } from '@chakra-ui/react';

interface LoadingOverlayProps {
  label?: string;
}

export function LoadingOverlay({ label }: LoadingOverlayProps) {
  return (
    <Flex
      justify="center"
      align="center"
      direction="column"
      gap="3"
      py="12"
    >
      <Spinner size="lg" color="blue.500" />
      {label && (
        <Text fontSize="sm" color="fg.muted">
          {label}
        </Text>
      )}
    </Flex>
  );
}
