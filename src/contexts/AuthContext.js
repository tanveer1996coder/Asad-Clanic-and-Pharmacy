import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        // Check if supabase client exists
        if (!supabase) {
            console.warn('Supabase client not configured');
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, metadata = {}) => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });

        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Device Verification Logic
        try {
            const { getDeviceId, getDeviceName } = require('../utils/deviceUtils');
            const deviceId = getDeviceId();
            const deviceName = getDeviceName();
            const userId = data.user.id;

            // Check if device exists
            const { data: existingDevice } = await supabase
                .from('device_tokens')
                .select('*')
                .eq('user_id', userId)
                .eq('device_id', deviceId)
                .single();

            if (existingDevice) {
                // Update usage
                await supabase
                    .from('device_tokens')
                    .update({ last_used_at: new Date().toISOString() })
                    .eq('id', existingDevice.id);
            } else {
                // Check if this is the FIRST device for the user
                const { count } = await supabase
                    .from('device_tokens')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId);

                const isFirstDevice = count === 0;

                // Register new device
                await supabase
                    .from('device_tokens')
                    .insert({
                        user_id: userId,
                        device_id: deviceId,
                        device_name: deviceName,
                        is_trusted: isFirstDevice // Auto-trust first device
                    });

                if (!isFirstDevice) {
                    console.warn('New device detected. Verification required in production.');
                }
            }
        } catch (deviceError) {
            console.error('Device tracking failed:', deviceError);
        }

        return data;
    };

    const signInWithGoogle = async () => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard'
            }
        });

        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        if (!supabase) throw new Error('Supabase not configured');

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const resetPassword = async (email) => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
        return data;
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
