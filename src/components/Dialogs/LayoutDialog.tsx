import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, GitBranch } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import dagre from 'dagre';
import { useFlowStore } from '../../store/useFlowStore';

export function LayoutDialog() {
    const [open, setOpen] = useState(false);
    const [spacing, setSpacing] = useState(75);
    const { getNodes, getEdges, setNodes } = useReactFlow();

    const handleAutoLayout = () => {
        const nodes = getNodes();
        const edges = getEdges();

        // Create a new dagre graph
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

        // Add edges to dagre
        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        // Calculate the layout
        dagre.layout(dagreGraph);

        // Apply the layout
        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - (node.data.width || 150) / 2,
                    y: nodeWithPosition.y - (node.data.height || 50) / 2,
                },
            };
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