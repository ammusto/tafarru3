import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeData, EdgeData } from '../../types';
import { useMemo } from 'react';
import { debounce } from 'lodash';

export function NodeInspector() {
    const { selectedNodes, selectedEdges, nodes, edges, updateNode, updateEdge, autoResize, setAutoResize } = useFlowStore();
    const [nodeData, setNodeData] = useState<NodeData | null>(null);
    const [edgeData, setEdgeData] = useState<EdgeData | null>(null);
    const [multiSelectNodes, setMultiSelectNodes] = useState(false);
    const [multiSelectEdges, setMultiSelectEdges] = useState(false);

    useEffect(() => {
        if (selectedNodes.length === 1) {
            const node = nodes.find(n => n.id === selectedNodes[0]);
            if (node) {
                setNodeData(node.data);
                setEdgeData(null);
                setMultiSelectNodes(false);
                setMultiSelectEdges(false);
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
                    parentId: undefined,
                });
                setEdgeData(null);
                setMultiSelectNodes(true);
                setMultiSelectEdges(false);
            }
        } else if (selectedEdges.length === 1) {
            const edge = edges.find(e => e.id === selectedEdges[0]);
            if (edge) {
                setEdgeData(edge.data ?? null);
                setNodeData(null);
                setMultiSelectNodes(false);
                setMultiSelectEdges(false);
            }
        } else if (selectedEdges.length > 1) {
            // Multi-select edges mode
            const firstEdge = edges.find(e => e.id === selectedEdges[0]);
            if (firstEdge && firstEdge.data) {
                setEdgeData({
                    label: '', // Clear label for multi-select
                    lineStyle: firstEdge.data.lineStyle || 'solid',
                    lineWidth: firstEdge.data.lineWidth || 2,
                    lineColor: firstEdge.data.lineColor || '#b1b1b7',
                    arrowStyle: firstEdge.data.arrowStyle || 'end',
                    curveStyle: firstEdge.data.curveStyle || 'straight',
                    controlPoint1X: firstEdge.data.controlPoint1X,
                    controlPoint1Y: firstEdge.data.controlPoint1Y,
                    controlPoint2X: firstEdge.data.controlPoint2X,
                    controlPoint2Y: firstEdge.data.controlPoint2Y,
                });
                setNodeData(null);
                setMultiSelectNodes(false);
                setMultiSelectEdges(true);
            }
        } else {
            setNodeData(null);
            setEdgeData(null);
            setMultiSelectNodes(false);
            setMultiSelectEdges(false);
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
            if (multiSelectNodes) {
                selectedNodes.forEach(nodeId => {
                    updateNode(nodeId, { [field]: value });
                });
            } else if (selectedNodes.length === 1) {
                updateNode(selectedNodes[0], updates);
            }
        }
    };

    const handleEdgeChange = (field: keyof EdgeData, value: any) => {
        if (edgeData) {
            const updates = { ...edgeData, [field]: value };
            setEdgeData(updates);

            // Update all selected edges if multi-select
            if (multiSelectEdges) {
                selectedEdges.forEach(edgeId => {
                    updateEdge(edgeId, { [field]: value });
                });
            } else if (selectedEdges.length === 1) {
                updateEdge(selectedEdges[0], updates);
            }
        }
    };

    if (!nodeData && !edgeData) return null;

    return (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto z-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                    {multiSelectNodes ? `Node Style (${selectedNodes.length} selected)` :
                        multiSelectEdges ? `Edge Style (${selectedEdges.length} selected)` :
                            nodeData ? 'Node Properties' : 'Edge Properties'}
                </h3>
                <button
                    onClick={() => useFlowStore.getState().clearSelection()}
                    className="p-1 hover:bg-gray-100 rounded"
                >
                    <X size={16} />
                </button>
            </div>

            {nodeData && !multiSelectNodes && (
                <div className="space-y-3">
                    {/* Show Node ID and Parent ID */}
                    <div className="p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                            <span className="font-medium">Node ID:</span> {selectedNodes[0]}
                        </div>
                        {nodeData.parentId && (
                            <div className="text-sm">
                                <span className="font-medium">Parent ID:</span> {nodeData.parentId}
                            </div>
                        )}
                    </div>

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

                    {/* Add auto-resize checkbox */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <input
                            type="checkbox"
                            id="autoResize"
                            checked={autoResize}
                            onChange={(e) => setAutoResize(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="autoResize" className="text-sm">
                            Auto-resize width to fit text
                        </label>
                    </div>

                    <div className="border-t pt-3">
                        <h4 className="font-medium mb-2">Node Style</h4>
                        {renderNodeStyleFields()}
                    </div>
                </div>
            )}

            {nodeData && multiSelectNodes && (
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                            Style changes will apply to all {selectedNodes.length} selected nodes
                        </p>
                    </div>
                    {renderNodeStyleFields()}
                </div>
            )}

            {edgeData && !multiSelectEdges && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Label</label>
                        <input
                            type="text"
                            value={edgeData.label || ''}
                            onChange={(e) => handleEdgeChange('label', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                        />
                    </div>

                    {renderEdgeStyleFields()}
                </div>
            )}

            {edgeData && multiSelectEdges && (
                <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                            Style changes will apply to all {selectedEdges.length} selected edges
                        </p>
                    </div>
                    {renderEdgeStyleFields()}
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

    function renderEdgeStyleFields() {
        if (!edgeData) return null;

        return (
            <>
                <div>
                    <label className="block text-sm font-medium mb-1">Style</label>
                    <select
                        value={edgeData.curveStyle || 'straight'}
                        onChange={(e) => handleEdgeChange('curveStyle', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                    >
                        <option value="straight">Straight</option>
                        <option value="curve">Curved (Auto)</option>
                        <option value="bezier">Bezier (Manual)</option>
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
            </>
        );
    }
}