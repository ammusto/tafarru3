import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    useReactFlow,
    ConnectionMode,
    NodeMouseHandler,
    SelectionMode,
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
    const canvasRef = useRef<HTMLDivElement>(null);

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
        setMode,
    } = useFlowStore();

    // Handle canvas click based on mode
    const handleCanvasClick = useCallback((event: React.MouseEvent) => {
        if (mode === 'node') {
            const bounds = canvasRef.current?.getBoundingClientRect();
            if (!bounds) return;

            const position = reactFlowInstance.project({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            const newNode = {
                id: `node-${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    label: 'New Node',
                    nodeShape: 'rectangle' as const,
                    nodeFillColor: 'white',
                    borderStyle: 'solid' as const,
                    borderWidth: 2,
                    borderColor: 'black',
                } as NodeData,
            };

            addNode(newNode);
            setMode('select');
            setSelectedNodes([newNode.id]);
        }
    }, [mode, reactFlowInstance, addNode, setMode, setSelectedNodes]);

    const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
        event.stopPropagation();
        if (mode === 'select') {
            setSelectedNodes([node.id]);
            setSelectedEdges([]);
        }
    }, [mode, setSelectedNodes, setSelectedEdges]);

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
        setSelectedNodes(nodes.map((n: any) => n.id));
        setSelectedEdges(edges.map((e: any) => e.id));
    }, [setSelectedNodes, setSelectedEdges]);

    // Change cursor based on mode
    useEffect(() => {
        if (canvasRef.current) {
            if (mode === 'node') {
                canvasRef.current.style.cursor = 'crosshair';
            } else if (mode === 'edge') {
                canvasRef.current.style.cursor = 'crosshair';
            } else {
                canvasRef.current.style.cursor = 'default';
            }
        }
    }, [mode]);

    return (
        <div ref={canvasRef} className="w-full h-full" onClick={handleCanvasClick}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                onSelectionChange={handleSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                selectionMode={SelectionMode.Partial}
                snapToGrid={gridEnabled}
                snapGrid={[10, 10]}
                defaultEdgeOptions={{
                    type: 'custom',
                    data: {
                        lineStyle: 'solid',
                        lineWidth: 2,
                        lineColor: '#b1b1b7',
                        arrowStyle: 'end',
                        curveStyle: 'straight',
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