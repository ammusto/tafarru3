import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { NodeData } from '../../types';
import { formatNodeLabel } from '../../utils/nameFormatter';
import { useFlowStore } from '../../store/useFlowStore';

const handlePositions = [
    { id: 'top', position: Position.Top, style: { left: '50%' } },
    { id: 'right', position: Position.Right, style: { top: '50%' } },
    { id: 'bottom', position: Position.Bottom, style: { left: '50%' } },
    { id: 'left', position: Position.Left, style: { top: '50%' } },
];

export const CustomNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
    const { getNode, setNodes } = useReactFlow();
    const updateNode = useFlowStore(state => state.updateNode);
    const textRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [dimensions, setDimensions] = useState({
        width: data.width || undefined,
        height: data.height || undefined
    });

    const label = formatNodeLabel(data);

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

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = dimensions.width || 150;
        const startHeight = dimensions.height || 50;
        const startPosX = node.position.x;
        const startPosY = node.position.y;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startPosX;
            let newY = startPosY;

            if (corner.includes('right')) {
                newWidth = Math.max(50, startWidth + deltaX);
            }
            if (corner.includes('left')) {
                newWidth = Math.max(50, startWidth - deltaX);
                newX = startPosX + deltaX;
            }
            if (corner.includes('bottom')) {
                newHeight = Math.max(30, startHeight + deltaY);
            }
            if (corner.includes('top')) {
                newHeight = Math.max(30, startHeight - deltaY);
                newY = startPosY + deltaY;
            }

            setDimensions({ width: newWidth, height: newHeight });
            updateNode(id, { width: newWidth, height: newHeight });

            // Update position if resizing from left or top
            if (corner.includes('left') || corner.includes('top')) {
                setNodes(nodes => nodes.map(n =>
                    n.id === id ? { ...n, position: { x: newX, y: newY } } : n
                ));
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [id, dimensions, getNode, updateNode, setNodes]);

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
                            className="absolute w-3 h-3 bg-blue-500 -top-1.5 -left-1.5 cursor-nw-resize z-10"
                            onMouseDown={(e) => handleResize('top-left', e)}
                        />
                        <div
                            className="absolute w-3 h-3 bg-blue-500 -top-1.5 -right-1.5 cursor-ne-resize z-10"
                            onMouseDown={(e) => handleResize('top-right', e)}
                        />
                        <div
                            className="absolute w-3 h-3 bg-blue-500 -bottom-1.5 -left-1.5 cursor-sw-resize z-10"
                            onMouseDown={(e) => handleResize('bottom-left', e)}
                        />
                        <div
                            className="absolute w-3 h-3 bg-blue-500 -bottom-1.5 -right-1.5 cursor-se-resize z-10"
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