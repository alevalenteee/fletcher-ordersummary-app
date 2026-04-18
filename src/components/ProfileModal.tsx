import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { Profile } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { ModalTransition } from './transitions/ModalTransition';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

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

const inputClasses = 'w-full h-10 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';
const labelClasses = 'block text-xs font-medium text-neutral-600 mb-1.5';

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
  const [newProfileColor, setNewProfileColor] = useState('#3B82F6');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const colorOptions = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316'
  ];

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;

    onCreateProfile({
      name: newProfileName.trim(),
      color: newProfileColor,
      is_default: false
    });

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
      <div className="p-6 pt-4 md:pt-6">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mb-6">Profile manager</h2>

        {currentProfile && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Current profile</h3>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200/70 rounded-lg">
              <ProfileAvatar profile={currentProfile} size="lg" />
              <div>
                <p className="font-medium text-sm text-neutral-900">{currentProfile.name}</p>
                <p className="text-xs text-neutral-500">
                  {currentProfile.is_default ? 'Default profile' : 'Standard profile'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Available profiles</h3>
          <div className="max-h-[240px] overflow-y-auto overflow-x-hidden scrollbar-hide">
            <div className="flex flex-col gap-2 pr-2">
              {profiles.map(profile => {
                const isCurrent = currentProfile?.id === profile.id;
                return (
                  <motion.div
                    key={profile.id}
                    layout
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors duration-150',
                      isCurrent
                        ? 'border-neutral-900 bg-neutral-50 shadow-card'
                        : 'border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50/60 cursor-pointer'
                    )}
                    onClick={() => {
                      if (!isCurrent) {
                        onSwitchProfile(profile.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProfileAvatar profile={profile} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-neutral-900 truncate">{profile.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          {profile.is_default ? 'Default' : 'Standard'}
                          {isCurrent && <span className="text-brand-600 ml-1.5">· Active</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProfile(profile);
                        }}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {!profile.is_default && (
                        <>
                          <button
                            className="p-1.5 text-neutral-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMakeDefault(profile.id);
                            }}
                            title="Make default"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>

                          <button
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileToDelete(profile);
                            }}
                            title="Delete"
                            disabled={profiles.length <= 1}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {!editingProfile && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Create new profile</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClasses}>Profile name</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Morning shift"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95',
                        newProfileColor === color && 'ring-2 ring-offset-2 ring-neutral-900'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewProfileColor(color)}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="mt-1 w-full sm:w-auto sm:self-start"
              >
                Create profile
              </Button>
            </div>
          </div>
        )}

        {editingProfile && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Edit profile</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClasses}>Profile name</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="Profile name"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95',
                        editingProfile.color === color && 'ring-2 ring-offset-2 ring-neutral-900'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingProfile({ ...editingProfile, color })}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={!editingProfile.name.trim()}
                  className="flex-1"
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {profileToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-card shadow-card-hover p-6 max-w-md w-full">
              <h3 className="text-base font-semibold tracking-tight text-neutral-900 mb-2">Delete profile</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Are you sure you want to delete the profile <strong className="text-neutral-900">"{profileToDelete.name}"</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setProfileToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteProfile}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalTransition>
  );
};
