import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import {
    EdgeProps,
    getSmoothStepPath,
    getStraightPath,
    Position,
    EdgeLabelRenderer,
} from 'reactflow';
import { EdgeData } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';

const NODE_PADDING = 1;

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


    const [edgePath, labelX, labelY, controlPointX, controlPointY] = useMemo(() => {
        const [adjSourceX, adjSourceY] = applyPositionOffset(sourceX, sourceY, sourcePosition, NODE_PADDING);
        const [adjTargetX, adjTargetY] = applyPositionOffset(targetX, targetY, targetPosition, NODE_PADDING);

        // force directionality: path must start at source and go to target
        const fromX = adjSourceX;
        const fromY = adjSourceY;
        const toX = adjTargetX;
        const toY = adjTargetY;

        if (data?.curveStyle === 'curve') {
            const cpX = data.controlPointX ?? Math.round((fromX + toX) / 2);
            const cpY = data.controlPointY ?? Math.round((fromY + toY) / 2);
            const path = `M ${fromX},${fromY} Q ${cpX},${cpY} ${toX},${toY}`;
            return [path, Math.round((fromX + toX) / 2), Math.round((fromY + toY) / 2), cpX, cpY];
        }

        if (data?.curveStyle === 'elbow') {
            const [path, labelX, labelY] = getSmoothStepPath({
                sourceX: fromX,
                sourceY: fromY,
                targetX: toX,
                targetY: toY,
                sourcePosition,
                targetPosition,
            });
            return [path, Math.round(labelX), Math.round(labelY), null, null];
        }

        const [path, labelX, labelY] = getStraightPath({
            sourceX: fromX,
            sourceY: fromY,
            targetX: toX,
            targetY: toY,
        });
        return [path, Math.round(labelX), Math.round(labelY), null, null];
    }, [
        data?.curveStyle,
        data?.controlPointX,
        data?.controlPointY,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    ]);

    useEffect(() => {
        if (
            data?.curveStyle === 'curve' &&
            (data.controlPointX === undefined || data.controlPointY === undefined)
        ) {
            const cpX = Math.round((sourceX + targetX) / 2);
            const cpY = Math.round((sourceY + targetY) / 2);
            updateEdge(id, { controlPointX: cpX, controlPointY: cpY });
        }
    }, [id, data, sourceX, sourceY, targetX, targetY, updateEdge]);

    const strokeDasharray = useMemo(() => {
        if (data?.lineStyle === 'dashed') return '5,5';
        if (data?.lineStyle === 'dotted') return '2,2';
        return undefined;
    }, [data?.lineStyle]);

    const customMarkerStart = useMemo(() => {
        if (data?.arrowStyle === 'start' || data?.arrowStyle === 'both') {
            return `url(#arrow-${id}-start)`;

        }
        return undefined;
    }, [data?.arrowStyle, id]);
    const customMarkerEnd = useMemo(() => {
        if (data?.arrowStyle === 'end' || data?.arrowStyle === 'both') {
            return `url(#arrow-${id}-end)`;
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
                <marker
                    id={`arrow-${id}-start`}
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={data?.lineColor || '#b1b1b7'} />
                </marker>

                <marker
                    id={`arrow-${id}-end`}
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={data?.lineColor || '#b1b1b7'} />
                </marker>
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
