import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

const STORAGE_KEY = 'tafarru3_sessions';
const MAX_SESSIONS = 10;

interface Session {
    id: string;
    name: string;
    timestamp: number;
    data: {
        nodes: any[];
        edges: any[];
        projectName: string;
    };
}

export function useAutoSave() {
    const { nodes, edges, projectName, unsavedChanges } = useFlowStore();

    // Auto-save to local storage
    useEffect(() => {
        if (!unsavedChanges || nodes.length === 0) return;

        const saveTimeout = setTimeout(() => {
            const sessions: Session[] = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || '[]'
            );

            const currentSession: Session = {
                id: `session-${Date.now()}`,
                name: projectName,
                timestamp: Date.now(),
                data: { nodes, edges, projectName }
            };

            // Find if current project exists
            const existingIndex = sessions.findIndex(s => s.name === projectName);
            if (existingIndex !== -1) {
                sessions[existingIndex] = currentSession;
            } else {
                sessions.unshift(currentSession);
            }

            // Keep only last MAX_SESSIONS
            const trimmedSessions = sessions.slice(0, MAX_SESSIONS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSessions));
        }, 1000); // Save after 1 second of no changes

        return () => clearTimeout(saveTimeout);
    }, [nodes, edges, projectName, unsavedChanges]);
}

export function getSessions(): Session[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export function loadSession(sessionId: string) {
    const sessions = getSessions();
    return sessions.find(s => s.id === sessionId);
}

export function clearSessions() {
    localStorage.removeItem(STORAGE_KEY);
}