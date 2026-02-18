import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoomList } from './RoomList';

describe('RoomList', () => {
  it('renders room names and unread badge', () => {
    render(
      <RoomList
        rooms={[
          { id: '1', name: 'general', isPublic: true, joined: true, unreadCount: 2 },
          { id: '2', name: 'engineering', isPublic: true, joined: false, unreadCount: 0 },
        ]}
        activeRoomId="1"
        onSelect={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('#general')).toBeInTheDocument();
    expect(screen.getByText('#engineering')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
  });

  it('calls onSelect and onCreate with trimmed room name', async () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomList
        rooms={[{ id: '1', name: 'general', isPublic: true, joined: true, unreadCount: 0 }]}
        activeRoomId={null}
        onSelect={onSelect}
        onCreate={onCreate}
      />,
    );

    await userEvent.click(screen.getByTestId('room-item-1'));
    expect(onSelect).toHaveBeenCalledWith('1');

    await userEvent.type(screen.getByTestId('create-room-input'), '   support   ');
    await userEvent.click(screen.getByTestId('create-room-button'));

    expect(onCreate).toHaveBeenCalledWith('support');
    expect(screen.getByTestId('create-room-input')).toHaveValue('');
  });

  it('does not call onCreate for blank room names', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <RoomList
        rooms={[]}
        activeRoomId={null}
        onSelect={vi.fn()}
        onCreate={onCreate}
      />,
    );

    await userEvent.type(screen.getByTestId('create-room-input'), '   ');
    await userEvent.click(screen.getByTestId('create-room-button'));

    expect(onCreate).not.toHaveBeenCalled();
  });
});
