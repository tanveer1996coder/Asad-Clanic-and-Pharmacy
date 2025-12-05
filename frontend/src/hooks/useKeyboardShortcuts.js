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
    // Keep track of registered keys to cleanup on unmount/change
    const registeredKeysRef = useRef([]);

    const handleKeyDown = useCallback(
        (event) => {
            if (!enabled) return;

            // Ignore if inside an input/textarea unless it's a special command (like Alt/Ctrl)
            // But usually we want global nav to work everywhere.
            // For now, let's allow it everywhere, but specific pages might want to block it.

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
            if (keyMap[combo]) {
                handler = keyMap[combo];
            }
            // 2. Check simple key if no modifiers (fallback)
            else if (keyMap[key] && modifiers.length <= 1 && modifiers[0] === key) {
                handler = keyMap[key];
            }

            if (handler) {
                const action = typeof handler === 'function' ? handler : handler.action;
                if (action) {
                    event.preventDefault();
                    action(event);
                }
            }
        },
        [keyMap, enabled]
    );

    // Register shortcuts with Context for Help Modal
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

        registeredKeysRef.current = newRegisteredKeys;

        return () => {
            newRegisteredKeys.forEach(id => unregisterShortcut(id));
        };
    }, [keyMap, section, enabled, registerShortcut, unregisterShortcut]);

    // Attach actual event listener
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
