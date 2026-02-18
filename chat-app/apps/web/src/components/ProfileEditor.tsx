import { useState } from 'react';

type ProfileEditorProps = {
  displayName: string;
  onSave: (payload: { displayName?: string; avatarBase64?: string }) => Promise<void>;
};

const fileToDataUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const ProfileEditor = ({ displayName, onSave }: ProfileEditorProps) => {
  const [name, setName] = useState(displayName);
  const [avatarBase64, setAvatarBase64] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setAvatarBase64(dataUrl);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        displayName: name.trim() || undefined,
        avatarBase64,
      });
      setAvatarBase64(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <label>
        Display name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>

      <label>
        Avatar
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Update'}
      </button>
    </form>
  );
};
