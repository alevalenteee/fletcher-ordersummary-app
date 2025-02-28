import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Profile } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { ModalTransition } from './transitions/ModalTransition';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  currentProfile: Profile | null;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (profile: Omit<Profile, 'id' | 'created_at'>) => void;
  onUpdateProfile: (id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => void;
  onDeleteProfile: (id: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  currentProfile,
  onSwitchProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileColor, setNewProfileColor] = useState('#3B82F6'); // Default blue
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  
  // Common colors for profile avatars
  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316'  // Orange
  ];
  
  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    
    onCreateProfile({
      name: newProfileName.trim(),
      color: newProfileColor,
      is_default: false
    });
    
    // Reset form
    setNewProfileName('');
    setNewProfileColor('#3B82F6');
  };
  
  const handleUpdateProfile = () => {
    if (!editingProfile || !editingProfile.name.trim()) return;
    
    onUpdateProfile(editingProfile.id, {
      name: editingProfile.name.trim(),
      color: editingProfile.color
    });
    
    setEditingProfile(null);
  };
  
  const handleDeleteProfile = () => {
    if (!profileToDelete) return;
    
    onDeleteProfile(profileToDelete.id);
    setProfileToDelete(null);
  };
  
  const handleMakeDefault = (id: string) => {
    onUpdateProfile(id, { is_default: true });
  };
  
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Profile Manager</h2>
        
        {/* Current Profile */}
        {currentProfile && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Current Profile</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <ProfileAvatar profile={currentProfile} size="lg" />
              <div>
                <p className="font-medium">{currentProfile.name}</p>
                <p className="text-sm text-gray-500">
                  {currentProfile.is_default ? 'Default Profile' : 'Standard Profile'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Available Profiles */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Available Profiles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profiles.map(profile => (
              <motion.div
                key={profile.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  currentProfile?.id === profile.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 cursor-pointer'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (currentProfile?.id !== profile.id) {
                    onSwitchProfile(profile.id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <ProfileAvatar profile={profile} />
                  <div>
                    <p className="font-medium">{profile.name}</p>
                    <p className="text-xs text-gray-500">
                      {profile.is_default ? 'Default' : 'Standard'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent profile switching
                        setEditingProfile(profile);
                      }}
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    {!profile.is_default && (
                      <>
                        <button
                          className="p-1 text-yellow-500 hover:text-yellow-600"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent profile switching
                            handleMakeDefault(profile.id);
                          }}
                          title="Make Default"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        
                        <button
                          className="p-1 text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent profile switching
                            setProfileToDelete(profile);
                          }}
                          title="Delete"
                          disabled={profiles.length <= 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Create New Profile */}
        {!editingProfile && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Create New Profile</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile Name"
                className="p-2 border border-gray-300 rounded-lg bg-white"
              />
              
              <div>
                <label className="block text-sm mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full ${newProfileColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewProfileColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <button
                className="mt-2 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
              >
                Create Profile
              </button>
            </div>
          </div>
        )}
        
        {/* Edit Profile */}
        {editingProfile && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Edit Profile</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                placeholder="Profile Name"
                className="p-2 border border-gray-300 rounded-lg bg-white"
              />
              
              <div>
                <label className="block text-sm mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full ${editingProfile.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingProfile({...editingProfile, color})}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  className="mt-2 py-2 flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  onClick={handleUpdateProfile}
                  disabled={!editingProfile.name.trim()}
                >
                  Update Profile
                </button>
                
                <button
                  className="mt-2 py-2 px-4 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                  onClick={() => setEditingProfile(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        {profileToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Delete Profile</h3>
              <p className="mb-6">
                Are you sure you want to delete the profile "{profileToDelete.name}"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  onClick={() => setProfileToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  onClick={handleDeleteProfile}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalTransition>
  );
}; 