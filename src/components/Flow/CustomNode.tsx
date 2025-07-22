import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { NodeData } from '../../types';
import { formatNodeLabel } from '../../utils/nameFormatter';
import { useFlowStore } from '../../store/useFlowStore';

const handlePositions = [
    { id: 'top', position: Position.Top, style: { left: '50%', top: '-5px' } },
    { id: 'right', position: Position.Right, style: { top: '50%', right: '-5px' } },
    { id: 'bottom', position: Position.Bottom, style: { left: '50%', bottom: '-5px' } },
    { id: 'left', position: Position.Left, style: { top: '50%', left: '-5px' } },
];

export const CustomNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
    const { getNode, setNodes } = useReactFlow();
    const { updateNode, gridEnabled } = useFlowStore();
    const textRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [dimensions, setDimensions] = useState({
        width: data.width || undefined,
        height: data.height || undefined
    });
    const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0, startPosX: 0, startPosY: 0 });

    const label = formatNodeLabel(data);

    // Snap to grid helper
    const snapToGrid = useCallback((value: number) => {
        if (!gridEnabled) return value;
        return Math.round(value / 10) * 10;
    }, [gridEnabled]);

    // Auto-size on mount if no explicit dimensions
    useEffect(() => {
        if (!data.width && textRef.current) {
            const textRect = textRef.current.getBoundingClientRect();
            const nodeWidth = Math.min(Math.max(textRect.width + 24, 100), 200);
            const nodeHeight = textRect.height + 16;

            setDimensions({ width: nodeWidth, height: nodeHeight });
            updateNode(id, { width: nodeWidth, height: nodeHeight });
        }
    }, [id, data.width, updateNode]);

    const handleResize = useCallback((corner: string, event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        setIsResizing(true);

        const node = getNode(id);
        if (!node) return;

        // Store initial values
        resizeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startWidth: dimensions.width || 150,
            startHeight: dimensions.height || 50,
            startPosX: node.position.x,
            startPosY: node.position.y
        };

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - resizeRef.current.startX;
            const deltaY = e.clientY - resizeRef.current.startY;

            let newWidth = resizeRef.current.startWidth;
            let newHeight = resizeRef.current.startHeight;
            let newX = resizeRef.current.startPosX;
            let newY = resizeRef.current.startPosY;

            // Calculate raw dimensions
            if (corner.includes('right')) {
                newWidth = resizeRef.current.startWidth + deltaX;
            }
            if (corner.includes('left')) {
                const rawWidth = resizeRef.current.startWidth - deltaX;
                if (rawWidth >= 50) {
                    newWidth = rawWidth;
                    newX = resizeRef.current.startPosX + deltaX;
                }
            }
            if (corner.includes('bottom')) {
                newHeight = resizeRef.current.startHeight + deltaY;
            }
            if (corner.includes('top')) {
                const rawHeight = resizeRef.current.startHeight - deltaY;
                if (rawHeight >= 30) {
                    newHeight = rawHeight;
                    newY = resizeRef.current.startPosY + deltaY;
                }
            }

            // Apply minimum constraints first
            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(30, newHeight);

            // Then snap to grid
            const snappedWidth = snapToGrid(newWidth);
            const snappedHeight = snapToGrid(newHeight);

            // For position, calculate the delta from snapping
            if (corner.includes('left') && newX !== resizeRef.current.startPosX) {
                const widthDiff = snappedWidth - newWidth;
                newX = snapToGrid(newX - widthDiff);
            }
            if (corner.includes('top') && newY !== resizeRef.current.startPosY) {
                const heightDiff = snappedHeight - newHeight;
                newY = snapToGrid(newY - heightDiff);
            }

            // Update dimensions
            setDimensions({ width: snappedWidth, height: snappedHeight });

            // Batch updates
            requestAnimationFrame(() => {
                updateNode(id, { width: snappedWidth, height: snappedHeight });

                if ((corner.includes('left') || corner.includes('top')) &&
                    (newX !== node.position.x || newY !== node.position.y)) {
                    setNodes(nodes => nodes.map(n =>
                        n.id === id ? { ...n, position: { x: newX, y: newY } } : n
                    ));
                }
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [id, dimensions, getNode, updateNode, setNodes, snapToGrid]);

    const nodeStyle: React.CSSProperties = {
        width: dimensions.width || 'auto',
        height: dimensions.height || 'auto',
        minWidth: 50,
        minHeight: 30,
        backgroundColor: data.nodeFillColor,
        border: `${data.borderWidth}px ${data.borderStyle} ${data.borderColor}`,
        borderRadius: data.nodeShape === 'rounded' ? 8 : 0,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isResizing ? 'grabbing' : 'grab',
        userSelect: 'none',
    };

    const textStyle: React.CSSProperties = {
        fontSize: '14px',
        fontFamily: "'Segoe UI', 'Arial', sans-serif",
        color: 'black',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: dimensions.width ? 'normal' : 'nowrap',
        wordBreak: 'break-word',
        maxWidth: '100%',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: Math.floor((dimensions.height || 50) / 20),
        WebkitBoxOrient: 'vertical',
        pointerEvents: 'none',
    };

    return (
        <>
            <div style={nodeStyle} title={data.biography}>
                <div ref={textRef} style={textStyle}>
                    {label}
                </div>

                {/* Resize handles - only visible when selected */}
                {selected && (
                    <>
                        <div
                            className="nodrag absolute w-3 h-3 bg-blue-500 -top-1.5 -left-1.5 cursor-nw-resize z-10"
                            onMouseDown={(e) => handleResize('top-left', e)}
                        />
                        <div
                            className="nodrag absolute w-3 h-3 bg-blue-500 -top-1.5 -right-1.5 cursor-ne-resize z-10"
                            onMouseDown={(e) => handleResize('top-right', e)}
                        />
                        <div
                            className="nodrag absolute w-3 h-3 bg-blue-500 -bottom-1.5 -left-1.5 cursor-sw-resize z-10"
                            onMouseDown={(e) => handleResize('bottom-left', e)}
                        />
                        <div
                            className="nodrag absolute w-3 h-3 bg-blue-500 -bottom-1.5 -right-1.5 cursor-se-resize z-10"
                            onMouseDown={(e) => handleResize('bottom-right', e)}
                        />
                    </>
                )}
            </div>

            {/* Connection handles */}
            {handlePositions.map((handle) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type="source"
                    position={handle.position}
                    style={handle.style}
                    className={`node-anchor ${selected ? 'opacity-100' : ''}`}
                />
            ))}
            {handlePositions.map((handle) => (
                <Handle
                    key={`target-${handle.id}`}
                    id={handle.id}
                    type="target"
                    position={handle.position}
                    style={handle.style}
                    className={`node-anchor ${selected ? 'opacity-100' : ''}`}
                />
            ))}
        </>
    );
});

CustomNode.displayName = 'CustomNode';