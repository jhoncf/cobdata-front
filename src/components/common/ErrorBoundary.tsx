import { Component, type ErrorInfo, type ReactNode } from 'react';
import { VStack, Heading, Text, Button } from '@chakra-ui/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <VStack py="12" gap="3">
          <Heading size="md" color="fg.error">
            Algo deu errado
          </Heading>
          <Text fontSize="sm" color="fg.muted" maxW="md" textAlign="center">
            {this.state.error?.message ?? 'Erro inesperado na aplicação.'}
          </Text>
          <Button size="sm" variant="outline" onClick={this.handleReset}>
            Tentar novamente
          </Button>
        </VStack>
      );
    }

    return this.props.children;
  }
}
