import React, { useState } from 'react';
import { Profile } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileModal } from './ProfileModal';
import { User } from 'lucide-react';

interface ProfileSelectorProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (profile: Omit<Profile, 'id' | 'created_at'>) => void;
  onUpdateProfile: (id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => void;
  onDeleteProfile: (id: string) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  currentProfile,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  if (!currentProfile) return null;
  
  return (
    <>
      <div
        className="flex items-center justify-center sm:justify-start cursor-pointer bg-white border border-neutral-200/70 shadow-card hover:shadow-card-hover hover:border-neutral-300 rounded-full pl-1.5 pr-3.5 py-1.5 transition-[box-shadow,border-color] duration-200 ease-out-soft"
        onClick={openModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } }}
      >
        <ProfileAvatar profile={currentProfile} />
        <div className="ml-2.5 min-w-0">
          <p className="font-medium text-sm text-neutral-900 leading-tight truncate">{currentProfile.name}</p>
          <p className="text-[11px] text-neutral-500 leading-tight">
            {currentProfile.is_default ? 'Default profile' : 'Profile'}
          </p>
        </div>
        <div className="ml-3 hidden sm:block text-neutral-400">
          <User size={14} />
        </div>
      </div>

      <ProfileModal
        isOpen={isModalOpen}
        onClose={closeModal}
        profiles={profiles}
        currentProfile={currentProfile}
        onSwitchProfile={(id) => {
          onSwitchProfile(id);
          closeModal();
        }}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
      />
    </>
  );
}; 