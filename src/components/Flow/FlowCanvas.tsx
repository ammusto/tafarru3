import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    useReactFlow,
    ConnectionMode,
    NodeMouseHandler,
    SelectionMode,
    Connection,
    OnConnectStartParams,
    updateEdge,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '../../store/useFlowStore';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { NodeData, EdgeData } from '../../types';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

export function FlowCanvas() {
    const reactFlowInstance = useReactFlow();
    const { shouldFitView, setShouldFitView } = useFlowStore();
    const canvasRef = useRef<HTMLDivElement>(null);
    const { setIsInteracting } = useFlowStore();
    const edgeUpdateSuccessful = useRef(true);

    const [connectStartParams, setConnectStartParams] = useState<OnConnectStartParams | null>(null);

    const {
        nodes,
        edges,
        mode,
        gridEnabled,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setSelectedNodes,
        setSelectedEdges,
        clearSelection,
        getNextNodeId,
        selectedNodes,
    } = useFlowStore();

    const onConnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
        setConnectStartParams(params);
    }, []);

    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        setConnectStartParams(null);
    }, []);

    // Handle edge updates (dragging endpoints)
    const onEdgeUpdateStart = useCallback(() => {
        edgeUpdateSuccessful.current = false;
    }, []);

    const onEdgeUpdate = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            edgeUpdateSuccessful.current = true;
            const updatedEdges = updateEdge(oldEdge, newConnection, edges);
            onEdgesChange(updatedEdges.map(edge => ({ type: 'reset', item: edge })));
        },
        [edges, onEdgesChange]
    );

    const onEdgeUpdateEnd = useCallback(
        (_: any, edge: Edge) => {
            if (!edgeUpdateSuccessful.current) {
                // If update failed, you could delete the edge or restore it
                // For now, we'll just leave it as is
            }
            edgeUpdateSuccessful.current = true;
        },
        []
    );

    const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
        event.stopPropagation();
        if (mode === 'select') {
            // Handle multi-selection with Shift key
            if (event.shiftKey) {
                const newSelection = selectedNodes.includes(node.id)
                    ? selectedNodes.filter(id => id !== node.id)
                    : [...selectedNodes, node.id];
                setSelectedNodes(newSelection);
            } else {
                setSelectedNodes([node.id]);
            }
            setSelectedEdges([]);
        }
    }, [mode, selectedNodes, setSelectedNodes, setSelectedEdges]);

    useEffect(() => {
        if (shouldFitView && nodes.length > 0) {
            // Small delay to ensure positions are updated
            setTimeout(() => {
                reactFlowInstance.fitView({ padding: 0.1 });
                setShouldFitView(false); // Reset the flag
            }, 0);
        }
    }, [shouldFitView, nodes.length, reactFlowInstance, setShouldFitView]);


    const handleEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
        event.stopPropagation();
        if (mode === 'select') {
            setSelectedEdges([edge.id]);
            setSelectedNodes([]);
        }
    }, [mode, setSelectedEdges, setSelectedNodes]);

    const handlePaneClick = useCallback(() => {
        if (mode === 'select') {
            clearSelection();
        }
    }, [mode, clearSelection]);

    const handleSelectionChange = useCallback(({ nodes, edges }: any) => {
        // Only update if actually different to prevent flicker
        const newNodeIds = nodes.map((n: any) => n.id);
        const newEdgeIds = edges.map((e: any) => e.id);

        setSelectedNodes(newNodeIds);
        setSelectedEdges(newEdgeIds);
    }, [setSelectedNodes, setSelectedEdges]);

    // Change cursor based on mode
    useEffect(() => {
        const renderer = canvasRef.current?.querySelector('.react-flow__renderer');
        if (renderer) {
            if (mode === 'node') {
                renderer.classList.add('node-mode');
            } else {
                renderer.classList.remove('node-mode');
            }
        }
    }, [mode]);

    return (
        <div ref={canvasRef} className="w-full h-full bg-white">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}

                onPaneClick={(event) => {
                    if (mode === 'node') {
                        // Get the React Flow bounds
                        const bounds = canvasRef.current?.getBoundingClientRect();
                        if (!bounds) return;

                        // Project screen click to canvas coordinates
                        let position = reactFlowInstance.project({
                            x: event.clientX - bounds.left,
                            y: event.clientY - bounds.top,
                        });

                        // Default dimensions for new node
                        const defaultWidth = 120;
                        const defaultHeight = 40;

                        // Adjust position to center the node at click point
                        position = {
                            x: position.x - defaultWidth / 2,
                            y: position.y - defaultHeight / 2
                        };

                        // Snap to grid if enabled
                        if (gridEnabled) {
                            position = {
                                x: Math.round(position.x / 10) * 10,
                                y: Math.round(position.y / 10) * 10
                            };
                        }

                        const newNode = {
                            id: getNextNodeId(),
                            type: 'custom',
                            position,
                            data: {
                                label: 'New Node',
                                nodeShape: 'rounded' as const,
                                nodeFillColor: 'white',
                                borderStyle: 'solid' as const,
                                borderWidth: 1,
                                borderColor: 'black',
                                width: defaultWidth,
                                height: defaultHeight,
                            },
                        };
                        addNode(newNode);
                        setSelectedNodes([newNode.id]);
                    } else {
                        handlePaneClick();
                    }
                }}
                onSelectionChange={handleSelectionChange}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodeDragStart={() => setIsInteracting(true)}
                onNodeDragStop={() => setIsInteracting(false)}
                onSelectionDragStart={() => setIsInteracting(true)}
                onSelectionDragStop={() => setIsInteracting(false)}
                onEdgeUpdate={onEdgeUpdate}
                onEdgeUpdateStart={onEdgeUpdateStart}
                onEdgeUpdateEnd={onEdgeUpdateEnd}
                edgesUpdatable={true}
                edgesFocusable={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                selectionMode={SelectionMode.Partial}
                multiSelectionKeyCode="Shift"
                snapToGrid={gridEnabled}
                snapGrid={[10, 10]}
                panOnDrag={mode !== 'node'}
                panOnScroll={mode !== 'node'}
                selectionOnDrag={mode !== 'node'}
                defaultEdgeOptions={{
                    type: 'custom',
                    data: {
                        lineStyle: 'solid',
                        lineWidth: 2,
                        lineColor: '#b1b1b7',
                        arrowStyle: 'end',
                        curveStyle: 'curve',
                    } as EdgeData,
                }}
                fitView
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={10}
                    size={1}
                    color="#e5e7eb"
                />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}