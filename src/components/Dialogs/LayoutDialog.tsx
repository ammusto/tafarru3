import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, GitBranch } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import dagre from 'dagre';

export function LayoutDialog() {
    const [open, setOpen] = useState(false);
    const [spacing, setSpacing] = useState(75);
    const { getNodes, getEdges, setNodes } = useReactFlow();

    const handleAutoLayout = () => {
        const nodes = getNodes();

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: spacing });

        // Add nodes to dagre
        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, {
                width: node.data.width || 150,
                height: node.data.height || 50
            });
        });

        // Add edges based on parentId
        nodes.forEach((node) => {
            if (node.data.parentId && nodes.some(n => n.id === node.data.parentId)) {
                dagreGraph.setEdge(node.data.parentId, node.id);
            }
        });

        // Calculate the layout
        dagre.layout(dagreGraph);

        // Get initial positions from dagre
        let layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - (node.data.width || 150) / 2,
                    y: nodeWithPosition.y - (node.data.height || 50) / 2,
                },
            };
        });

        // Group nodes by parent to fix spacing between siblings
        const nodesByParent = new Map<string, typeof layoutedNodes>();
        layoutedNodes.forEach((node) => {
            const parentId = node.data.parentId || 'root';
            if (!nodesByParent.has(parentId)) {
                nodesByParent.set(parentId, []);
            }
            nodesByParent.get(parentId)!.push(node);
        });

        // Fix horizontal spacing for each group of siblings
        const FIXED_GAP = 30; // Fixed pixel gap between nodes

        nodesByParent.forEach((siblings) => {
            if (siblings.length <= 1) return;

            // Sort siblings by their current x position
            siblings.sort((a, b) => a.position.x - b.position.x);

            // Calculate total width needed
            const totalWidth = siblings.reduce((sum: number, node) => sum + (node.data.width || 150), 0)
                + (siblings.length - 1) * FIXED_GAP;

            // Get center position (average of current positions)
            const centerX = siblings.reduce((sum: number, node) => sum + node.position.x + (node.data.width || 150) / 2, 0) / siblings.length;

            // Reposition with fixed gaps, centered around original position
            let currentX = centerX - totalWidth / 2;

            siblings.forEach((node) => {
                const nodeWidth = node.data.width || 150;
                node.position.x = currentX;
                currentX += nodeWidth + FIXED_GAP;
            });
        });

        setNodes(layoutedNodes);
        setOpen(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                    <GitBranch size={20} />
                    Auto-Layout
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
                    <Dialog.Title className="text-lg font-semibold mb-4">Auto-Align Hierarchy</Dialog.Title>

                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Warning:</strong> This will re-align all nodes based on their hierarchical relationships.
                                Manual positions will be overwritten.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Vertical Spacing
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                value={spacing}
                                onChange={(e) => setSpacing(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>50px</span>
                                <span>{spacing}px</span>
                                <span>200px</span>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Dialog.Close asChild>
                                <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={handleAutoLayout}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                            >
                                Apply Layout
                            </button>
                        </div>
                    </div>

                    <Dialog.Close asChild>
                        <button
                            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}