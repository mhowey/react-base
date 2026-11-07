import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Modal,
  NumberInput,
  Paper,
  Select,
  Table,
  Textarea,
  TextInput,
  Tooltip,
  createTheme,
  type CSSVariablesResolver,
} from '@mantine/core';
import { palette, radius, semantic, shadows, spacing, typography } from './tokens';

/**
 * The Mantine theme maps design tokens onto the component library and sets
 * the default look of each component. Prefer adjusting defaults here over
 * styling components ad-hoc in pages.
 */
export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: palette,
  fontFamily: typography.fontFamily,
  fontFamilyMonospace: typography.fontFamilyMonospace,
  headings: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.headingWeight,
    sizes: typography.headings,
  },
  fontSizes: typography.sizes,
  spacing,
  radius,
  shadows,
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  components: {
    Button: Button.extend({ defaultProps: { radius: 'md' } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { variant: 'subtle', radius: 'md' } }),
    Card: Card.extend({ defaultProps: { withBorder: true, radius: 'lg', padding: 'lg', shadow: 'xs' } }),
    Paper: Paper.extend({ defaultProps: { radius: 'lg' } }),
    Badge: Badge.extend({ defaultProps: { variant: 'light', radius: 'sm' } }),
    TextInput: TextInput.extend({ defaultProps: { radius: 'md' } }),
    Textarea: Textarea.extend({ defaultProps: { radius: 'md', autosize: true, minRows: 3 } }),
    NumberInput: NumberInput.extend({ defaultProps: { radius: 'md' } }),
    Select: Select.extend({ defaultProps: { radius: 'md', allowDeselect: false } }),
    Modal: Modal.extend({ defaultProps: { radius: 'lg', centered: true, overlayProps: { blur: 3 } } }),
    Tooltip: Tooltip.extend({ defaultProps: { withArrow: true, openDelay: 300 } }),
    Table: Table.extend({ defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { ...semantic.light, '--mantine-color-body': semantic.light['--app-surface'] },
  dark: { ...semantic.dark, '--mantine-color-body': semantic.dark['--app-surface'] },
});
