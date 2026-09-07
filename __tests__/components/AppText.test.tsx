import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../../src/theme';
import {AppText} from '../../src/components/core/AppText/AppText';

async function renderWithProviders(ui: React.ReactElement) {
  // V17 removed the redux Provider; AppText needs only ThemeProvider
  // (for useTheme). The pre-V17 mockStore / Provider wrapper was a leftover.
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AppText', () => {
  it('renders with default props', async () => {
    await renderWithProviders(<AppText>Hello World</AppText>);
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders with variant', async () => {
    await renderWithProviders(<AppText variant="h1">Heading</AppText>);
    expect(screen.getByText('Heading')).toBeTruthy();
  });

  it('renders with custom color', async () => {
    await renderWithProviders(<AppText color="accent">Accented</AppText>);
    expect(screen.getByText('Accented')).toBeTruthy();
  });
});
