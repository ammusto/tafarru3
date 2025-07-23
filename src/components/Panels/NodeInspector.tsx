import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeData, EdgeData } from '../../types';
import { useMemo } from 'react';
import { debounce } from 'lodash';

export function NodeInspector() {
    const { selectedNodes, selectedEdges, nodes, edges, updateNode, updateEdge } = useFlowStore();
    const [nodeData, setNodeData] = useState<NodeData | null>(null);
    const [edgeData, setEdgeData] = useState<EdgeData | null>(null);
    const [multiSelect, setMultiSelect] = useState(false);

    useEffect(() => {
        if (selectedNodes.length === 1) {
            const node = nodes.find(n => n.id === selectedNodes[0]);
            if (node) {
                setNodeData(node.data);
                setEdgeData(null);
                setMultiSelect(false);
            }
        } else if (selectedNodes.length > 1) {
            // Multi-select mode - only show style properties
            const firstNode = nodes.find(n => n.id === selectedNodes[0]);
            if (firstNode) {
                setNodeData({
                    ...firstNode.data,
                    // Clear non-style properties
                    label: '',
                    kunya: '',
                    nasab: '',
                    nisba: '',
                    shuhra: '',
                    deathDate: '',
                    biography: '',
                });
                setEdgeData(null);
                setMultiSelect(true);
            }
        } else if (selectedEdges.length === 1) {
            const edge = edges.find(e => e.id === selectedEdges[0]);
            if (edge) {
                setEdgeData(edge.data ?? null);
                setNodeData(null);
                setMultiSelect(false);
            }
        } else {
            setNodeData(null);
            setEdgeData(null);
            setMultiSelect(false);
        }
    }, [selectedNodes, selectedEdges, nodes, edges]);

    const debouncedNodeChange = useMemo(
        () => debounce((field: keyof NodeData, value: any) => {
            if (selectedNodes.length === 1) {
                updateNode(selectedNodes[0], { [field]: value });
            }
        }, 500),
        [selectedNodes, updateNode]
    );

    const handleNodeChange = (field: keyof NodeData, value: any) => {
        if (nodeData) {
            const updates = { ...nodeData, [field]: value };
            setNodeData(updates);

            // Update all selected nodes if multi-select
            if (multiSelect) {
                selectedNodes.forEach(nodeId => {
                    updateNode(nodeId, { [field]: value });
                });
            } else if (selectedNodes.length === 1) {
                updateNode(selectedNodes[0], updates);
            }
        }
    };

    const handleEdgeChange = (field: keyof EdgeData, value: any) => {
        if (selectedEdges.length === 1 && edgeData) {
            const updates = { ...edgeData, [field]: value };
            setEdgeData(updates);
            updateEdge(selectedEdges[0], updates);
        }
    };

    if (!nodeData && !edgeData) return null;

    return (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto z-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                    {multiSelect ? `Node Style (${selectedNodes.length} selected)` :
                        nodeData ? 'Node Properties' : 'Edge Properties'}
                </h3>
                <button
                    onClick={() => useFlowStore.getState().clearSelection()}
                    className="p-1 hover:bg-gray-100 rounded"
                >
                    <X size={16} />
                </button>
            </div>

            {nodeData && !multiSelect && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                            type="text"
                            value={nodeData.label || ''}
                            onChange={(e) => {
                                setNodeData({ ...nodeData, label: e.target.value });
                                debouncedNodeChange('label', e.target.value);
                            }}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Custom label"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium mb-1">Kunya</label>
                            <input
                                type="text"
                                value={nodeData.kunya || ''}
                                onChange={(e) => handleNodeChange('kunya', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Shuhra</label>
                            <input
                                type="text"
                                value={nodeData.shuhra || ''}
                                onChange={(e) => handleNodeChange('shuhra', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nasab</label>
                        <input
                            type="text"
                            value={nodeData.nasab || ''}
                            onChange={(e) => handleNodeChange('nasab', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Nisba</label>
                        <input
                            type="text"
                            value={nodeData.nisba || ''}
                            onChange={(e) => handleNodeChange('nisba', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Death Date</label>
                        <input
                            type="text"
                            value={nodeData.deathDate || ''}
                            onChange={(e) => handleNodeChange('deathDate', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="d. 123/456"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Biography</label>
                        <textarea
                            value={nodeData.biography || ''}
                            onChange={(e) => handleNodeChange('biography', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                            rows={3}
                            placeholder="Biographical notes (shows on hover)"
                        />
                    </div>

                    <div className="border-t pt-3">
                        <h4 className="font-medium mb-2">Node Style</h4>
                        {renderNodeStyleFields()}
                    </div>
                </div>
            )}

            {nodeData && multiSelect && (
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                            Style changes will apply to all {selectedNodes.length} selected nodes
                        </p>
                    </div>
                    {renderNodeStyleFields()}
                </div>
            )}

            {edgeData && (
                <div className="space-y-3">
                    {/* Edge properties remain the same */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                            type="text"
                            value={edgeData.label || ''}
                            onChange={(e) => handleEdgeChange('label', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select
                            value={edgeData.curveStyle || 'straight'}
                            onChange={(e) => handleEdgeChange('curveStyle', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        >
                            <option value="straight">Straight</option>
                            <option value="curve">Curved</option>
                            <option value="elbow">Elbow</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-sm font-medium mb-1">Line</label>
                            <select
                                value={edgeData.lineStyle || 'solid'}
                                onChange={(e) => handleEdgeChange('lineStyle', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Width</label>
                            <input
                                type="number"
                                value={edgeData.lineWidth || 2}
                                onChange={(e) => handleEdgeChange('lineWidth', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border rounded"
                                min="1"
                                max="10"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Color</label>
                            <input
                                type="text"
                                value={edgeData.lineColor || '#b1b1b7'}
                                onChange={(e) => handleEdgeChange('lineColor', e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Arrows</label>
                        <select
                            value={edgeData.arrowStyle || 'end'}
                            onChange={(e) => handleEdgeChange('arrowStyle', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        >
                            <option value="none">None</option>
                            <option value="start">End</option>
                            <option value="end">Start</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );

    function renderNodeStyleFields() {
        if (!nodeData) return null;

        return (
            <>
                <div>
                    <label className="block text-sm font-medium mb-1">Shape</label>
                    <select
                        value={nodeData.nodeShape}
                        onChange={(e) => handleNodeChange('nodeShape', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                    >
                        <option value="rectangle">Rectangle</option>
                        <option value="rounded">Rounded</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Fill Color</label>
                    <input
                        type="text"
                        value={nodeData.nodeFillColor}
                        onChange={(e) => handleNodeChange('nodeFillColor', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Border</label>
                        <select
                            value={nodeData.borderStyle}
                            onChange={(e) => handleNodeChange('borderStyle', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Width</label>
                        <input
                            type="number"
                            value={nodeData.borderWidth}
                            onChange={(e) => handleNodeChange('borderWidth', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border rounded"
                            min="1"
                            max="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Color</label>
                        <input
                            type="text"
                            value={nodeData.borderColor}
                            onChange={(e) => handleNodeChange('borderColor', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>
                </div>
            </>
        );
    }
}