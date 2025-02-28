import React from 'react';
import { Profile } from '@/types';

interface ProfileAvatarProps {
  profile: Profile;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  profile, 
  size = 'md',
  onClick 
}) => {
  // Get first letter of the profile name
  const firstLetter = profile.name.charAt(0).toUpperCase();
  
  // Determine size class with responsive adjustments
  const sizeClass = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-9 h-9 sm:w-10 sm:h-10 text-base sm:text-lg',
    lg: 'w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-xl'
  }[size];
  
  return (
    <div 
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-sm`}
      style={{ backgroundColor: profile.color }}
      onClick={onClick}
      title={profile.name}
    >
      {firstLetter}
    </div>
  );
}; 