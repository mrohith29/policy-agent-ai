import React, { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useNotification } from './NotificationContext';

export const UserContext = createContext(null);

function isPremiumUser(profile) {
  if (!profile) return false;
  if (profile.membership_status !== 'premium') return false;
  const now = new Date();
  const start = profile.premium_start_date ? new Date(profile.premium_start_date) : null;
  const end = profile.premium_end_date ? new Date(profile.premium_end_date) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const { showSuccess, showError } = useNotification();
  const [isPremium, setIsPremium] = useState(false);

  // Fetch the latest user profile from the database
  const fetchUserProfile = useCallback(async (session) => {
    if (!session?.user) {
      setUserProfile(null);
      setIsPremium(false);
      return;
    }
    try {
      // Always fetch the latest profile from the database
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, full_name, membership_status, premium_start_date, premium_end_date')
        .eq('id', session.user.id)
        .single();
      if (error) {
        throw error;
      } else {
        setUserProfile(profile);
        setIsPremium(isPremiumUser(profile));
      }
    } catch (err) {
      console.error('Error managing user profile:', err);
      showError(`Error: ${err.message}`);
      setUserProfile(null);
      setIsPremium(false);
    }
  }, [showSuccess, showError]);

  // Manual refresh function for UI to call after payment/upgrade
  const refreshUserProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, full_name, membership_status, premium_start_date, premium_end_date')
        .eq('id', session.user.id)
        .single();
      if (!error && profile) {
        setUserProfile(profile);
        setIsPremium(isPremiumUser(profile));
      }
    } catch (err) {
      console.error('Error refreshing user profile:', err);
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    const getInitialSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserProfile(session);
      setUserLoading(false);
    };
    getInitialSessionAndProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserProfile(session);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return (
    <UserContext.Provider value={{ userProfile, userLoading, isPremium, refreshUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}; 