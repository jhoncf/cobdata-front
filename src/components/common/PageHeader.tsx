import { Flex, Heading } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <Flex
      justify="space-between"
      align="center"
      mb="5"
      gap="4"
      wrap="wrap"
    >
      <Heading size="xl" fontWeight="700" letterSpacing="-0.02em">
        {title}
      </Heading>
      {children && <Flex gap="2" align="center">{children}</Flex>}
    </Flex>
  );
}
