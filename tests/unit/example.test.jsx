import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthPanel from '../../src/components/AuthPanel';

describe('AuthPanel render', () => {
  it('renders login/signup buttons', () => {
    render(<AuthPanel units={[]} busy={false} mode="login" onModeChange={() => {}} onLogin={() => {}} onSignup={() => {}} />);
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Daftar/i })).toBeTruthy();
  });
});
