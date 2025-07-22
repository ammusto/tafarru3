import { create } from 'zustand';
import { Node, Edge, Connection, EdgeChange, NodeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { temporal, TemporalState } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { NodeData, EdgeData, EditorMode } from '../types';

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

    // Import/Export
    importData: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;
    clearAll: () => void;
}

export const useFlowStore = create<FlowState>()(
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
                state.nodes = applyNodeChanges(changes, state.nodes);
                state.unsavedChanges = true;
            }),

            onEdgesChange: (changes) => set((state) => {
                state.edges = applyEdgeChanges(changes, state.edges);
                state.unsavedChanges = true;
            }),

            onConnect: (connection) => set((state) => {
                const newEdge: Edge<EdgeData> = {
                    id: `e${connection.source}-${connection.target}`,
                    source: connection.source!,
                    target: connection.target!,
                    sourceHandle: connection.sourceHandle || undefined,
                    targetHandle: connection.targetHandle || undefined,
                    type: 'custom',
                    data: {
                        lineStyle: 'solid',
                        lineWidth: 2,
                        lineColor: '#gray',
                        arrowStyle: 'end',
                        curveStyle: 'straight'
                    }
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
                const edge = state.edges.find(e => e.id === edgeId);
                if (edge) {
                    edge.data = { ...edge.data, ...data };
                    state.unsavedChanges = true;
                }
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
            })
        }
    )
);

// Create a separate hook for temporal features
export const useTemporalStore = <T extends (...args: any[]) => any>() => {
    const store = useFlowStore as TemporalState<ReturnType<T>>;
    return {
        undo: () => store.temporal.getState().undo(),
        redo: () => store.temporal.getState().redo(),
        clear: () => store.temporal.getState().clear(),
        canUndo: store.temporal.getState().canUndo,
        canRedo: store.temporal.getState().canRedo,
    };
};