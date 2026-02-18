import type { MessageDto } from '@chat/shared';

type MessageListProps = {
  messages: MessageDto[];
  currentUserId: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
};

export const MessageList = ({
  messages,
  currentUserId,
  hasMore,
  loadingMore,
  onLoadMore,
}: MessageListProps) => {
  return (
    <div className="message-list" data-testid="chat-message-list">
      {hasMore ? (
        <button
          type="button"
          className="load-more"
          onClick={() => {
            void onLoadMore();
          }}
          disabled={loadingMore}
          data-testid="load-older"
        >
          {loadingMore ? 'Loading...' : 'Load older'}
        </button>
      ) : null}

      <ul>
        {messages.map((message) => (
          <li
            key={message.id}
            className={message.userId === currentUserId ? 'message current-user' : 'message'}
            data-testid="message-item"
          >
            <div className="avatar">{message.userDisplayName.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="message-meta">
                <strong>{message.userDisplayName}</strong>
                <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
              <p>{message.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
