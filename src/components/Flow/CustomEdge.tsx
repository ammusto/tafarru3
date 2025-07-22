import React, { memo, useMemo } from 'react';
import { EdgeProps, getSmoothStepPath, getStraightPath, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { EdgeData } from '../../types';

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
    const [edgePath, labelX, labelY] = useMemo(() => {
        if (data?.curveStyle === 'elbow') {
            return getSmoothStepPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
                sourcePosition,
                targetPosition,
            });
        } else if (data?.curveStyle === 'curve') {
            return getBezierPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
                sourcePosition,
                targetPosition,
            });
        } else {
            return getStraightPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
            });
        }
    }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data?.curveStyle]);

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

    // Show bezier handle for curved edges when selected
    const showHandle = selected && data?.curveStyle === 'curve';
    const handleX = (sourceX + targetX) / 2;
    const handleY = (sourceY + targetY) / 2;

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
                        refX="0"
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
                        cx={handleX}
                        cy={handleY}
                        r={8}
                        fill="#ff0073"
                        stroke="white"
                        strokeWidth={2}
                        style={{ cursor: 'move' }}
                        className="react-flow__edge-control-point"
                    />
                </g>
            )}
        </>
    );
});

CustomEdge.displayName = 'CustomEdge';