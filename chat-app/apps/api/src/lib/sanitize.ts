export const sanitizeMessageText = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

export const isValidAvatarDataUrl = (value: string): boolean => {
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
};
