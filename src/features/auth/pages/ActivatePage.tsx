import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Stack,
  Text,
} from '@chakra-ui/react';
import { PasswordInput, PasswordStrengthMeter } from '@/components/ui/password-input';
import { toaster } from '@/components/ui/toaster';
import api from '@/lib/api';

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter ao menos um dígito');

const activateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ActivateFormValues = z.infer<typeof activateSchema>;

function calcStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  return score;
}

export default function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tokenExpired, setTokenExpired] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
  });

  const passwordValue = watch('password', '');
  const strength = useMemo(() => calcStrength(passwordValue), [passwordValue]);

  const onSubmit = async (data: ActivateFormValues) => {
    try {
      await api.post('/auth/activate', {
        token,
        password: data.password,
      });
      toaster.create({
        type: 'success',
        title: 'Conta ativada com sucesso!',
        description: 'Você já pode fazer login.',
      });
      navigate('/login', { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 410) {
        setTokenExpired(true);
      }
    }
  };

  if (tokenExpired) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="bg.subtle" p={{ base: 0, md: 4 }}>
        <Card.Root width={{ base: '100%', md: 'sm' }} minH={{ base: '100vh', md: 'auto' }} rounded={{ base: 'none', md: 'lg' }}>
          <Card.Body>
            <Stack gap="4" textAlign="center">
              <Heading size="md" color="red.600">Token expirado</Heading>
              <Text color="fg.muted">
                O link de ativação expirou. Solicite um novo convite ao administrador.
              </Text>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Ir para Login
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
          <Heading size="lg">Ativar Conta</Heading>
          <Text color="fg.muted" mt="1">
            Defina sua senha de acesso
          </Text>
        </Card.Header>
        <Card.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="4">
              <Field.Root invalid={!!errors.password} required>
                <Field.Label htmlFor="password">Nova Senha</Field.Label>
                <PasswordInput
                  id="password"
                  placeholder="Digite sua senha"
                  autoComplete="new-password"
                  aria-required="true"
                  {...register('password')}
                />
                <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
              </Field.Root>

              <Box>
                <PasswordStrengthMeter value={strength} />
              </Box>

              <Field.Root invalid={!!errors.confirmPassword} required>
                <Field.Label htmlFor="confirmPassword">Confirmar Senha</Field.Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirme sua senha"
                  autoComplete="new-password"
                  aria-required="true"
                  {...register('confirmPassword')}
                />
                <Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText>
              </Field.Root>

              <Stack gap="1" textStyle="xs" color="fg.muted">
                <Text>A senha deve conter:</Text>
                <Text color={passwordValue.length >= 8 ? 'green.600' : undefined}>
                  • Mínimo 8 caracteres
                </Text>
                <Text color={/[A-Z]/.test(passwordValue) ? 'green.600' : undefined}>
                  • Uma letra maiúscula
                </Text>
                <Text color={/[a-z]/.test(passwordValue) ? 'green.600' : undefined}>
                  • Uma letra minúscula
                </Text>
                <Text color={/[0-9]/.test(passwordValue) ? 'green.600' : undefined}>
                  • Um dígito
                </Text>
              </Stack>

              <Button
                type="submit"
                colorPalette="blue"
                width="full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Ativar Conta
              </Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
