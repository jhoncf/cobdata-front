import type { ButtonProps, GroupProps, InputProps } from '@chakra-ui/react';
import {
  Box,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Stack,
  mergeRefs,
  useControllableState,
} from '@chakra-ui/react';
import * as React from 'react';
import { LuEye, LuEyeOff } from 'react-icons/lu';

export interface PasswordInputProps extends InputProps {
  defaultVisible?: boolean;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  rootProps?: GroupProps;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const { rootProps, defaultVisible, visible: visibleProp, onVisibleChange, ...rest } = props;

    const [visible, setVisible] = useControllableState({
      value: visibleProp,
      defaultValue: defaultVisible || false,
      onChange: onVisibleChange,
    });

    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
      <InputGroup
        endElement={
          <VisibilityTrigger
            disabled={rest.disabled}
            onPointerDown={(e) => {
              if (rest.disabled) return;
              if (e.button !== 0) return;
              e.preventDefault();
              setVisible(!visible);
            }}
          >
            {visible ? <LuEyeOff /> : <LuEye />}
          </VisibilityTrigger>
        }
        {...rootProps}
      >
        <Input {...rest} ref={mergeRefs(ref, inputRef)} type={visible ? 'text' : 'password'} />
      </InputGroup>
    );
  },
);

const VisibilityTrigger = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function VisibilityTrigger(props, ref) {
    return (
      <IconButton
        tabIndex={-1}
        ref={ref}
        me="-2"
        aspectRatio="square"
        size="sm"
        variant="ghost"
        height="calc(100% - {spacing.2})"
        aria-label="Alternar visibilidade da senha"
        {...props}
      />
    );
  },
);

interface PasswordStrengthMeterProps {
  max?: number;
  value: number;
}

export function PasswordStrengthMeter({ max = 4, value }: PasswordStrengthMeterProps) {
  const percent = (value / max) * 100;
  const { label, colorPalette } = getColorPalette(percent);

  return (
    <Stack align="flex-end" gap="1">
      <HStack width="full">
        {Array.from({ length: max }).map((_, index) => (
          <Box
            key={index}
            height="1"
            flex="1"
            rounded="sm"
            data-selected={index < value ? '' : undefined}
            layerStyle="fill.subtle"
            colorPalette="gray"
            css={{
              '&[data-selected]': {
                colorPalette,
                layerStyle: 'fill.solid',
              },
            }}
          />
        ))}
      </HStack>
      {label && <HStack textStyle="xs">{label}</HStack>}
    </Stack>
  );
}

function getColorPalette(percent: number) {
  switch (true) {
    case percent < 33:
      return { label: 'Fraca', colorPalette: 'red' };
    case percent < 66:
      return { label: 'Média', colorPalette: 'orange' };
    default:
      return { label: 'Forte', colorPalette: 'green' };
  }
}
