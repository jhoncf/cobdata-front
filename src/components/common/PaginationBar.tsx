import { ButtonGroup, IconButton, Pagination } from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  onChange,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination.Root
      count={totalPages * pageSize}
      pageSize={pageSize}
      page={page}
      onPageChange={(e) => onChange(e.page)}
    >
      <ButtonGroup variant="ghost" size="sm">
        <Pagination.PrevTrigger asChild>
          <IconButton aria-label="Página anterior">
            <LuChevronLeft />
          </IconButton>
        </Pagination.PrevTrigger>

        <Pagination.Items
          render={(p) => (
            <IconButton variant={{ base: 'ghost', _selected: 'outline' }}>
              {p.value}
            </IconButton>
          )}
        />

        <Pagination.NextTrigger asChild>
          <IconButton aria-label="Próxima página">
            <LuChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </ButtonGroup>
    </Pagination.Root>
  );
}
