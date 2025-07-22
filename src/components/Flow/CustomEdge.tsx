import React, { memo, useMemo, useState, useCallback } from 'react';
import {
    EdgeProps,
    getSmoothStepPath,
    getStraightPath,
    Position,
    EdgeLabelRenderer,
} from 'reactflow';
import { EdgeData } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';

const NODE_PADDING = 0;

function applyPositionOffset(x: number, y: number, position: Position, offset: number): [number, number] {
    switch (position) {
        case Position.Top: return [x, y - offset];
        case Position.Bottom: return [x, y + offset];
        case Position.Left: return [x - offset, y];
        case Position.Right: return [x + offset, y];
        default: return [x, y];
    }
}

export const CustomEdge = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    style,
    interactionWidth = 20,
}: EdgeProps<EdgeData>) => {
    const { updateEdge } = useFlowStore();
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);

    const roundedSourceX = Math.round(sourceX);
    const roundedSourceY = Math.round(sourceY);
    const roundedTargetX = Math.round(targetX);
    const roundedTargetY = Math.round(targetY);

    const [edgePath, labelX, labelY, controlPointX, controlPointY] = useMemo(() => {
        const [adjSourceX, adjSourceY] = applyPositionOffset(roundedSourceX, roundedSourceY, sourcePosition, NODE_PADDING);
        const [adjTargetX, adjTargetY] = applyPositionOffset(roundedTargetX, roundedTargetY, targetPosition, NODE_PADDING);

        if (data?.curveStyle === 'curve') {
            const cpX = data.controlPointX ?? Math.round((adjSourceX + adjTargetX) / 2);
            const cpY = data.controlPointY ?? Math.round((adjSourceY + adjTargetY) / 2);
            const path = `M ${adjSourceX},${adjSourceY} Q ${cpX},${cpY} ${adjTargetX},${adjTargetY}`;
            return [path, Math.round((adjSourceX + adjTargetX) / 2), Math.round((adjSourceY + adjTargetY) / 2), cpX, cpY];
        }

        if (data?.curveStyle === 'elbow') {
            const [path, labelX, labelY] = getSmoothStepPath({
                sourceX: adjSourceX,
                sourceY: adjSourceY,
                targetX: adjTargetX,
                targetY: adjTargetY,
                sourcePosition,
                targetPosition,
            });
            return [path, Math.round(labelX), Math.round(labelY), null, null];
        }

        const [path, labelX, labelY] = getStraightPath({
            sourceX: adjSourceX,
            sourceY: adjSourceY,
            targetX: adjTargetX,
            targetY: adjTargetY,
        });
        return [path, Math.round(labelX), Math.round(labelY), null, null];
    }, [
        data?.curveStyle,
        data?.controlPointX,
        data?.controlPointY,
        roundedSourceX,
        roundedSourceY,
        roundedTargetX,
        roundedTargetY,
        sourcePosition,
        targetPosition,
    ]);

    const strokeDasharray = useMemo(() => {
        if (data?.lineStyle === 'dashed') return '5,5';
        if (data?.lineStyle === 'dotted') return '2,2';
        return undefined;
    }, [data?.lineStyle]);

    const customMarkerEnd = useMemo(() => {
        if (data?.arrowStyle === 'end' || data?.arrowStyle === 'both') {
            return `url(#arrow-${id}-end)`;
        }
        return undefined;
    }, [data?.arrowStyle, id]);

    const customMarkerStart = useMemo(() => {
        if (data?.arrowStyle === 'start' || data?.arrowStyle === 'both') {
            return `url(#arrow-${id}-start)`;
        }
        return undefined;
    }, [data?.arrowStyle, id]);

    const handleControlPointDrag = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        setIsDraggingHandle(true);

        const startX = event.clientX;
        const startY = event.clientY;
        const startControlX = controlPointX!;
        const startControlY = controlPointY!;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            updateEdge(id, {
                ...data,
                controlPointX: Math.round(startControlX + deltaX),
                controlPointY: Math.round(startControlY + deltaY),
            });
        };

        const handleMouseUp = () => {
            setIsDraggingHandle(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [id, controlPointX, controlPointY, data, updateEdge]);

    const showHandle = selected && data?.curveStyle === 'curve';

    return (
        <>
            <defs>
                {(data?.arrowStyle === 'end' || data?.arrowStyle === 'both') && (
                    <marker
                        id={`arrow-${id}-end`}
                        viewBox="0 -5 10 10"
                        refX="10"
                        refY="0"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto"
                    >
                        <path d="M0,-5L10,0L0,5" fill={data?.lineColor || '#b1b1b7'} />
                    </marker>
                )}
                {(data?.arrowStyle === 'start' || data?.arrowStyle === 'both') && (
                    <marker
                        id={`arrow-${id}-start`}
                        viewBox="0 -5 10 10"
                        refX="0"
                        refY="0"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto-start-reverse"
                    >
                        <path d="M10,-5L0,0L10,5" fill={data?.lineColor || '#b1b1b7'} />
                    </marker>
                )}
            </defs>

            <path
                className="react-flow__edge-interaction"
                d={edgePath}
                strokeWidth={interactionWidth}
                stroke="transparent"
                fill="none"
                style={{ cursor: 'pointer' }}
            />

            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                strokeWidth={data?.lineWidth || 2}
                stroke={selected ? '#555' : (data?.lineColor || '#b1b1b7')}
                strokeDasharray={strokeDasharray}
                fill="none"
                markerEnd={customMarkerEnd}
                markerStart={customMarkerStart}
                style={style}
            />

            {data?.label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: 12,
                            background: 'white',
                            padding: '2px 4px',
                            borderRadius: 3,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        {data.label}
                    </div>
                </EdgeLabelRenderer>
            )}

            {showHandle && controlPointX != null && controlPointY != null && (
                <g>
                    <circle
                        cx={controlPointX}
                        cy={controlPointY}
                        r={8}
                        fill="#ff0073"
                        stroke="white"
                        strokeWidth={2}
                        className="react-flow__edge-control-point"
                        onMouseDown={handleControlPointDrag}
                        style={{
                            cursor: isDraggingHandle ? 'grabbing' : 'grab',
                            pointerEvents: 'all', 
                        }}
                    />
                </g>
            )}
        </>
    );
});

CustomEdge.displayName = 'CustomEdge';
