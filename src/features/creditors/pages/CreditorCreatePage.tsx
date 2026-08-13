import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stack,
  HStack,
  Button,
  Input,
  Card,
  Heading,
  Field,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { LuArrowLeft, LuPlus, LuTrash2 } from 'react-icons/lu';
import { NativeSelect } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { PageHeader } from '@/components/common';
import { useCreateCreditorMutation } from '../api/useCreditorMutations';
import { ContactType } from '@/types/enums';

const contactTypeOptions = [
  { value: ContactType.EMAIL, label: 'E-mail' },
  { value: ContactType.PHONE, label: 'Telefone' },
  { value: ContactType.WHATSAPP, label: 'WhatsApp' },
];

const creditorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  contacts: z.array(z.object({
    type: z.nativeEnum(ContactType),
    value: z.string().min(1, 'Valor do contato é obrigatório'),
  })).optional(),
  address: z.object({
    street: z.string().min(1, 'Rua é obrigatória'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(1, 'Estado é obrigatório'),
    zipCode: z.string().min(1, 'CEP é obrigatório'),
  }).optional(),
});

type CreditorFormValues = z.infer<typeof creditorSchema>;

export default function CreditorCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateCreditorMutation();
  const [contacts, setContacts] = useState<Array<{ type: ContactType; value: string }>>([]);
  const [showAddress, setShowAddress] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreditorFormValues>({
    resolver: zodResolver(creditorSchema),
    defaultValues: {
      name: '',
      cnpj: '',
    },
  });

  function addContact() {
    setContacts([...contacts, { type: ContactType.EMAIL, value: '' }]);
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: 'type' | 'value', val: string) {
    const updated = [...contacts];
    const item = updated[index];
    if (!item) return;
    if (field === 'type') {
      item.type = val as ContactType;
    } else {
      item.value = val;
    }
    setContacts(updated);
  }

  async function onSubmit(data: CreditorFormValues) {
    try {
      const payload = {
        ...data,
        contacts: contacts.length > 0 ? contacts : undefined,
        address: showAddress ? data.address : undefined,
      };
      await createMutation.mutateAsync(payload);
      toaster.create({
        type: 'success',
        title: 'Credor criado com sucesso',
      });
      navigate('/creditors');
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <Stack gap="4">
      <HStack>
        <Button variant="ghost" size="sm" onClick={() => navigate('/creditors')}>
          <LuArrowLeft /> Voltar
        </Button>
      </HStack>

      <PageHeader title="Novo Credor" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="4">
          {/* Basic Info */}
          <Card.Root>
            <Card.Body gap="4">
              <Heading size="sm">Dados Gerais</Heading>
              <HStack gap="4" wrap="wrap">
                <Field.Root invalid={!!errors.name} required flex="1" minW="200px">
                  <Field.Label>Nome</Field.Label>
                  <Input placeholder="Nome do credor" {...register('name')} />
                  <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                </Field.Root>

                <Field.Root invalid={!!errors.cnpj} flex="1" minW="200px">
                  <Field.Label>CNPJ</Field.Label>
                  <Input placeholder="00.000.000/0000-00" {...register('cnpj')} />
                  <Field.ErrorText>{errors.cnpj?.message}</Field.ErrorText>
                </Field.Root>
              </HStack>
            </Card.Body>
          </Card.Root>

          {/* Contacts */}
          <Card.Root>
            <Card.Body gap="4">
              <HStack justify="space-between">
                <Heading size="sm">Contatos</Heading>
                <Button size="xs" variant="outline" onClick={addContact}>
                  <LuPlus /> Adicionar
                </Button>
              </HStack>

              {contacts.length === 0 && (
                <Text fontSize="sm" color="fg.muted">Nenhum contato adicionado</Text>
              )}

              {contacts.map((contact, idx) => (
                <HStack key={idx} gap="3">
                  <NativeSelect.Root size="sm" w="140px">
                    <NativeSelect.Field
                      value={contact.type}
                      onChange={(e) => updateContact(idx, 'type', e.target.value)}
                    >
                      {contactTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </NativeSelect.Field>
                  <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Input
                    size="sm"
                    flex="1"
                    placeholder="Valor do contato"
                    value={contact.value}
                    onChange={(e) => updateContact(idx, 'value', e.target.value)}
                  />
                  <IconButton
                    aria-label="Remover contato"
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => removeContact(idx)}
                  >
                    <LuTrash2 />
                  </IconButton>
                </HStack>
              ))}
            </Card.Body>
          </Card.Root>

          {/* Address */}
          <Card.Root>
            <Card.Body gap="4">
              <HStack justify="space-between">
                <Heading size="sm">Endereço</Heading>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setShowAddress(!showAddress)}
                >
                  {showAddress ? 'Remover' : 'Adicionar'}
                </Button>
              </HStack>

              {!showAddress && (
                <Text fontSize="sm" color="fg.muted">Nenhum endereço adicionado</Text>
              )}

              {showAddress && (
                <Stack gap="3">
                  <HStack gap="3" wrap="wrap">
                    <Field.Root flex="3" minW="200px">
                      <Field.Label>Rua</Field.Label>
                      <Input size="sm" {...register('address.street')} />
                    </Field.Root>
                    <Field.Root flex="1" minW="80px">
                      <Field.Label>Número</Field.Label>
                      <Input size="sm" {...register('address.number')} />
                    </Field.Root>
                  </HStack>
                  <HStack gap="3" wrap="wrap">
                    <Field.Root flex="1" minW="150px">
                      <Field.Label>Complemento</Field.Label>
                      <Input size="sm" {...register('address.complement')} />
                    </Field.Root>
                    <Field.Root flex="1" minW="150px">
                      <Field.Label>Bairro</Field.Label>
                      <Input size="sm" {...register('address.neighborhood')} />
                    </Field.Root>
                  </HStack>
                  <HStack gap="3" wrap="wrap">
                    <Field.Root flex="2" minW="150px">
                      <Field.Label>Cidade</Field.Label>
                      <Input size="sm" {...register('address.city')} />
                    </Field.Root>
                    <Field.Root flex="1" minW="80px">
                      <Field.Label>Estado</Field.Label>
                      <Input size="sm" placeholder="UF" {...register('address.state')} />
                    </Field.Root>
                    <Field.Root flex="1" minW="120px">
                      <Field.Label>CEP</Field.Label>
                      <Input size="sm" placeholder="00000-000" {...register('address.zipCode')} />
                    </Field.Root>
                  </HStack>
                </Stack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Submit */}
          <HStack justify="flex-end">
            <Button variant="outline" onClick={() => navigate('/creditors')}>
              Cancelar
            </Button>
            <Button type="submit" colorPalette="blue" loading={isSubmitting}>
              Salvar Credor
            </Button>
          </HStack>
        </Stack>
      </form>
    </Stack>
  );
}
