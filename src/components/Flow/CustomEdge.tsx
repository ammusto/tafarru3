import React, { memo, useMemo, useState, useCallback } from 'react';
import {
    EdgeProps,
    getSmoothStepPath,
    getStraightPath,
    Position,
    getBezierPath,
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
    const [isDraggingHandle, setIsDraggingHandle] = useState<string | null>(null);

    const roundedSourceX = Math.round(sourceX);
    const roundedSourceY = Math.round(sourceY);
    const roundedTargetX = Math.round(targetX);
    const roundedTargetY = Math.round(targetY);

    const [edgePath, labelX, labelY, controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y] = useMemo(() => {
        const [adjSourceX, adjSourceY] = applyPositionOffset(roundedSourceX, roundedSourceY, sourcePosition, NODE_PADDING);
        const [adjTargetX, adjTargetY] = applyPositionOffset(roundedTargetX, roundedTargetY, targetPosition, NODE_PADDING);

        if (data?.curveStyle === 'bezier') {
            // Manual bezier with two draggable handles
            const midX = (adjSourceX + adjTargetX) / 2;
            const midY = (adjSourceY + adjTargetY) / 2;

            const dx = adjTargetX - adjSourceX;
            const dy = adjTargetY - adjSourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offset = Math.min(100, distance * 0.3);

            const cp1X = data.controlPoint1X ?? Math.round(adjSourceX + dx * 0.25 + (dy / distance) * offset);
            const cp1Y = data.controlPoint1Y ?? Math.round(adjSourceY + dy * 0.25 - (dx / distance) * offset);
            const cp2X = data.controlPoint2X ?? Math.round(adjTargetX - dx * 0.25 - (dy / distance) * offset);
            const cp2Y = data.controlPoint2Y ?? Math.round(adjTargetY - dy * 0.25 + (dx / distance) * offset);

            const path = `M ${adjSourceX},${adjSourceY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${adjTargetX},${adjTargetY}`;
            return [path, Math.round(midX), Math.round(midY), cp1X, cp1Y, cp2X, cp2Y];
        }

        if (data?.curveStyle === 'curve') {
            // Check if nodes are on same side and vertically/horizontally aligned
            const isSameSide = sourcePosition === targetPosition;
            const isVerticallyAligned = Math.abs(adjSourceX - adjTargetX) < 10;
            const isHorizontallyAligned = Math.abs(adjSourceY - adjTargetY) < 10;

            if (isSameSide && (isVerticallyAligned || isHorizontallyAligned)) {
                // Create custom curve for same-side connections
                const dx = adjTargetX - adjSourceX;
                const dy = adjTargetY - adjSourceY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let offset = Math.min(50, distance * 0.5);

                // Determine offset direction based on which side we're on
                let offsetX = 0, offsetY = 0;
                switch (sourcePosition) {
                    case Position.Left:
                        offsetX = -offset;
                        break;
                    case Position.Right:
                        offsetX = offset;
                        break;
                    case Position.Top:
                        offsetY = -offset;
                        break;
                    case Position.Bottom:
                        offsetY = offset;
                        break;
                }

                // Create control points that bow out from the edge
                const cp1X = adjSourceX + offsetX;
                const cp1Y = adjSourceY + (dy * 0.25);
                const cp2X = adjTargetX + offsetX;
                const cp2Y = adjTargetY - (dy * 0.25);

                const path = `M ${adjSourceX},${adjSourceY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${adjTargetX},${adjTargetY}`;
                const labelX = Math.round((adjSourceX + adjTargetX) / 2 + offsetX * 0.5);
                const labelY = Math.round((adjSourceY + adjTargetY) / 2);

                return [path, labelX, labelY, null, null, null, null];
            } else {
                // Use ReactFlow's default bezier curve for normal connections
                const [path, labelX, labelY] = getBezierPath({
                    sourceX: adjSourceX,
                    sourceY: adjSourceY,
                    targetX: adjTargetX,
                    targetY: adjTargetY,
                    sourcePosition,
                    targetPosition,
                });
                return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
            }
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
            return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
        }

        // Default straight line
        const [path, labelX, labelY] = getStraightPath({
            sourceX: adjSourceX,
            sourceY: adjSourceY,
            targetX: adjTargetX,
            targetY: adjTargetY,
        });
        return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
    }, [
        data?.curveStyle,
        data?.controlPoint1X,
        data?.controlPoint1Y,
        data?.controlPoint2X,
        data?.controlPoint2Y,
        roundedSourceX,
        roundedSourceY,
        roundedTargetX,
        roundedTargetY,
        sourcePosition,
        targetPosition,
    ]);

    const handleControlPointDrag = useCallback((controlPointId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setIsDraggingHandle(controlPointId);

        const startX = event.clientX;
        const startY = event.clientY;
        const startControlX = controlPointId === 'cp1' ? controlPoint1X! : controlPoint2X!;
        const startControlY = controlPointId === 'cp1' ? controlPoint1Y! : controlPoint2Y!;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (controlPointId === 'cp1') {
                updateEdge(id, {
                    ...data,
                    controlPoint1X: Math.round(startControlX + deltaX),
                    controlPoint1Y: Math.round(startControlY + deltaY),
                });
            } else {
                updateEdge(id, {
                    ...data,
                    controlPoint2X: Math.round(startControlX + deltaX),
                    controlPoint2Y: Math.round(startControlY + deltaY),
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingHandle(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [id, controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y, data, updateEdge]);

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

    const showHandles = selected && data?.curveStyle === 'bezier';

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
                        orient="auto"
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

            {showHandles && controlPoint1X != null && controlPoint1Y != null && (
                <g style={{ pointerEvents: 'all' }}>
                    {/* First control point */}
                    <circle
                        cx={controlPoint1X}
                        cy={controlPoint1Y}
                        r={6}
                        fill="#ff0073"
                        stroke="white"
                        strokeWidth={2}
                        className="react-flow__edge-control-point"
                        onMouseDown={(e) => handleControlPointDrag('cp1', e)}
                        style={{
                            cursor: isDraggingHandle === 'cp1' ? 'grabbing' : 'grab',
                            pointerEvents: 'all',
                            position: 'relative',
                            zIndex: 1000,
                        }}
                    />
                    {/* Second control point */}
                    {controlPoint2X != null && controlPoint2Y != null && (
                        <circle
                            cx={controlPoint2X}
                            cy={controlPoint2Y}
                            r={6}
                            fill="#00ff73"
                            stroke="white"
                            strokeWidth={2}
                            className="react-flow__edge-control-point"
                            onMouseDown={(e) => handleControlPointDrag('cp2', e)}
                            style={{
                                cursor: isDraggingHandle === 'cp2' ? 'grabbing' : 'grab',
                                pointerEvents: 'all',
                                position: 'relative',
                                zIndex: 1000,
                            }}
                        />
                    )}
                </g>
            )}
        </>
    );
});

CustomEdge.displayName = 'CustomEdge';