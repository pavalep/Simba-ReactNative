import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {ThemeProvider} from '../../src/theme';
import {AppButton} from '../../src/components/core/AppButton/AppButton';

async function renderWithProviders(ui: React.ReactElement) {
  // V17 removed the redux Provider; the AppButton needs only ThemeProvider
  // (for useTheme). The pre-V17 mockStore / Provider wrapper was a leftover.
  return render(<ThemeProvider>{ui}</ThemeProvider>);
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
