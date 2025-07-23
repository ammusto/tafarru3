import React from 'react';
import {
    MousePointer,
    Circle,
    Grid3x3,
    Undo,
    Redo,
    Trash2
} from 'lucide-react';
import { useFlowStore, useTemporalStore } from '../../store/useFlowStore';

export function ControlPanel() {
    const {
        mode,
        setMode,
        gridEnabled,
        toggleGrid,
        selectedNodes,
        selectedEdges,
        deleteNodes,
        deleteEdges
    } = useFlowStore();

    const { undo, redo, canUndo, canRedo } = useTemporalStore();

    const handleDelete = () => {
        if (selectedNodes.length > 0) {
            deleteNodes(selectedNodes);
        }
        if (selectedEdges.length > 0) {
            deleteEdges(selectedEdges);
        }
    };

    return (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-2 z-10">
            <div className="flex flex-col gap-1">
                <button
                    onClick={() => setMode('select')}
                    className={`p-2 rounded-md transition-colors ${mode === 'select'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100'
                        }`}
                    title="Select mode (V)"
                >
                    <MousePointer size={20} />
                </button>

                <button
                    onClick={() => setMode('node')}
                    className={`p-2 rounded-md transition-colors ${mode === 'node'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100'
                        }`}
                    title="Add node (N)"
                >
                    <Circle size={20} />
                </button>
            </div>


            <div className="border-t pt-2">
                <button
                    onClick={toggleGrid}
                    className={`p-2 rounded-md transition-colors w-full ${gridEnabled
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100'
                        }`}
                    title="Toggle grid"
                >
                    <Grid3x3 size={20} />
                </button>
            </div>

            <div className="border-t pt-2 flex flex-col gap-1">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`p-2 rounded-md transition-colors ${canUndo
                        ? 'hover:bg-gray-100'
                        : 'opacity-50 cursor-not-allowed'
                        }`}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={20} />
                </button>

                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`p-2 rounded-md transition-colors ${canRedo
                        ? 'hover:bg-gray-100'
                        : 'opacity-50 cursor-not-allowed'
                        }`}
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo size={20} />
                </button>
            </div>

            {
                (selectedNodes.length > 0 || selectedEdges.length > 0) && (
                    <div className="border-t pt-2">
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-md transition-colors hover:bg-red-100 text-red-600 w-full"
                            title="Delete selected"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                )
            }
        </div >
    );
}