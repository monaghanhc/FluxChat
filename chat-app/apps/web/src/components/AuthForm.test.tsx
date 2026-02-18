import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('shows validation error for invalid login input', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);

    render(
      <AuthForm
        mode="login"
        loading={false}
        onModeChange={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.type(screen.getByTestId('auth-email'), 'user@example.com');
    await userEvent.type(screen.getByTestId('auth-password'), '123');
    await userEvent.click(screen.getByTestId('auth-submit'));

    expect(screen.getByText(/at least 8/i)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
