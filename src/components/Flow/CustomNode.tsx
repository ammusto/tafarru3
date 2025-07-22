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
    { id: 'top-left', position: Position.Top, style: { left: '20%' } },
    { id: 'top-right', position: Position.Top, style: { left: '80%' } },
    { id: 'bottom-left', position: Position.Bottom, style: { left: '20%' } },
    { id: 'bottom-right', position: Position.Bottom, style: { left: '80%' } },
];

export const CustomNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
    const { getNode, setNodes } = useReactFlow();
    const updateNode = useFlowStore(state => state.updateNode);
    const textRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    const label = formatNodeLabel(data);

    // Auto-size on mount if no explicit dimensions
    useEffect(() => {
        if (!data.width && textRef.current) {
            const { width, height } = textRef.current.getBoundingClientRect();
            const nodeWidth = Math.min(Math.max(width + 24, 100), 200); // Min 100, max 200
            const nodeHeight = height + 16;

            setNodes(nodes => nodes.map(node =>
                node.id === id
                    ? { ...node, data: { ...node.data, width: nodeWidth, height: nodeHeight } }
                    : node
            ));
        }
    }, [id, data.width, setNodes]);

    const handleResize = useCallback((corner: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setIsResizing(true);

        const node = getNode(id);
        if (!node) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = data.width || 150;
        const startHeight = data.height || 50;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;

            if (corner.includes('right')) newWidth = startWidth + deltaX;
            if (corner.includes('left')) newWidth = startWidth - deltaX;
            if (corner.includes('bottom')) newHeight = startHeight + deltaY;
            if (corner.includes('top')) newHeight = startHeight - deltaY;

            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(30, newHeight);

            updateNode(id, { width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [id, data.width, data.height, getNode, updateNode]);

    const nodeStyle: React.CSSProperties = {
        width: data.width || 'auto',
        height: data.height || 'auto',
        minWidth: 50,
        minHeight: 30,
        backgroundColor: data.nodeFillColor,
        border: `${data.borderWidth}px ${data.borderStyle} ${data.borderColor}`,
        borderRadius: data.nodeShape === 'rounded' ? 8 : 0,
        padding: data.width ? '8px 12px' : '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isResizing ? 'grabbing' : 'grab',
    };

    const textStyle: React.CSSProperties = {
        fontSize: '14px',
        fontFamily: "'Segoe UI', 'Arial', sans-serif",
        color: 'black',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: data.width ? 'normal' : 'nowrap',
        wordBreak: 'break-word',
        maxWidth: '100%',
        lineHeight: 1.4,
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
                            className="absolute w-2 h-2 bg-blue-500 -top-1 -left-1 cursor-nw-resize"
                            onMouseDown={(e) => handleResize('top-left', e)}
                        />
                        <div
                            className="absolute w-2 h-2 bg-blue-500 -top-1 -right-1 cursor-ne-resize"
                            onMouseDown={(e) => handleResize('top-right', e)}
                        />
                        <div
                            className="absolute w-2 h-2 bg-blue-500 -bottom-1 -left-1 cursor-sw-resize"
                            onMouseDown={(e) => handleResize('bottom-left', e)}
                        />
                        <div
                            className="absolute w-2 h-2 bg-blue-500 -bottom-1 -right-1 cursor-se-resize"
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