import { useEffect, useCallback, useRef } from 'react';
import { useKeyboard } from '../contexts/KeyboardContext';

/**
 * Custom hook for handling keyboard shortcuts.
 * 
 * @param {Object} keyMap - Map of key combos to callbacks/metadata.
 * Format: { 'Alt+n': { action: handleNew, description: 'New Item' } }
 * OR simple format: { 'Alt+n': handleNew } (will lack description)
 * @param {string} section - The section name for the help modal (e.g., "Sales Page")
 * @param {boolean} enabled - Whether the shortcuts are active.
 */
const useKeyboardShortcuts = (keyMap, section = 'Global', enabled = true) => {
    const { registerShortcut, unregisterShortcut } = useKeyboard();

    // Use refs to access latest values in event handler without triggering re-renders
    const keyMapRef = useRef(keyMap);

    // Update ref when keyMap changes
    useEffect(() => {
        keyMapRef.current = keyMap;
    }, [keyMap]);

    const handleKeyDown = useCallback(
        (event) => {
            if (!enabled) return;

            const map = keyMapRef.current;
            const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

            // Construct the key string
            const modifiers = [];
            if (ctrlKey) modifiers.push('Control');
            if (shiftKey) modifiers.push('Shift');
            if (altKey) modifiers.push('Alt');
            if (metaKey) modifiers.push('Meta');

            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
                modifiers.push(key);
            }

            const combo = modifiers.join('+');

            // Check for match
            let handler = null;

            // 1. Check exact combo
            if (map[combo]) {
                handler = map[combo];
            }
            // 2. Check simple key if no modifiers (fallback)
            else if (map[key] && modifiers.length <= 1 && modifiers[0] === key) {
                handler = map[key];
            }

            if (handler) {
                const action = typeof handler === 'function' ? handler : handler.action;
                if (action) {
                    event.preventDefault();
                    action(event);
                }
            }
        },
        [enabled]
    );

    // Register shortcuts with Context for Help Modal
    // Prevent infinite loop by serializing keys
    const shortcutKeys = JSON.stringify(Object.keys(keyMap));

    useEffect(() => {
        if (!enabled) return;

        const newRegisteredKeys = [];

        Object.entries(keyMap).forEach(([keys, value]) => {
            const description = value.description || 'No description';
            const action = typeof value === 'function' ? value : value.action;
            const id = `${section}-${keys}`; // Unique ID

            registerShortcut(id, section, keys, description, action);
            newRegisteredKeys.push(id);
        });

        return () => {
            newRegisteredKeys.forEach(id => unregisterShortcut(id));
        };
    }, [shortcutKeys, section, enabled, registerShortcut, unregisterShortcut]);

    // Attach actual event listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
