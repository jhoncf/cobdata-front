import { useState } from 'react';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  Stack,
  HStack,
  Badge,
  Wrap,
  Text,
  Box,
} from '@chakra-ui/react';
import { LuX, LuPlus } from 'react-icons/lu';
import { useTagsQuery } from '../api/useTagsQuery';
import { useAddTagsMutation, useRemoveTagsMutation } from '../api/useContractMutations';
import { usePermission } from '@/hooks/usePermission';
import type { Contract } from '@/types/models';

interface TagsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

export function TagsManager({ open, onOpenChange, contract }: TagsManagerProps) {
  const { canEdit } = usePermission();
  const { data: allTags } = useTagsQuery();
  const addMutation = useAddTagsMutation();
  const removeMutation = useRemoveTagsMutation();

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const currentTags = contract.tags ?? [];

  const suggestions = (allTags ?? [])
    .filter(
      (t) =>
        !currentTags.includes(t.name) &&
        t.name.toLowerCase().includes(inputValue.toLowerCase()),
    )
    .slice(0, 8);

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    addMutation.mutate({ id: contract.id, data: { tags: [trimmed] } });
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagName: string) => {
    removeMutation.mutate({ id: contract.id, data: { tags: [tagName] } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Tags — Contrato {contract.contractNumber}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="2">Tags atuais</Text>
                  {currentTags.length === 0 ? (
                    <Text fontSize="sm" color="fg.muted">Nenhuma tag associada.</Text>
                  ) : (
                    <Wrap gap="2">
                      {currentTags.map((tag) => (
                        <Badge key={tag} variant="subtle" colorPalette="blue" size="sm">
                          {tag}
                          {canEdit && (
                            <Button
                              size="2xs"
                              variant="ghost"
                              ml="1"
                              onClick={() => handleRemoveTag(tag)}
                              aria-label={`Remover tag ${tag}`}
                              disabled={removeMutation.isPending}
                            >
                              <LuX />
                            </Button>
                          )}
                        </Badge>
                      ))}
                    </Wrap>
                  )}
                </Box>

                {canEdit && (
                  <Box position="relative">
                    <Text fontSize="sm" fontWeight="medium" mb="2">Adicionar tag</Text>
                    <HStack gap="2">
                      <Input
                        size="sm"
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nome da tag"
                      />
                      <Button
                        size="sm"
                        colorPalette="blue"
                        onClick={() => handleAddTag(inputValue)}
                        disabled={!inputValue.trim() || addMutation.isPending}
                      >
                        <LuPlus />
                      </Button>
                    </HStack>

                    {showSuggestions && inputValue && suggestions.length > 0 && (
                      <Box
                        position="absolute"
                        top="100%"
                        left="0"
                        right="0"
                        bg="bg"
                        borderWidth="1px"
                        rounded="md"
                        shadow="md"
                        zIndex="dropdown"
                        mt="1"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {suggestions.map((tag) => (
                          <Box
                            key={tag.id}
                            px="3"
                            py="2"
                            cursor="pointer"
                            _hover={{ bg: 'bg.subtle' }}
                            onMouseDown={() => handleAddTag(tag.name)}
                          >
                            <HStack justify="space-between">
                              <Text fontSize="sm">{tag.name}</Text>
                              {tag.count !== undefined && (
                                <Text fontSize="xs" color="fg.muted">{tag.count}</Text>
                              )}
                            </HStack>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Fechar</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
