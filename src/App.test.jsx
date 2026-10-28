import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('CodeNexus app', () => {
  it('renders the product title and key landing actions', () => {
    render(<App />);

    expect(screen.getByText(/CodeNexus/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('creates a new project and shows the editor layout', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /create project/i }));

    expect(screen.getByText(/project created/i)).toBeInTheDocument();
    expect(screen.getByText(/main.py/i)).toBeInTheDocument();
  });

  it('switches theme and saves settings', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(document.body.dataset.theme).toBe('light');
  });
});
