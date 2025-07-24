import { create } from 'zustand';
import { Node, Edge, Connection, EdgeChange, NodeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { NodeData, EdgeData, EditorMode } from '../types';
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import throttle from 'lodash/throttle';

interface FlowState {
    // Flow state
    nodes: Node<NodeData>[];
    edges: Edge<EdgeData>[];

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

    // Node actions
    addNode: (node: Node<NodeData>) => void;
    updateNode: (nodeId: string, data: Partial<NodeData>) => void;
    deleteNodes: (nodeIds: string[]) => void;

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

// Helper function to update ParentID in node data
const updateParentIdInNode = (node: Node<NodeData>, oldParentId: string, newParentId: string): Node<NodeData> => {
    if (node.data.parentId === oldParentId) {
        return {
            ...node,
            data: {
                ...node.data,
                parentId: newParentId
            }
        };
    }
    return node;
};

export const useFlowStore = create<FlowState>()(
    subscribeWithSelector(
        temporal(
            immer((set, get) => ({
                // Initial state
                nodes: [],
                edges: [],
                selectedNodes: [],
                selectedEdges: [],
                mode: 'select',
                gridEnabled: true,
                projectName: 'Untitled',
                unsavedChanges: false,
                isInteracting: false,

                // Helper to get next node ID
                getNextNodeId: () => {
                    const state = get();
                    const nodeIds = state.nodes.map(n => getNumericId(n.id));
                    const maxId = nodeIds.length > 0 ? Math.max(...nodeIds) : 0;
                    return `node-${maxId + 1}`;
                },

                // Recalculate all node IDs and update parentIds
                recalculateNodeIds: () => set((state) => {
                    // Create mapping of old IDs to new IDs
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

                    // Update nodes with new IDs and update parentIds
                    state.nodes = sortedNodes.map((node, index) => {
                        const newId = `node-${index + 1}`;
                        let updatedNode = { ...node, id: newId };

                        // Update parentId if it was changed
                        if (node.data.parentId && idMapping[node.data.parentId]) {
                            updatedNode.data = {
                                ...updatedNode.data,
                                parentId: idMapping[node.data.parentId]
                            };
                        }

                        return updatedNode;
                    });

                    // Update edges with new node IDs
                    state.edges = state.edges.map(edge => {
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
                    state.selectedNodes = state.selectedNodes.map(id => idMapping[id] || id);
                }),

                // Flow actions
                setNodes: (nodes) => set((state) => {
                    state.nodes = nodes;
                    state.unsavedChanges = true;
                }),

                setEdges: (edges) => set((state) => {
                    state.edges = edges;
                    state.unsavedChanges = true;
                }),

                onNodesChange: (changes) => set((state) => {
                    const significantChange = changes.some(change =>
                        change.type === 'remove' ||
                        (change.type === 'position' && !state.isInteracting)
                    );

                    state.nodes = applyNodeChanges(changes, state.nodes);

                    if (significantChange) {
                        state.unsavedChanges = true;
                    }
                }),

                onEdgesChange: (changes) => set((state) => {
                    state.edges = applyEdgeChanges(changes, state.edges);
                    state.unsavedChanges = true;
                }),

                onConnect: (connection) => set((state) => {
                    const source = connection.source!;
                    const target = connection.target!;
                    const id = `e${source}-${target}-${Date.now()}`;

                    // Find source and target nodes
                    const sourceNode = state.nodes.find(n => n.id === source);
                    const targetNode = state.nodes.find(n => n.id === target);

                    if (sourceNode && targetNode) {
                        // If connecting from top to bottom, make target the parent of source
                        if (connection.sourceHandle === 'top' && connection.targetHandle === 'bottom') {
                            const sourceNodeIndex = state.nodes.findIndex(n => n.id === source);
                            if (sourceNodeIndex !== -1) {
                                state.nodes[sourceNodeIndex] = {
                                    ...state.nodes[sourceNodeIndex],
                                    data: {
                                        ...state.nodes[sourceNodeIndex].data,
                                        parentId: target  // Target becomes parent of source
                                    }
                                };
                            }
                        }
                        // If connecting from bottom to top, make source the parent of target
                        else if (connection.sourceHandle === 'bottom' && connection.targetHandle === 'top') {
                            const targetNodeIndex = state.nodes.findIndex(n => n.id === target);
                            if (targetNodeIndex !== -1) {
                                state.nodes[targetNodeIndex] = {
                                    ...state.nodes[targetNodeIndex],
                                    data: {
                                        ...state.nodes[targetNodeIndex].data,
                                        parentId: source  // Source becomes parent of target
                                    }
                                };
                            }
                        }
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

                    state.edges.push(newEdge);
                    state.unsavedChanges = true;
                }),

                // Node actions
                addNode: (node) => set((state) => {
                    // Use sequential ID
                    const nextId = state.getNextNodeId();
                    const nodeWithId = { ...node, id: nextId };
                    state.nodes.push(nodeWithId);
                    state.unsavedChanges = true;
                }),

                updateNode: (nodeId, data) => set((state) => {
                    const node = state.nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.data = { ...node.data, ...data };
                        state.unsavedChanges = true;
                    }
                }),

                deleteNodes: (nodeIds) => set((state) => {
                    // Remove nodes
                    state.nodes = state.nodes.filter(n => !nodeIds.includes(n.id));

                    // Remove edges connected to deleted nodes
                    state.edges = state.edges.filter(e =>
                        !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
                    );

                    // Clear parentId references to deleted nodes
                    state.nodes = state.nodes.map(node => {
                        if (node.data.parentId && nodeIds.includes(node.data.parentId)) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    parentId: undefined
                                }
                            };
                        }
                        return node;
                    });

                    // Recalculate IDs after deletion
                    state.recalculateNodeIds();

                    state.unsavedChanges = true;
                }),

                // Edge actions
                addEdge: (edge) => set((state) => {
                    state.edges.push(edge);
                    state.unsavedChanges = true;
                }),

                updateEdge: (edgeId, data) => set((state) => {
                    const edgeIndex = state.edges.findIndex(e => e.id === edgeId);
                    if (edgeIndex === -1) return;

                    const prev = state.edges[edgeIndex];
                    if (!prev.data) return;

                    const current = prev.data;

                    const merged: EdgeData = {
                        lineStyle: data.lineStyle ?? current.lineStyle,
                        lineWidth: data.lineWidth ?? current.lineWidth,
                        lineColor: data.lineColor ?? current.lineColor,
                        arrowStyle: data.arrowStyle ?? current.arrowStyle,
                        curveStyle: data.curveStyle ?? current.curveStyle,
                        label: data.label ?? current.label,
                        controlPoint1X: 'controlPoint1X' in data ? data.controlPoint1X! : current.controlPoint1X,
                        controlPoint1Y: 'controlPoint1Y' in data ? data.controlPoint1Y! : current.controlPoint1Y,
                        controlPoint2X: 'controlPoint2X' in data ? data.controlPoint2X! : current.controlPoint2X,
                        controlPoint2Y: 'controlPoint2Y' in data ? data.controlPoint2Y! : current.controlPoint2Y,
                    };

                    state.edges[edgeIndex] = {
                        ...prev,
                        data: merged,
                    };
                    state.unsavedChanges = true;
                }),

                deleteEdges: (edgeIds) => set((state) => {
                    // When deleting edges, clear parentId if it's a hierarchical edge
                    edgeIds.forEach(edgeId => {
                        const edge = state.edges.find(e => e.id === edgeId);
                        if (edge) {
                            // Check if source is child of target
                            if (edge.sourceHandle === 'top' && edge.targetHandle === 'bottom') {
                                const sourceNode = state.nodes.find(n => n.id === edge.source);
                                if (sourceNode && sourceNode.data.parentId === edge.target) {
                                    sourceNode.data = {
                                        ...sourceNode.data,
                                        parentId: undefined
                                    };
                                }
                            }
                            // Check if target is child of source
                            else if (edge.sourceHandle === 'bottom' && edge.targetHandle === 'top') {
                                const targetNode = state.nodes.find(n => n.id === edge.target);
                                if (targetNode && targetNode.data.parentId === edge.source) {
                                    targetNode.data = {
                                        ...targetNode.data,
                                        parentId: undefined
                                    };
                                }
                            }
                        }
                    });

                    state.edges = state.edges.filter(e => !edgeIds.includes(e.id));
                    state.unsavedChanges = true;
                }),

                // Selection
                setSelectedNodes: (nodeIds) => set((state) => {
                    state.selectedNodes = nodeIds;
                }),

                setSelectedEdges: (edgeIds) => set((state) => {
                    state.selectedEdges = edgeIds;
                }),

                clearSelection: () => set((state) => {
                    state.selectedNodes = [];
                    state.selectedEdges = [];
                }),

                // UI actions
                setMode: (mode) => set((state) => {
                    state.mode = mode;
                }),

                toggleGrid: () => set((state) => {
                    state.gridEnabled = !state.gridEnabled;
                }),

                setProjectName: (name) => set((state) => {
                    state.projectName = name;
                }),

                setUnsavedChanges: (value) => set((state) => {
                    state.unsavedChanges = value;
                }),

                setIsInteracting: (value) => set((state) => {
                    state.isInteracting = value;
                }),

                // Import/Export
                importData: (nodes, edges) => set((state) => {
                    state.nodes = nodes;
                    state.edges = edges;
                    state.unsavedChanges = false;
                    state.selectedNodes = [];
                    state.selectedEdges = [];
                }),

                clearAll: () => set((state) => {
                    state.nodes = [];
                    state.edges = [];
                    state.selectedNodes = [];
                    state.selectedEdges = [];
                    state.unsavedChanges = false;
                })
            })),
            {
                limit: 50,
                partialize: (state) => ({
                    nodes: state.nodes,
                    edges: state.edges
                }),
                equality: (pastState, currentState) => {
                    return JSON.stringify(pastState) === JSON.stringify(currentState);
                },
                handleSet: (handleSet) =>
                    throttle<typeof handleSet>((state) => {
                        if (typeof state === 'object' && state !== null && 'isInteracting' in state && !(state as FlowState).isInteracting) {
                            handleSet(state);
                        }
                    }, 1000)
            }
        )
    )
);

// Temporal store hook remains the same
export const useTemporalStore = () => {
    const temporalStoreRef = useRef((useFlowStore as any).temporal);
    const temporalStore = temporalStoreRef.current;

    const undo = useCallback(() => {
        temporalStore.getState().undo();
    }, [temporalStore]);

    const redo = useCallback(() => {
        temporalStore.getState().redo();
    }, [temporalStore]);

    const clear = useCallback(() => {
        temporalStore.getState().clear();
    }, [temporalStore]);

    const temporalState = useMemo(() => {
        const state = temporalStore.getState();
        return {
            canUndo: (state?.pastStates?.length || 0) > 0,
            canRedo: (state?.futureStates?.length || 0) > 0,
        };
    }, [temporalStore]);

    const [canUndo, setCanUndo] = useState(temporalState.canUndo);
    const [canRedo, setCanRedo] = useState(temporalState.canRedo);

    useEffect(() => {
        const unsubscribe = temporalStore.subscribe((state: any) => {
            setCanUndo((state?.pastStates?.length || 0) > 0);
            setCanRedo((state?.futureStates?.length || 0) > 0);
        });

        return unsubscribe;
    }, [temporalStore]);

    return {
        undo,
        redo,
        clear,
        canUndo,
        canRedo,
    };
};