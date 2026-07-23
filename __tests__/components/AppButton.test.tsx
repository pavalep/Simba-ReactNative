import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../../src/theme';
import {AppButton} from '../../src/components/core/AppButton/AppButton';

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

describe('AppButton', () => {
  it('renders title text', async () => {
    await renderWithProviders(<AppButton title="Press Me" onPress={() => {}} />);
    expect(screen.getByText('Press Me')).toBeTruthy();
  });

  it('fires onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<AppButton title="Tap" onPress={onPress} />);
    const button = screen.getByText('Tap');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', async () => {
    await renderWithProviders(
      <AppButton title="Saving" loading onPress={() => {}} />,
    );
    // When loading, button shows ActivityIndicator, not text
    expect(screen.getByRole('button', {disabled: true})).toBeTruthy();
  });
});
