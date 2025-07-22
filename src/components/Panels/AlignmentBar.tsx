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
    const selectedNodes = useFlowStore(state => state.selectedNodes);

    if (selectedNodes.length < 2) return null;

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
    };

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex gap-1 z-10">
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
            >
                <AlignHorizontalDistributeCenter size={20} />
            </button>
            <button
                onClick={distributeVertical}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Distribute vertically"
            >
                <AlignVerticalDistributeCenter size={20} />
            </button>
        </div>
    );
}