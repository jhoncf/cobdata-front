import type { ReactNode } from 'react';
import { Text } from '@chakra-ui/react';

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights the first occurrence of `term` in `text` using bold font weight.
 * Matching is case-insensitive.
 *
 * @returns ReactNode with the matched portion wrapped in bold, or the original text if no match.
 */
export function highlightMatch(text: string, term: string): ReactNode {
  if (!term || !text) return text;

  const escaped = escapeRegex(term);
  const regex = new RegExp(`(${escaped})`, 'i');
  const match = text.match(regex);

  if (!match || match.index === undefined) return text;

  const startIndex = match.index;
  const matchLength = match[0].length;
  const before = text.slice(0, startIndex);
  const matched = text.slice(startIndex, startIndex + matchLength);
  const after = text.slice(startIndex + matchLength);

  return (
    <>
      {before}
      <Text as="span" fontWeight="bold">
        {matched}
      </Text>
      {after}
    </>
  );
}
