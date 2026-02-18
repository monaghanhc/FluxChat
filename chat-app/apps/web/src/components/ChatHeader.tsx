type ChatHeaderProps = {
  roomName: string;
  usersOnline: Array<{ id: string; displayName: string; avatarUrl?: string }>;
};

export const ChatHeader = ({ roomName, usersOnline }: ChatHeaderProps) => {
  return (
    <header className="chat-header">
      <div>
        <h2>#{roomName}</h2>
        <p>{usersOnline.length} online</p>
      </div>
      <div className="presence-list" data-testid="presence-list">
        {usersOnline.slice(0, 4).map((user) => (
          <span key={user.id}>{user.displayName}</span>
        ))}
      </div>
    </header>
  );
};
