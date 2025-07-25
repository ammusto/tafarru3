import React, { memo, useMemo, useState, useCallback } from 'react';
import {
    EdgeProps,
    getSmoothStepPath,
    getStraightPath,
    Position,
    getBezierPath,
    EdgeLabelRenderer,
    useStore,
    internalsSymbol,
} from 'reactflow';
import { EdgeData } from '../../types';
import { useFlowStore } from '../../store/useFlowStore';


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

    // Get the edge and nodes from the store to access handle information
    const store = useStore((store) => ({
        edge: store.edges.find((e) => e.id === id),
        sourceNode: store.nodeInternals.get(store.edges.find((e) => e.id === id)?.source || ''),
        targetNode: store.nodeInternals.get(store.edges.find((e) => e.id === id)?.target || ''),
    }));

    // Calculate actual handle positions
    const NODE_PADDING = 2; // Set your desired padding value

    // In the useMemo where we calculate actual positions, apply padding after getting handle coordinates:
    const { actualSourceX, actualSourceY, actualTargetX, actualTargetY, actualSourcePosition, actualTargetPosition } = useMemo(() => {
        let sX = sourceX;
        let sY = sourceY;
        let tX = targetX;
        let tY = targetY;
        let sPos = sourcePosition;
        let tPos = targetPosition;

        // If we have source handle info, get its actual position
        if (store.edge?.sourceHandle && store.sourceNode) {
            const sourceHandleElement = store.sourceNode[internalsSymbol]?.handleBounds?.source?.find(
                (h) => h.id === store.edge?.sourceHandle
            );
            if (sourceHandleElement) {
                sX = store.sourceNode.position.x + sourceHandleElement.x + (sourceHandleElement.width ?? 0) / 2;
                sY = store.sourceNode.position.y + sourceHandleElement.y + (sourceHandleElement.height ?? 0) / 2;
                sPos = sourceHandleElement.position || sourcePosition;
            }
        }

        // If we have target handle info, get its actual position
        if (store.edge?.targetHandle && store.targetNode) {
            const targetHandleElement = store.targetNode[internalsSymbol]?.handleBounds?.target?.find(
                (h) => h.id === store.edge?.targetHandle
            );
            if (targetHandleElement) {
                tX = store.targetNode.position.x + targetHandleElement.x + (targetHandleElement.width ?? 0) / 2;
                tY = store.targetNode.position.y + targetHandleElement.y + (targetHandleElement.height ?? 0) / 2;
                tPos = targetHandleElement.position || targetPosition;
            }
        }

        // Apply padding to create gap between node and edge
        const [paddedSourceX, paddedSourceY] = applyPositionOffset(sX, sY, sPos, NODE_PADDING);
        const [paddedTargetX, paddedTargetY] = applyPositionOffset(tX, tY, tPos, NODE_PADDING);

        return {
            actualSourceX: Math.round(paddedSourceX),
            actualSourceY: Math.round(paddedSourceY),
            actualTargetX: Math.round(paddedTargetX),
            actualTargetY: Math.round(paddedTargetY),
            actualSourcePosition: sPos,
            actualTargetPosition: tPos,
        };
    }, [store.edge, store.sourceNode, store.targetNode, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);
    function applyPositionOffset(x: number, y: number, position: Position, offset: number): [number, number] {
        switch (position) {
            case Position.Top: return [x, y - offset];
            case Position.Bottom: return [x, y + offset];
            case Position.Left: return [x - offset, y];
            case Position.Right: return [x + offset, y];
            default: return [x, y];
        }
    }

    const [edgePath, labelX, labelY, controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y] = useMemo(() => {
        if (data?.curveStyle === 'bezier') {
            // Manual bezier with two draggable handles
            const midX = (actualSourceX + actualTargetX) / 2;
            const midY = (actualSourceY + actualTargetY) / 2;

            const dx = actualTargetX - actualSourceX;
            const dy = actualTargetY - actualSourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offset = Math.min(100, distance * 0.3);

            const cp1X = data.controlPoint1X ?? Math.round(actualSourceX + dx * 0.25 + (dy / distance) * offset);
            const cp1Y = data.controlPoint1Y ?? Math.round(actualSourceY + dy * 0.25 - (dx / distance) * offset);
            const cp2X = data.controlPoint2X ?? Math.round(actualTargetX - dx * 0.25 - (dy / distance) * offset);
            const cp2Y = data.controlPoint2Y ?? Math.round(actualTargetY - dy * 0.25 + (dx / distance) * offset);

            const path = `M ${actualSourceX},${actualSourceY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${actualTargetX},${actualTargetY}`;
            return [path, Math.round(midX), Math.round(midY), cp1X, cp1Y, cp2X, cp2Y];
        }

        if (data?.curveStyle === 'curve') {
            // Check if nodes are on same side and vertically/horizontally aligned
            const isSameSide = actualSourcePosition === actualTargetPosition;
            const isVerticallyAligned = Math.abs(actualSourceX - actualTargetX) < 10;
            const isHorizontallyAligned = Math.abs(actualSourceY - actualTargetY) < 10;

            if (isSameSide && (isVerticallyAligned || isHorizontallyAligned)) {
                // Create custom curve for same-side connections
                const dx = actualTargetX - actualSourceX;
                const dy = actualTargetY - actualSourceY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let offset = Math.min(50, distance * 0.5);

                // Determine offset direction based on which side we're on
                let offsetX = 0, offsetY = 0;
                switch (actualSourcePosition) {
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
                const cp1X = actualSourceX + offsetX;
                const cp1Y = actualSourceY + (dy * 0.25);
                const cp2X = actualTargetX + offsetX;
                const cp2Y = actualTargetY - (dy * 0.25);

                const path = `M ${actualSourceX},${actualSourceY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${actualTargetX},${actualTargetY}`;
                const labelX = Math.round((actualSourceX + actualTargetX) / 2 + offsetX * 0.5);
                const labelY = Math.round((actualSourceY + actualTargetY) / 2);

                return [path, labelX, labelY, null, null, null, null];
            } else {
                // Use ReactFlow's default bezier curve for normal connections
                const [path, labelX, labelY] = getBezierPath({
                    sourceX: actualSourceX,
                    sourceY: actualSourceY,
                    targetX: actualTargetX,
                    targetY: actualTargetY,
                    sourcePosition: actualSourcePosition,
                    targetPosition: actualTargetPosition,
                });
                return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
            }
        }

        if (data?.curveStyle === 'elbow') {
            const [path, labelX, labelY] = getSmoothStepPath({
                sourceX: actualSourceX,
                sourceY: actualSourceY,
                targetX: actualTargetX,
                targetY: actualTargetY,
                sourcePosition: actualSourcePosition,
                targetPosition: actualTargetPosition,
            });
            return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
        }

        // Default straight line
        const [path, labelX, labelY] = getStraightPath({
            sourceX: actualSourceX,
            sourceY: actualSourceY,
            targetX: actualTargetX,
            targetY: actualTargetY,
        });
        return [path, Math.round(labelX), Math.round(labelY), null, null, null, null];
    }, [
        data?.curveStyle,
        data?.controlPoint1X,
        data?.controlPoint1Y,
        data?.controlPoint2X,
        data?.controlPoint2Y,
        actualSourceX,
        actualSourceY,
        actualTargetX,
        actualTargetY,
        actualSourcePosition,
        actualTargetPosition,
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