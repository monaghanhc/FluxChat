import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageList } from './MessageList';

describe('MessageList', () => {
  it('renders chat messages', () => {
    render(
      <MessageList
        messages={[
          {
            id: 'm1',
            roomId: 'r1',
            userId: 'u1',
            userDisplayName: 'Alice',
            text: 'Hello there',
            createdAt: '2026-02-18T10:00:00.000Z',
          },
          {
            id: 'm2',
            roomId: 'r1',
            userId: 'u2',
            userDisplayName: 'Bob',
            text: 'General Kenobi',
            createdAt: '2026-02-18T10:01:00.000Z',
          },
        ]}
        currentUserId="u1"
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('General Kenobi')).toBeInTheDocument();
    expect(screen.getAllByTestId('message-item')).toHaveLength(2);
  });
});
