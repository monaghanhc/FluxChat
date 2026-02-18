import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileEditor } from './ProfileEditor';

class FileReaderMock {
  public result: string | ArrayBuffer | null = null;

  public onload: null | (() => void) = null;

  public onerror: null | (() => void) = null;

  public readAsDataURL(file: File): void {
    this.result = `data:image/png;base64,mock-${file.name}`;
    if (this.onload) {
      this.onload();
    }
  }
}

describe('ProfileEditor', () => {
  it('sends trimmed display name update', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<ProfileEditor displayName="Alice" onSave={onSave} />);

    const nameInput = screen.getByDisplayValue('Alice');
    await user.clear(nameInput);
    await user.type(nameInput, '  Updated Alice  ');

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(onSave).toHaveBeenCalledWith({ displayName: 'Updated Alice', avatarBase64: undefined });
  });

  it('includes avatar base64 when file is selected', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('FileReader', FileReaderMock);
    try {
      render(<ProfileEditor displayName="Bob" onSave={onSave} />);

      const fileInput = screen.getByLabelText('Avatar');
      const file = new File(['avatar-content'], 'avatar.png', { type: 'image/png' });

      await user.upload(fileInput, file);
      await user.click(screen.getByRole('button', { name: 'Update' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });

      expect(onSave).toHaveBeenCalledWith({
        displayName: 'Bob',
        avatarBase64: 'data:image/png;base64,mock-avatar.png',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
