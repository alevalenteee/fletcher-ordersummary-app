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
        className="flex items-center justify-center sm:justify-start cursor-pointer hover:bg-gray-50 rounded-md px-3 py-2 transition-colors duration-200 border border-gray-200"
        onClick={openModal}
      >
        <ProfileAvatar profile={currentProfile} />
        <div className="ml-2">
          <p className="font-medium text-sm">{currentProfile.name}</p>
          <p className="text-xs text-gray-500">
            {currentProfile.is_default ? 'Default Profile' : 'Profile'}
          </p>
        </div>
        <div className="ml-auto hidden sm:block text-gray-400">
          <User size={16} />
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