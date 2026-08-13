import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0f4ff' },
          100: { value: '#dbe4ff' },
          200: { value: '#bac8ff' },
          300: { value: '#91a7ff' },
          400: { value: '#748ffc' },
          500: { value: '#5c7cfa' },
          600: { value: '#4c6ef5' },
          700: { value: '#4263eb' },
          800: { value: '#3b5bdb' },
          900: { value: '#364fc7' },
          950: { value: '#1e3a8a' },
        },
        accent: {
          50: { value: '#ecfdf5' },
          100: { value: '#d1fae5' },
          200: { value: '#a7f3d0' },
          300: { value: '#6ee7b7' },
          400: { value: '#34d399' },
          500: { value: '#10b981' },
          600: { value: '#059669' },
          700: { value: '#047857' },
          800: { value: '#065f46' },
          900: { value: '#064e3b' },
        },
      },
      fonts: {
        heading: { value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
        body: { value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
      },
    },
    semanticTokens: {
      colors: {
        'brand.solid': {
          value: { _light: '{colors.brand.600}', _dark: '{colors.brand.400}' },
        },
        'brand.fg': {
          value: { _light: '{colors.brand.700}', _dark: '{colors.brand.200}' },
        },
        'brand.muted': {
          value: { _light: '{colors.brand.50}', _dark: '{colors.brand.950}' },
        },
        'sidebar.bg': {
          value: { _light: '#ffffff', _dark: '#1a1b2e' },
        },
        'sidebar.border': {
          value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' },
        },
        'sidebar.active': {
          value: { _light: '{colors.brand.50}', _dark: 'rgba(92, 124, 250, 0.12)' },
        },
        'sidebar.hover': {
          value: { _light: '{colors.gray.50}', _dark: 'rgba(255,255,255,0.04)' },
        },
        'content.bg': {
          value: { _light: '{colors.gray.50}', _dark: '#0f1021' },
        },
        'card.bg': {
          value: { _light: '#ffffff', _dark: '#1a1b2e' },
        },
      },
    },
  },
  globalCss: {
    body: {
      bg: 'content.bg',
      color: 'fg',
      fontFamily: 'body',
    },
  },
});

export const system = createSystem(defaultConfig, config);
