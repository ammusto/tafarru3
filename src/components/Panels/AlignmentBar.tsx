import React from 'react';
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
    const { selectedNodes, setUnsavedChanges } = useFlowStore();

    // Always render but hide if less than 2 nodes selected
    const isVisible = selectedNodes.length >= 2;

    const alignHorizontal = () => {
        const nodes = getNodes();
        const selectedSet = new Set(selectedNodes);
        const selected = nodes.filter(n => selectedSet.has(n.id));

        if (selected.length < 2) return;

        const avgY = selected.reduce((sum, node) => sum + node.position.y, 0) / selected.length;

        setNodes(nodes.map(node => {
            if (selectedSet.has(node.id)) {
                return {
                    ...node,
                    position: { ...node.position, y: avgY }
                };
            }
            return node;
        }));
        setUnsavedChanges(true);
    };

    const alignVertical = () => {
        const nodes = getNodes();
        const selectedSet = new Set(selectedNodes);
        const selected = nodes.filter(n => selectedSet.has(n.id));

        if (selected.length < 2) return;

        const avgX = selected.reduce((sum, node) => sum + node.position.x, 0) / selected.length;

        setNodes(nodes.map(node => {
            if (selectedSet.has(node.id)) {
                return {
                    ...node,
                    position: { ...node.position, x: avgX }
                };
            }
            return node;
        }));
        setUnsavedChanges(true);
    };

    const distributeHorizontal = () => {
        const nodes = getNodes();
        const selectedSet = new Set(selectedNodes);
        const selected = nodes.filter(n => selectedSet.has(n.id));

        if (selected.length < 3) return;

        // Sort by X position
        selected.sort((a, b) => a.position.x - b.position.x);

        const leftX = selected[0].position.x;
        const rightX = selected[selected.length - 1].position.x;
        const spacing = (rightX - leftX) / (selected.length - 1);

        setNodes(nodes.map(node => {
            const index = selected.findIndex(n => n.id === node.id);
            if (index !== -1) {
                return {
                    ...node,
                    position: { ...node.position, x: leftX + spacing * index }
                };
            }
            return node;
        }));
        setUnsavedChanges(true);
    };

    const distributeVertical = () => {
        const nodes = getNodes();
        const selectedSet = new Set(selectedNodes);
        const selected = nodes.filter(n => selectedSet.has(n.id));

        if (selected.length < 3) return;

        // Sort by Y position
        selected.sort((a, b) => a.position.y - b.position.y);

        const topY = selected[0].position.y;
        const bottomY = selected[selected.length - 1].position.y;
        const spacing = (bottomY - topY) / (selected.length - 1);

        setNodes(nodes.map(node => {
            const index = selected.findIndex(n => n.id === node.id);
            if (index !== -1) {
                return {
                    ...node,
                    position: { ...node.position, y: topY + spacing * index }
                };
            }
            return node;
        }));
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