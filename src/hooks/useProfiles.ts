import { useState, useEffect } from 'react';
import { Profile } from '@/types';
import { supabase } from '@/lib/supabase';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  // Set default profile after profiles are loaded
  useEffect(() => {
    if (profiles.length > 0 && !currentProfile) {
      // Try to get saved profile from localStorage first
      const savedProfileId = localStorage.getItem('currentProfileId');
      console.log('Checking for saved profile ID:', savedProfileId);
      
      if (savedProfileId) {
        const savedProfile = profiles.find(p => p.id === savedProfileId);
        if (savedProfile) {
          console.log('Restoring saved profile:', savedProfile.name, savedProfile.id);
          setCurrentProfile(savedProfile);
          return;
        } else {
          console.log('Saved profile ID not found in profiles list');
        }
      }
      
      // Otherwise use the default profile
      const defaultProfile = profiles.find(p => p.is_default);
      if (defaultProfile) {
        console.log('Using default profile:', defaultProfile.name, defaultProfile.id);
        setCurrentProfile(defaultProfile);
      } else {
        // Or just use the first profile
        console.log('Using first profile:', profiles[0].name, profiles[0].id);
        setCurrentProfile(profiles[0]);
      }
    }
  }, [profiles, currentProfile]);

  // Save current profile to localStorage when it changes
  useEffect(() => {
    if (currentProfile) {
      console.log('Saving current profile to localStorage:', currentProfile.name, currentProfile.id);
      localStorage.setItem('currentProfileId', currentProfile.id);
    }
  }, [currentProfile]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching profiles...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('Profiles fetched:', data?.length || 0);
      setProfiles(data || []);
      
      // If no profiles exist, create a default one
      if (!data || data.length === 0) {
        console.log('No profiles found, creating default profile');
        await createProfile({
          name: 'Default',
          color: '#3B82F6',
          is_default: true
        });
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (profileData: Omit<Profile, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      
      setProfiles(prev => [...prev, data]);
      
      // If this is the first profile or set as default, make it current
      if (profileData.is_default || profiles.length === 0) {
        setCurrentProfile(data);
      }
      
      return data;
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile');
      throw err;
    }
  };

  const updateProfile = async (id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProfiles(prev => prev.map(p => (p.id === id ? data : p)));
      
      // Update current profile if it's the one being updated
      if (currentProfile?.id === id) {
        setCurrentProfile(data);
      }
      
      // If this profile was set as default, make sure we update other profiles
      if (updates.is_default) {
        setProfiles(prev => prev.map(p => 
          p.id !== id ? { ...p, is_default: false } : p
        ));
      }
      
      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      throw err;
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      // Check if this is the only profile
      if (profiles.length <= 1) {
        throw new Error('Cannot delete the only profile');
      }
      
      // Check if this is the current profile
      const isCurrentProfile = currentProfile?.id === id;
      
      // If deleting current or default profile, we need to switch to another
      let nextProfile: Profile | null = null;
      if (isCurrentProfile) {
        nextProfile = profiles.find(p => p.id !== id) || null;
      }
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Remove profile from state
      setProfiles(prev => prev.filter(p => p.id !== id));
      
      // Switch to next profile if needed
      if (isCurrentProfile && nextProfile) {
        // If the deleted profile was default, make the next one default
        if (currentProfile?.is_default && nextProfile) {
          await updateProfile(nextProfile.id, { is_default: true });
        }
        setCurrentProfile(nextProfile);
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile');
      throw err;
    }
  };

  const switchProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setCurrentProfile(profile);
    } else {
      setError('Profile not found');
    }
  };

  return {
    profiles,
    currentProfile,
    loading,
    error,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile
  };
} 