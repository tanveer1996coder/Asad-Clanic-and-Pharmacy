import { useEffect, useCallback } from 'react';

/**
 * Custom hook for handling keyboard shortcuts.
 * 
 * @param {Object} keyMap - A map of key combinations to callback functions.
 * Example: { 'Control+s': handleSave, 'Escape': handleCancel }
 * @param {boolean} enabled - Whether the shortcuts are active.
 */
const useKeyboardShortcuts = (keyMap, enabled = true) => {
    const handleKeyDown = useCallback(
        (event) => {
            if (!enabled) return;

            const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

            // Construct the key string (e.g., "Control+s", "Shift+Enter", "F2")
            const modifiers = [];
            if (ctrlKey) modifiers.push('Control');
            if (shiftKey) modifiers.push('Shift');
            if (altKey) modifiers.push('Alt');
            if (metaKey) modifiers.push('Meta');

            // Avoid adding the modifier itself if it's the key pressed
            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
                modifiers.push(key);
            }

            const combo = modifiers.join('+');

            if (keyMap[combo]) {
                event.preventDefault();
                keyMap[combo](event);
            } else if (keyMap[key]) {
                // Fallback for simple keys if exact combo match fails (though combo logic covers simple keys too)
                // But we prioritize the combo match above.
                // This block might be redundant if we strictly use the combo builder, 
                // but useful if user passes just "Enter" and we didn't press any modifiers.
                if (modifiers.length === 1 && modifiers[0] === key) {
                    event.preventDefault();
                    keyMap[key](event);
                }
            }
        },
        [keyMap, enabled]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
