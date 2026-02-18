import { useState } from 'react';
import type { RoomSummary } from '@chat/shared';

type RoomListProps = {
  rooms: RoomSummary[];
  activeRoomId: string | null;
  onSelect: (roomId: string) => void;
  onCreate: (name: string) => Promise<void>;
  className?: string;
};

export const RoomList = ({ rooms, activeRoomId, onSelect, onCreate, className }: RoomListProps) => {
  const [roomInput, setRoomInput] = useState('');
  const sidebarClassName = className ? `sidebar ${className}` : 'sidebar';

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = roomInput.trim();
    if (!trimmed) {
      return;
    }
    await onCreate(trimmed);
    setRoomInput('');
  };

  return (
    <aside className={sidebarClassName} data-testid="room-list">
      <div className="sidebar-header">
        <h2>Rooms</h2>
        <p>{rooms.length} available</p>
      </div>

      <form className="create-room-form" onSubmit={handleCreate}>
        <input
          data-testid="create-room-input"
          placeholder="Create room"
          value={roomInput}
          onChange={(event) => setRoomInput(event.target.value)}
        />
        <button data-testid="create-room-button" type="submit">
          Add
        </button>
      </form>

      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              className={room.id === activeRoomId ? 'room-button active' : 'room-button'}
              onClick={() => onSelect(room.id)}
              data-testid={`room-item-${room.id}`}
              type="button"
            >
              <span>#{room.name}</span>
              {room.unreadCount > 0 ? <span className="badge">{room.unreadCount}</span> : null}
              {!room.joined ? <span className="join-tag">Join</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};
