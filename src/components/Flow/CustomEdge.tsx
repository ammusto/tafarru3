import React, { memo, useMemo, useState, useCallback } from 'react';
import { EdgeProps, getSmoothStepPath, getStraightPath, getBezierPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from 'reactflow';
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
    markerEnd,
    markerStart,
    style,
    interactionWidth = 20,
}: EdgeProps<EdgeData>) => {
    const { updateEdge } = useFlowStore();
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);

    // Round coordinates to avoid floating point issues
    const roundedSourceX = Math.round(sourceX);
    const roundedSourceY = Math.round(sourceY);
    const roundedTargetX = Math.round(targetX);
    const roundedTargetY = Math.round(targetY);

    // Calculate control point for bezier curve
    const [controlPointX, controlPointY] = useMemo(() => {
        if (data?.curveStyle === 'curve') {
            // If we have stored control point, use it
            if (data.controlPointX !== undefined && data.controlPointY !== undefined) {
                return [Math.round(data.controlPointX), Math.round(data.controlPointY)];
            }
            // Otherwise calculate default
            return [Math.round((roundedSourceX + roundedTargetX) / 2), Math.round((roundedSourceY + roundedTargetY) / 2)];
        }
        return [Math.round((roundedSourceX + roundedTargetX) / 2), Math.round((roundedSourceY + roundedTargetY) / 2)];
    }, [roundedSourceX, roundedSourceY, roundedTargetX, roundedTargetY, data?.curveStyle, data?.controlPointX, data?.controlPointY]);

    const [edgePath, labelX, labelY] = useMemo(() => {
        if (data?.curveStyle === 'elbow') {
            const result = getSmoothStepPath({
                sourceX: roundedSourceX,
                sourceY: roundedSourceY,
                targetX: roundedTargetX,
                targetY: roundedTargetY,
                sourcePosition,
                targetPosition,
            });
            return [result[0], Math.round(result[1]), Math.round(result[2])];
        } else if (data?.curveStyle === 'curve') {
            // Use quadratic bezier with control point
            const path = `M ${roundedSourceX},${roundedSourceY} Q ${controlPointX},${controlPointY} ${roundedTargetX},${roundedTargetY}`;
            return [path, Math.round((roundedSourceX + roundedTargetX) / 2), Math.round((roundedSourceY + roundedTargetY) / 2)];
        } else {
            const result = getStraightPath({
                sourceX: roundedSourceX,
                sourceY: roundedSourceY,
                targetX: roundedTargetX,
                targetY: roundedTargetY,
            });
            return [result[0], Math.round(result[1]), Math.round(result[2])];
        }
    }, [roundedSourceX, roundedSourceY, roundedTargetX, roundedTargetY, sourcePosition, targetPosition, data?.curveStyle, controlPointX, controlPointY]);

    const strokeDasharray = useMemo(() => {
        if (data?.lineStyle === 'dashed') return '5,5';
        if (data?.lineStyle === 'dotted') return '2,2';
        return undefined;
    }, [data?.lineStyle]);

    // Create custom markers based on arrow style
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

    // Handle bezier control point dragging
    const handleControlPointDrag = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        setIsDraggingHandle(true);

        const startX = event.clientX;
        const startY = event.clientY;
        const startControlX = controlPointX;
        const startControlY = controlPointY;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newControlX = Math.round(startControlX + deltaX);
            const newControlY = Math.round(startControlY + deltaY);

            // Update the edge data with new control point
            updateEdge(id, {
                ...data,
                controlPointX: newControlX,
                controlPointY: newControlY,
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

    // Show bezier handle for curved edges when selected
    const showHandle = selected && data?.curveStyle === 'curve';

    return (
        <>
            <defs>
                {(data?.arrowStyle === 'end' || data?.arrowStyle === 'both') && (
                    <marker
                        id={`arrow-${id}-end`}
                        viewBox="0 -5 10 10"
                        refX="8"
                        refY="0"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto"
                    >
                        <path
                            d="M0,-5L10,0L0,5"
                            fill={data?.lineColor || '#b1b1b7'}
                        />
                    </marker>
                )}
                {(data?.arrowStyle === 'start' || data?.arrowStyle === 'both') && (
                    <marker
                        id={`arrow-${id}-start`}
                        viewBox="0 -5 10 10"
                        refX="2"
                        refY="0"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto-start-reverse"
                    >
                        <path
                            d="M10,-5L0,0L10,5"
                            fill={data?.lineColor || '#b1b1b7'}
                        />
                    </marker>
                )}
            </defs>

            {/* Invisible wider path for easier interaction */}
            <path
                className="react-flow__edge-interaction"
                d={edgePath}
                strokeWidth={interactionWidth}
                stroke="transparent"
                fill="none"
                style={{ cursor: 'pointer' }}
            />

            {/* Visible path */}
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

            {/* Edge label */}
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

            {/* Bezier control handle */}
            {showHandle && (
                <g>
                    <circle
                        cx={controlPointX}
                        cy={controlPointY}
                        r={8}
                        fill="#ff0073"
                        stroke="white"
                        strokeWidth={2}
                        style={{ cursor: isDraggingHandle ? 'grabbing' : 'grab' }}
                        className="react-flow__edge-control-point nodrag nopan"
                        onMouseDown={handleControlPointDrag}
                    />
                </g>
            )}
        </>
    );
});

CustomEdge.displayName = 'CustomEdge';