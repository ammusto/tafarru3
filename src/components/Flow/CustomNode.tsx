import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { NodeData } from '../../types';
import { formatNodeLabel } from '../../utils/nameFormatter';
import { useFlowStore } from '../../store/useFlowStore';

const handlePositions = [
    { id: 'top', position: Position.Top, style: { left: '50%', top: '0' } },
    { id: 'right', position: Position.Right, style: { top: '50%', right: '0' } },
    { id: 'bottom', position: Position.Bottom, style: { left: '50%', bottom: '0' } },
    { id: 'left', position: Position.Left, style: { top: '50%', left: '0' } },
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
            const snappedWidth = snapToGrid(nodeWidth);
            const snappedHeight = snapToGrid(nodeHeight);

            setDimensions({ width: snappedWidth, height: snappedHeight });
            updateNode(id, { width: snappedWidth, height: snappedHeight });
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

            // Raw dimension adjustment
            if (corner.includes('right')) {
                newWidth = resizeRef.current.startWidth + deltaX;
            }
            if (corner.includes('left')) {
                newWidth = resizeRef.current.startWidth - deltaX;
            }
            if (corner.includes('bottom')) {
                newHeight = resizeRef.current.startHeight + deltaY;
            }
            if (corner.includes('top')) {
                newHeight = resizeRef.current.startHeight - deltaY;
            }

            // Apply min size constraint before snapping
            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(30, newHeight);

            // Snap dimensions
            const snappedWidth = snapToGrid(newWidth);
            const snappedHeight = snapToGrid(newHeight);

            // Adjust position if resizing from top or left
            const widthDelta = snappedWidth - resizeRef.current.startWidth;
            const heightDelta = snappedHeight - resizeRef.current.startHeight;

            if (corner.includes('left')) {
                newX = snapToGrid(resizeRef.current.startPosX - widthDelta);
            }
            if (corner.includes('top')) {
                newY = snapToGrid(resizeRef.current.startPosY - heightDelta);
            }

            // Apply updates
            setDimensions({ width: snappedWidth, height: snappedHeight });

            requestAnimationFrame(() => {
                updateNode(id, { width: snappedWidth, height: snappedHeight });

                if (corner.includes('left') || corner.includes('top')) {
                    setNodes(nodes =>
                        nodes.map(n =>
                            n.id === id ? { ...n, position: { x: newX, y: newY } } : n
                        )
                    );
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
                            className="nodrag absolute w-1.5 h-1.5 bg-blue-500 -top-0.5 -left-0.5 cursor-nw-resize z-10"
                            onMouseDown={(e) => handleResize('top-left', e)}
                        />
                        <div
                            className="nodrag absolute w-1.5 h-1.5 bg-blue-500 -top-0.5 -right-0.5 cursor-ne-resize z-10"
                            onMouseDown={(e) => handleResize('top-right', e)}
                        />
                        <div
                            className="nodrag absolute w-1.5 h-1.5 bg-blue-500 -bottom-0.5 -left-0.5 cursor-sw-resize z-10"
                            onMouseDown={(e) => handleResize('bottom-left', e)}
                        />
                        <div
                            className="nodrag absolute w-1.5 h-1.5 bg-blue-500 -bottom-0.5 -right-0.5 cursor-se-resize z-10"
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