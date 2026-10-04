import { render, screen } from '@testing-library/react';
import App from './App';

// Stub fetch so panels don't throw during render
global.fetch = () => new Promise(() => {});

test('renders the dashboard', () => {
  render(<App />);
  // Language selector is always present regardless of active locale
  expect(screen.getByRole('combobox')).toBeInTheDocument();
});
