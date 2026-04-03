export interface AvatarPreset {
  id: string;
  emoji: string;
  name: string;
  gradient: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'peach', emoji: '🍑', name: '蜜桃', gradient: 'linear-gradient(135deg, #fb7185 0%, #f97316 100%)' },
  { id: 'ocean', emoji: '🌊', name: '海浪', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)' },
  { id: 'moon', emoji: '🌙', name: '月光', gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
  { id: 'sun', emoji: '☀️', name: '太阳', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
  { id: 'leaf', emoji: '🍀', name: '幸运草', gradient: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)' },
  { id: 'cat', emoji: '🐱', name: '小猫', gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { id: 'fox', emoji: '🦊', name: '狐狸', gradient: 'linear-gradient(135deg, #f97316 0%, #8b5cf6 100%)' },
  { id: 'star', emoji: '⭐', name: '星星', gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)' },
];

export const DEFAULT_AVATAR_ID = AVATAR_PRESETS[0].id;

export const getAvatarPreset = (avatarId?: string): AvatarPreset => {
  return AVATAR_PRESETS.find(preset => preset.id === avatarId) ?? AVATAR_PRESETS[0];
};
