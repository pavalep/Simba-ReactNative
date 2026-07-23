import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../../src/theme';
import {AppText} from '../../src/components/core/AppText/AppText';

function createMockStore() {
  return configureStore({
    reducer: {
      settings: () => ({
        themeMode: 'dark',
      }),
    },
  });
}

async function renderWithProviders(ui: React.ReactElement) {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <ThemeProvider>{ui}</ThemeProvider>
    </Provider>,
  );
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
