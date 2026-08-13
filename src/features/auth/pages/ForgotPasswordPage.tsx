import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import api from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Formato de e-mail inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await api.post('/auth/forgot-password', { email: data.email });
    } catch {
      // Intentionally ignore errors — never reveal if email exists
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg.subtle" p={{ base: 0, md: 4 }}>
        <Card.Root
          width={{ base: '100%', md: 'sm' }}
          minH={{ base: '100vh', md: 'auto' }}
          rounded={{ base: 'none', md: 'lg' }}
          shadow={{ base: 'none', md: 'md' }}
        >
          <Card.Body>
            <Stack gap="4" textAlign="center">
              <Heading size="md">Verifique seu e-mail</Heading>
              <Text color="fg.muted">
                Se o e-mail existir em nossa base, um link de recuperação será enviado.
              </Text>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Voltar ao Login
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Flex>
    );
  }

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="bg.subtle"
      p={{ base: 0, md: 4 }}
    >
      <Card.Root
        width={{ base: '100%', md: 'sm' }}
        minH={{ base: '100vh', md: 'auto' }}
        rounded={{ base: 'none', md: 'lg' }}
        shadow={{ base: 'none', md: 'md' }}
      >
        <Card.Header textAlign="center">
          <Heading size="lg">Recuperar Senha</Heading>
          <Text color="fg.muted" mt="1">
            Informe seu e-mail para receber o link de recuperação
          </Text>
        </Card.Header>
        <Card.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="4">
              <Field.Root invalid={!!errors.email} required>
                <Field.Label htmlFor="email">E-mail</Field.Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  aria-required="true"
                  {...register('email')}
                />
                <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
              </Field.Root>

              <Button
                type="submit"
                colorPalette="blue"
                width="full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Enviar Link
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Voltar ao Login
              </Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
