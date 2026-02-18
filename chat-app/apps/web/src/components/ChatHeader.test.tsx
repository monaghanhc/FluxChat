import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatHeader } from './ChatHeader';

describe('ChatHeader', () => {
  it('shows room title, online count, and up to four presence names', () => {
    render(
      <ChatHeader
        roomName="engineering"
        usersOnline={[
          { id: '1', displayName: 'Alice' },
          { id: '2', displayName: 'Bob' },
          { id: '3', displayName: 'Carla' },
          { id: '4', displayName: 'Dylan' },
          { id: '5', displayName: 'Eve' },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: '#engineering' })).toBeInTheDocument();
    expect(screen.getByText('5 online')).toBeInTheDocument();

    const presenceList = screen.getByTestId('presence-list');
    expect(presenceList).toHaveTextContent('Alice');
    expect(presenceList).toHaveTextContent('Bob');
    expect(presenceList).toHaveTextContent('Carla');
    expect(presenceList).toHaveTextContent('Dylan');
    expect(presenceList).not.toHaveTextContent('Eve');
  });
});
