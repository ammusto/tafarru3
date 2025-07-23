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
    isInteracting: boolean; // ADD THIS

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
    setIsInteracting: (value: boolean) => void; // ADD THIS

    // Import/Export
    importData: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;
    clearAll: () => void;
}


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
                    state.nodes.push(node);
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
                    state.nodes = state.nodes.filter(n => !nodeIds.includes(n.id));
                    state.edges = state.edges.filter(e =>
                        !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
                    );
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
                    const prevData: Partial<EdgeData> = prev.data || {};

                    const merged: EdgeData = {
                        label: data.label ?? prevData.label ?? '',
                        lineStyle: data.lineStyle ?? prevData.lineStyle ?? 'solid',
                        lineWidth: data.lineWidth ?? prevData.lineWidth ?? 2,
                        lineColor: data.lineColor ?? prevData.lineColor ?? '#000000',
                        arrowStyle: data.arrowStyle ?? prevData.arrowStyle ?? 'none',
                        curveStyle: data.curveStyle ?? prevData.curveStyle ?? 'straight',
                        controlPointX:
                            data.controlPointX !== undefined
                                ? data.controlPointX
                                : prevData.controlPointX ?? undefined,
                        controlPointY:
                            data.controlPointY !== undefined
                                ? data.controlPointY
                                : prevData.controlPointY ?? undefined,
                    };

                    state.edges[edgeIndex] = {
                        ...prev,
                        data: merged,
                    };
                    state.unsavedChanges = true;
                }),






                deleteEdges: (edgeIds) => set((state) => {
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

                setIsInteracting: (value) => set((state) => { // ADD THIS
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
                    // Only track significant changes
                    return JSON.stringify(pastState) === JSON.stringify(currentState);
                },
                handleSet: (handleSet) =>
                    throttle<typeof handleSet>((state) => {
                        // Only record if not interacting
                        if (typeof state === 'object' && state !== null && 'isInteracting' in state && !(state as FlowState).isInteracting) {
                            handleSet(state);
                        }
                    }, 1000)
            }
        )
    )
);

// Create a hook that properly accesses the temporal store
export const useTemporalStore = () => {
    // Use a ref to cache the temporal store reference
    const temporalStoreRef = useRef((useFlowStore as any).temporal);
    const temporalStore = temporalStoreRef.current;

    // Create stable function references
    const undo = useCallback(() => {
        temporalStore.getState().undo();
    }, [temporalStore]);

    const redo = useCallback(() => {
        temporalStore.getState().redo();
    }, [temporalStore]);

    const clear = useCallback(() => {
        temporalStore.getState().clear();
    }, [temporalStore]);

    // Subscribe to temporal state with a stable selector
    const temporalState = useMemo(() => {
        const state = temporalStore.getState();
        return {
            canUndo: (state?.pastStates?.length || 0) > 0,
            canRedo: (state?.futureStates?.length || 0) > 0,
        };
    }, [temporalStore]);

    // Use a subscription for reactive updates
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