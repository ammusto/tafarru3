import React, { useMemo } from 'react';
import {
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    AlignHorizontalDistributeCenter,
    AlignVerticalDistributeCenter,
} from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useFlowStore } from '../../store/useFlowStore';

export function AlignmentBar() {
    const { getNodes, setNodes } = useReactFlow();
    const { setUnsavedChanges } = useFlowStore();
    const selectedNodes = getNodes().filter(n => n.selected);


    const isVisible = selectedNodes.length >= 2;
    const selectedSet = new Set(selectedNodes.map(n => n.id));

    const alignHorizontal = () => {
        if (selectedNodes.length < 2) return;

        const avgY =
            selectedNodes.reduce((sum, node) => sum + node.position.y, 0) /
            selectedNodes.length;

        setNodes(prev =>
            prev.map(node =>
                selectedSet.has(node.id)
                    ? { ...node, position: { ...node.position, y: avgY } }
                    : node
            )
        );
        setUnsavedChanges(true);
    };

    const alignVertical = () => {
        if (selectedNodes.length < 2) return;

        const avgX =
            selectedNodes.reduce((sum, node) => sum + node.position.x, 0) /
            selectedNodes.length;

        setNodes(prev =>
            prev.map(node =>
                selectedSet.has(node.id)
                    ? { ...node, position: { ...node.position, x: avgX } }
                    : node
            )
        );
        setUnsavedChanges(true);
    };

    const distributeHorizontal = () => {
        if (selectedNodes.length < 3) return;

        const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        const leftX = sorted[0].position.x;
        const rightX = sorted[sorted.length - 1].position.x;
        const spacing = (rightX - leftX) / (sorted.length - 1);

        setNodes(prev =>
            prev.map(node => {
                const index = sorted.findIndex(n => n.id === node.id);
                return index !== -1
                    ? { ...node, position: { ...node.position, x: leftX + spacing * index } }
                    : node;
            })
        );
        setUnsavedChanges(true);
    };

    const distributeVertical = () => {
        if (selectedNodes.length < 3) return;

        const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        const topY = sorted[0].position.y;
        const bottomY = sorted[sorted.length - 1].position.y;
        const spacing = (bottomY - topY) / (sorted.length - 1);

        setNodes(prev =>
            prev.map(node => {
                const index = sorted.findIndex(n => n.id === node.id);
                return index !== -1
                    ? { ...node, position: { ...node.position, y: topY + spacing * index } }
                    : node;
            })
        );
        setUnsavedChanges(true);
    };

    return (
        <div
            className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex gap-1 z-10 transition-all duration-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
        >
            <button
                onClick={alignHorizontal}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Align horizontally"
            >
                <AlignHorizontalJustifyCenter size={20} />
            </button>
            <button
                onClick={alignVertical}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Align vertically"
            >
                <AlignVerticalJustifyCenter size={20} />
            </button>
            <button
                onClick={distributeHorizontal}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Distribute horizontally"
                disabled={selectedNodes.length < 3}
            >
                <AlignHorizontalDistributeCenter size={20} />
            </button>
            <button
                onClick={distributeVertical}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Distribute vertically"
                disabled={selectedNodes.length < 3}
            >
                <AlignVerticalDistributeCenter size={20} />
            </button>
        </div>
    );
}
