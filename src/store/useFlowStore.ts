import { create } from 'zustand';
import { Node, Edge, Connection, EdgeChange, NodeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { NodeData, EdgeData, EditorMode } from '../types';

interface FlowState {
    // Flow state
    nodes: Node<NodeData>[];
    edges: Edge<EdgeData>[];
    shouldFitView: boolean;
    autoResize: boolean;

    // UI state
    selectedNodes: string[];
    selectedEdges: string[];
    mode: EditorMode;
    gridEnabled: boolean;
    projectName: string;
    unsavedChanges: boolean;
    isInteracting: boolean;

    // Actions
    setNodes: (nodes: Node<NodeData>[]) => void;
    setEdges: (edges: Edge<EdgeData>[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setShouldFitView: (value: boolean) => void;

    // Node actions
    addNode: (node: Node<NodeData>) => void;
    updateNode: (nodeId: string, data: Partial<NodeData>) => void;
    deleteNodes: (nodeIds: string[]) => void;
    setAutoResize: (value: boolean) => void;

    // Edge actions
    addEdge: (edge: Edge<EdgeData>) => void;
    updateEdge: (edgeId: string, data: Partial<EdgeData>) => void;
    deleteEdges: (edgeIds: string[]) => void;

    // Selection
    setSelectedNodes: (nodeIds: string[]) => void;
    setSelectedEdges: (edgeIds: string[]) => void;
    clearSelection: () => void;

    // UI actions
    setMode: (mode: EditorMode) => void;
    toggleGrid: () => void;
    setProjectName: (name: string) => void;
    setUnsavedChanges: (value: boolean) => void;
    setIsInteracting: (value: boolean) => void;

    // Import/Export
    importData: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;
    clearAll: () => void;

    // Helper functions
    getNextNodeId: () => string;
    recalculateNodeIds: () => void;
}

// Helper function to get numeric ID from node ID string
const getNumericId = (nodeId: string): number => {
    const match = nodeId.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
};

export const useFlowStore = create<FlowState>()(
    subscribeWithSelector(
        temporal(
            (set, get) => ({
                // Initial state
                nodes: [],
                edges: [],
                selectedNodes: [],
                selectedEdges: [],
                mode: 'select' as EditorMode,
                gridEnabled: true,
                projectName: 'Untitled',
                unsavedChanges: false,
                isInteracting: false,
                shouldFitView: false,
                autoResize: true,


                // Helper to get next node ID
                getNextNodeId: () => {
                    const state = get();
                    const nodeIds = state.nodes.map(n => getNumericId(n.id));
                    const maxId = nodeIds.length > 0 ? Math.max(...nodeIds) : 0;
                    return `node-${maxId + 1}`;
                },

                // Recalculate all node IDs and update parentIds
                recalculateNodeIds: () => set((state) => {
                    const idMapping: Record<string, string> = {};

                    // Sort nodes by their current numeric ID
                    const sortedNodes = [...state.nodes].sort((a, b) => {
                        const aId = getNumericId(a.id);
                        const bId = getNumericId(b.id);
                        return aId - bId;
                    });

                    // Assign new sequential IDs
                    sortedNodes.forEach((node, index) => {
                        const newId = `node-${index + 1}`;
                        if (node.id !== newId) {
                            idMapping[node.id] = newId;
                        }
                    });

                    // Create new nodes array with updated IDs and parentIds
                    const newNodes = sortedNodes.map((node, index) => {
                        const newId = `node-${index + 1}`;
                        const newNode = { ...node, id: newId };

                        // Update parentId if it was changed
                        if (node.data.parentId && idMapping[node.data.parentId]) {
                            newNode.data = {
                                ...node.data,
                                parentId: idMapping[node.data.parentId]
                            };
                        }

                        return newNode;
                    });

                    // Create new edges array with updated node IDs
                    const newEdges = state.edges.map(edge => {
                        const newSource = idMapping[edge.source] || edge.source;
                        const newTarget = idMapping[edge.target] || edge.target;

                        return {
                            ...edge,
                            id: edge.id.replace(edge.source, newSource).replace(edge.target, newTarget),
                            source: newSource,
                            target: newTarget
                        };
                    });

                    // Update selected nodes
                    const newSelectedNodes = state.selectedNodes.map(id => idMapping[id] || id);

                    return {
                        nodes: newNodes,
                        edges: newEdges,
                        selectedNodes: newSelectedNodes
                    };
                }),

                // Flow actions
                setNodes: (nodes) => set({ nodes: [...nodes], unsavedChanges: true }),

                setShouldFitView: (value) => set({ shouldFitView: value }),
                setAutoResize: (value) => set({ autoResize: value }),
                setEdges: (edges) => set({ edges: [...edges], unsavedChanges: true }),

                onNodesChange: (changes) => set((state) => {
                    const newNodes = applyNodeChanges(changes, state.nodes);
                    const significantChange = changes.some(change =>
                        change.type === 'remove' ||
                        (change.type === 'position' && !state.isInteracting)
                    );

                    return {
                        nodes: newNodes,
                        unsavedChanges: state.unsavedChanges || significantChange
                    };
                }),

                onEdgesChange: (changes) => set((state) => ({
                    edges: applyEdgeChanges(changes, state.edges),
                    unsavedChanges: true
                })),

                onConnect: (connection) => set((state) => {
                    const source = connection.source!;
                    const target = connection.target!;
                    const id = `e${source}-${target}-${Date.now()}`;

                    let newNodes = [...state.nodes];

                    // Update parent-child relationships
                    if (connection.sourceHandle === 'top' && connection.targetHandle === 'bottom') {
                        // Target becomes parent of source
                        newNodes = newNodes.map(node =>
                            node.id === source
                                ? { ...node, data: { ...node.data, parentId: target } }
                                : node
                        );
                    } else if (connection.sourceHandle === 'bottom' && connection.targetHandle === 'top') {
                        // Source becomes parent of target
                        newNodes = newNodes.map(node =>
                            node.id === target
                                ? { ...node, data: { ...node.data, parentId: source } }
                                : node
                        );
                    }

                    const newEdge: Edge<EdgeData> = {
                        id,
                        source,
                        target,
                        sourceHandle: connection.sourceHandle || undefined,
                        targetHandle: connection.targetHandle || undefined,
                        type: 'custom',
                        data: {
                            lineStyle: 'solid',
                            lineWidth: 2,
                            lineColor: '#000000',
                            arrowStyle: 'start',
                            curveStyle: 'curve',
                        },
                    };

                    return {
                        nodes: newNodes,
                        edges: [...state.edges, newEdge],
                        unsavedChanges: true
                    };
                }),

                // Node actions
                addNode: (nodeData: Omit<Node<NodeData>, 'id'>) => set((state) => {
                    // Generate ID inside the action
                    const nodeIds = state.nodes.map(n => getNumericId(n.id));
                    const maxId = nodeIds.length > 0 ? Math.max(...nodeIds) : 0;
                    const nextId = `node-${maxId + 1}`;

                    const newNode = {
                        ...nodeData,
                        id: nextId
                    };

                    return {
                        nodes: [...state.nodes, newNode],
                        unsavedChanges: true
                    };
                }),

                updateNode: (nodeId, data) => set((state) => ({
                    nodes: state.nodes.map(node =>
                        node.id === nodeId
                            ? { ...node, data: { ...node.data, ...data } }
                            : node
                    ),
                    unsavedChanges: true
                })),

                deleteNodes: (nodeIds) => set((state) => {
                    const nodeIdSet = new Set(nodeIds);

                    // Filter out deleted nodes
                    const remainingNodes = state.nodes.filter(n => !nodeIdSet.has(n.id));

                    // Clear parentId references to deleted nodes
                    const updatedNodes = remainingNodes.map(node => {
                        if (node.data.parentId && nodeIdSet.has(node.data.parentId)) {
                            return {
                                ...node,
                                data: { ...node.data, parentId: undefined }
                            };
                        }
                        return node;
                    });

                    // Filter out edges connected to deleted nodes
                    const updatedEdges = state.edges.filter(e =>
                        !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
                    );

                    // Trigger recalculation in next tick
                    setTimeout(() => get().recalculateNodeIds(), 0);

                    return {
                        nodes: updatedNodes,
                        edges: updatedEdges,
                        unsavedChanges: true
                    };
                }),

                // Edge actions
                addEdge: (edge) => set((state) => ({
                    edges: [...state.edges, edge],
                    unsavedChanges: true
                })),

                updateEdge: (edgeId, data) => set((state) => ({
                    edges: state.edges.map(edge =>
                        edge.id === edgeId
                            ? { ...edge, data: { ...edge.data, ...data } }
                            : edge
                    ),
                    unsavedChanges: true
                })),

                deleteEdges: (edgeIds) => set((state) => {
                    const edgeIdSet = new Set(edgeIds);
                    let newNodes = [...state.nodes];

                    // Clear parentId relationships for deleted edges
                    state.edges.forEach(edge => {
                        if (edgeIdSet.has(edge.id)) {
                            if (edge.sourceHandle === 'top' && edge.targetHandle === 'bottom') {
                                newNodes = newNodes.map(node =>
                                    node.id === edge.source && node.data.parentId === edge.target
                                        ? { ...node, data: { ...node.data, parentId: undefined } }
                                        : node
                                );
                            } else if (edge.sourceHandle === 'bottom' && edge.targetHandle === 'top') {
                                newNodes = newNodes.map(node =>
                                    node.id === edge.target && node.data.parentId === edge.source
                                        ? { ...node, data: { ...node.data, parentId: undefined } }
                                        : node
                                );
                            }
                        }
                    });

                    return {
                        nodes: newNodes,
                        edges: state.edges.filter(e => !edgeIdSet.has(e.id)),
                        unsavedChanges: true
                    };
                }),

                // Selection
                setSelectedNodes: (nodeIds) => set({ selectedNodes: [...nodeIds] }),
                setSelectedEdges: (edgeIds) => set({ selectedEdges: [...edgeIds] }),
                clearSelection: () => set({ selectedNodes: [], selectedEdges: [] }),

                // UI actions
                setMode: (mode) => set({ mode }),
                toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
                setProjectName: (name) => set({ projectName: name }),
                setUnsavedChanges: (value) => set({ unsavedChanges: value }),
                setIsInteracting: (value) => set({ isInteracting: value }),

                // Import/Export
                importData: (nodes, edges) => set({
                    nodes: [...nodes],
                    edges: [...edges],
                    unsavedChanges: false,
                    selectedNodes: [],
                    selectedEdges: []
                }),

                clearAll: () => set({
                    nodes: [],
                    edges: [],
                    selectedNodes: [],
                    selectedEdges: [],
                    unsavedChanges: false
                })
            }),
            {
                limit: 50,
                partialize: (state) => ({
                    nodes: state.nodes,
                    edges: state.edges
                }),
                equality: (pastState, currentState) =>
                    JSON.stringify(pastState) === JSON.stringify(currentState)
            }
        )
    )
);

// Export temporal store access
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const useTemporalStore = () => {
    const temporalRef = useRef((useFlowStore as any).temporal);
    const temporal = temporalRef.current;

    const undo = useCallback(() => {
        temporal.getState().undo();
    }, []);

    const redo = useCallback(() => {
        temporal.getState().redo();
    }, []);

    const clear = useCallback(() => {
        temporal.getState().clear();
    }, []);

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        const unsub = temporal.subscribe((state: any) => {
            setCanUndo((state?.pastStates?.length ?? 0) > 0);
            setCanRedo((state?.futureStates?.length ?? 0) > 0);
        });
        return unsub;
    }, []);

    return {
        undo,
        redo,
        clear,
        canUndo,
        canRedo,
    };
};
