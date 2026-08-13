import { useMemo } from 'react';
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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function calcStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  return score;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch('newPassword', '');
  const strength = useMemo(() => calcStrength(newPasswordValue), [newPasswordValue]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toaster.create({
        type: 'success',
        title: 'Senha alterada com sucesso!',
      });
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        setError('currentPassword', {
          message: 'Senha atual incorreta',
        });
      }
    }
  };

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
          <Heading size="lg">Alterar Senha</Heading>
          <Text color="fg.muted" mt="1">
            Defina uma nova senha para sua conta
          </Text>
        </Card.Header>
        <Card.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="4">
              <Field.Root invalid={!!errors.currentPassword} required>
                <Field.Label htmlFor="currentPassword">Senha Atual</Field.Label>
                <PasswordInput
                  id="currentPassword"
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                  aria-required="true"
                  {...register('currentPassword')}
                />
                <Field.ErrorText>{errors.currentPassword?.message}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={!!errors.newPassword} required>
                <Field.Label htmlFor="newPassword">Nova Senha</Field.Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="Digite sua nova senha"
                  autoComplete="new-password"
                  aria-required="true"
                  {...register('newPassword')}
                />
                <Field.ErrorText>{errors.newPassword?.message}</Field.ErrorText>
              </Field.Root>

              <Box>
                <PasswordStrengthMeter value={strength} />
              </Box>

              <Field.Root invalid={!!errors.confirmPassword} required>
                <Field.Label htmlFor="confirmPassword">Confirmar Nova Senha</Field.Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirme sua nova senha"
                  autoComplete="new-password"
                  aria-required="true"
                  {...register('confirmPassword')}
                />
                <Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText>
              </Field.Root>

              <Stack gap="1" textStyle="xs" color="fg.muted">
                <Text>A senha deve conter:</Text>
                <Text color={newPasswordValue.length >= 8 ? 'green.600' : undefined}>
                  • Mínimo 8 caracteres
                </Text>
                <Text color={/[A-Z]/.test(newPasswordValue) ? 'green.600' : undefined}>
                  • Uma letra maiúscula
                </Text>
                <Text color={/[a-z]/.test(newPasswordValue) ? 'green.600' : undefined}>
                  • Uma letra minúscula
                </Text>
                <Text color={/[0-9]/.test(newPasswordValue) ? 'green.600' : undefined}>
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
                Alterar Senha
              </Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
