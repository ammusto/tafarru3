import { useEffect } from 'react';
import { useFlowStore, useTemporalStore } from '../store/useFlowStore';

export function useKeyboardShortcuts() {
    const {
        mode,
        setMode,
        selectedNodes,
        selectedEdges,
        deleteNodes,
        deleteEdges
    } = useFlowStore();

    const { undo, redo } = useTemporalStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if typing in an input
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Mode shortcuts
            if (!event.ctrlKey && !event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'v':
                        event.preventDefault();
                        setMode('select');
                        break;
                    case 'n':
                        event.preventDefault();
                        setMode('node');
                        break;
                    case 'l':
                        event.preventDefault();
                        setMode('edge');
                        break;
                    case 'delete':
                    case 'backspace':
                        event.preventDefault();
                        if (selectedNodes.length > 0) {
                            deleteNodes(selectedNodes);
                        }
                        if (selectedEdges.length > 0) {
                            deleteEdges(selectedEdges);
                        }
                        break;
                }
            }

            // Ctrl/Cmd shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'z':
                        if (event.shiftKey) {
                            event.preventDefault();
                            redo();
                        } else {
                            event.preventDefault();
                            undo();
                        }
                        break;
                    case 's':
                        event.preventDefault();
                        // Save functionality would go here
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, setMode, selectedNodes, selectedEdges, deleteNodes, deleteEdges, undo, redo]);
}