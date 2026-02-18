import { useRef, useState } from 'react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

type MessageInputProps = {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
};

export const MessageInput = ({ disabled, onSend, onTypingStart, onTypingStop }: MessageInputProps) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    onTypingStop();
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onTypingStart();

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onTypingStop();
    }, 1200);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    await onSend(trimmed);
    setText('');
    stopTyping();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    handleTextChange(`${text}${emojiData.emoji}`);
  };

  return (
    <div className="message-input-wrap">
      {showEmoji ? (
        <div className="emoji-popover" data-testid="emoji-picker">
          <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis />
        </div>
      ) : null}

      <form className="message-input-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="emoji-toggle"
          onClick={() => setShowEmoji((prev) => !prev)}
          aria-label="Toggle emoji picker"
        >
          ??
        </button>

        <input
          data-testid="message-input"
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder="Type a message"
          disabled={disabled}
        />

        <button data-testid="send-message" type="submit" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
};
