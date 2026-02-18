import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';

vi.mock('emoji-picker-react', () => {
  return {
    default: ({ onEmojiClick }: { onEmojiClick: (emoji: { emoji: string }) => void }) => (
      <button
        type="button"
        data-testid="mock-emoji"
        onClick={() => onEmojiClick({ emoji: ':)' })}
      >
        emoji
      </button>
    ),
  };
});

describe('MessageInput', () => {
  it('sends trimmed message and resets input', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onTypingStart = vi.fn();
    const onTypingStop = vi.fn();

    render(
      <MessageInput
        disabled={false}
        onSend={onSend}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />,
    );

    await user.type(screen.getByTestId('message-input'), '  hello there  ');
    expect(onTypingStart).toHaveBeenCalled();

    await user.click(screen.getByTestId('send-message'));

    expect(onSend).toHaveBeenCalledWith('hello there');
    expect(screen.getByTestId('message-input')).toHaveValue('');
    expect(onTypingStop).toHaveBeenCalled();
  });

  it('fires delayed typing stop', () => {
    vi.useFakeTimers();

    const onSend = vi.fn().mockResolvedValue(undefined);
    const onTypingStart = vi.fn();
    const onTypingStop = vi.fn();

    render(
      <MessageInput
        disabled={false}
        onSend={onSend}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />,
    );

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'a' } });
    expect(onTypingStart).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_201);

    expect(onTypingStop).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('opens emoji picker and appends emoji to message', async () => {
    const user = userEvent.setup();

    render(
      <MessageInput
        disabled={false}
        onSend={vi.fn().mockResolvedValue(undefined)}
        onTypingStart={vi.fn()}
        onTypingStop={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Toggle emoji picker'));
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();

    await user.click(screen.getByTestId('mock-emoji'));

    expect(screen.getByTestId('message-input')).toHaveValue(':)');
  });

  it('does not send when disabled', () => {
    render(
      <MessageInput
        disabled
        onSend={vi.fn().mockResolvedValue(undefined)}
        onTypingStart={vi.fn()}
        onTypingStop={vi.fn()}
      />,
    );

    expect(screen.getByTestId('message-input')).toBeDisabled();
    expect(screen.getByTestId('send-message')).toBeDisabled();
  });
});
