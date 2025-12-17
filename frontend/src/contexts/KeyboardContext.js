import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const KeyboardContext = createContext();

export const useKeyboard = () => {
    const context = useContext(KeyboardContext);
    if (!context) {
        throw new Error('useKeyboard must be used within a KeyboardProvider');
    }
    return context;
};

export const KeyboardProvider = ({ children }) => {
    const [shortcuts, setShortcuts] = useState({});
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Register a shortcut
    // section: 'Global', 'Sales', 'Products', etc.
    // description: 'Create new sale'
    // keys: 'Alt+n'
    const registerShortcut = useCallback((id, section, keys, description, action) => {
        setShortcuts(prev => ({
            ...prev,
            [id]: { section, keys, description, action }
        }));
    }, []);

    // Unregister a shortcut
    const unregisterShortcut = useCallback((id) => {
        setShortcuts(prev => {
            const newShortcuts = { ...prev };
            delete newShortcuts[id];
            return newShortcuts;
        });
    }, []);

    // Toggle help modal
    const toggleHelp = useCallback(() => {
        setIsHelpOpen(prev => !prev);
    }, []);

    // Global listener for Help (Shift+? or F1)
    useEffect(() => {
        const handleGlobalKeys = (e) => {
            if ((e.key === '?' && e.shiftKey) || e.key === 'F1') {
                e.preventDefault();
                toggleHelp();
            }
        };

        window.addEventListener('keydown', handleGlobalKeys);
        return () => window.removeEventListener('keydown', handleGlobalKeys);
    }, [toggleHelp]);

    const value = {
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isHelpOpen,
        toggleHelp,
        setIsHelpOpen
    };

    return (
        <KeyboardContext.Provider value={value}>
            {children}
        </KeyboardContext.Provider>
    );
};
