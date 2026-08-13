import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PasswordInput } from '@/components/ui/password-input';
import { toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { LoginResponse, MeResponse } from '@/types/api';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Formato de e-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retrySeconds <= 0) {
      setIsRateLimited(false);
      return;
    }

    const timer = setInterval(() => {
      setRetrySeconds((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retrySeconds]);

  const onSubmit = useCallback(
    async (data: LoginFormValues) => {
      try {
        // POST /api/auth/login
        const loginRes = await api.post<LoginResponse>('/auth/login', data);
        const { accessToken } = loginRes.data;

        // Set token in store (decodes JWT for mustResetPassword)
        setToken(accessToken);

        // GET /api/auth/me
        const meRes = await api.get<MeResponse>('/auth/me');
        setUser(meRes.data);

        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { retryAfterSeconds?: number } } };

        if (err.response?.status === 429) {
          const seconds = err.response.data?.retryAfterSeconds ?? 30;
          setIsRateLimited(true);
          setRetrySeconds(seconds);
        } else if (err.response?.status === 401) {
          toaster.create({
            type: 'error',
            title: 'Credenciais inválidas',
            description: 'Verifique seu e-mail e senha.',
          });
        }
        // Other errors are handled by the global error handler
      }
    },
    [navigate, setToken, setUser],
  );

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
          <Heading size="lg">CobData</Heading>
          <Text color="fg.muted" mt="1">
            Acesse sua conta
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

              <Field.Root invalid={!!errors.password} required>
                <Field.Label htmlFor="password">Senha</Field.Label>
                <PasswordInput
                  id="password"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  aria-required="true"
                  {...register('password')}
                />
                <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
              </Field.Root>

              <Box textAlign="right">
                <Button
                  variant="plain"
                  size="sm"
                  colorPalette="blue"
                  onClick={() => navigate('/forgot-password')}
                >
                  Esqueceu a senha?
                </Button>
              </Box>

              <Button
                type="submit"
                colorPalette="blue"
                width="full"
                loading={isSubmitting}
                disabled={isRateLimited || isSubmitting}
              >
                {isRateLimited ? `Aguarde ${retrySeconds}s` : 'Entrar'}
              </Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
