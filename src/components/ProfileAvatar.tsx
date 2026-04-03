import React from 'react';
import { getAvatarPreset } from '../logic/profileAvatars';

interface ProfileAvatarProps {
  avatarId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-10 w-10 text-lg rounded-xl',
  md: 'h-12 w-12 text-xl rounded-2xl',
  lg: 'h-16 w-16 text-2xl rounded-[22px]',
};

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ avatarId, size = 'md', className }) => {
  const preset = getAvatarPreset(avatarId);

  return (
    <div
      className={`flex items-center justify-center text-white shadow-sm ${sizeMap[size]} ${className ?? ''}`}
      style={{ background: preset.gradient }}
      title={preset.name}
    >
      <span aria-hidden="true">{preset.emoji}</span>
    </div>
  );
};

export default ProfileAvatar;
