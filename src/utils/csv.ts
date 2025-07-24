import Papa from 'papaparse';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeData, CSVRow } from '../types';
import dagre from 'dagre';

export const parseCSV = (file: File): Promise<{ nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;

            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    try {
                        const nodes: Node<NodeData>[] = [];
                        const edges: Edge<EdgeData>[] = [];
                        const rows = results.data as CSVRow[];

                        // Check if we need auto-layout
                        const needsAutoLayout = rows.some(row => !row.X || !row.Y);

                        // Check if ANY row has ConnectionData
                        const hasAnyConnectionData = rows.some(row => row.ConnectionData && row.ConnectionData.trim());

                        rows.forEach((row, index) => {
                            const width = row.Width ? parseInt(row.Width) : undefined;
                            const height = row.Height ? parseInt(row.Height) : undefined;

                            const node: Node<NodeData> = {
                                id: row.ID || `node-${index + 1}`,
                                type: 'custom',
                                position: {
                                    x: row.X ? parseFloat(row.X) : 0,
                                    y: row.Y ? parseFloat(row.Y) : 0,
                                },
                                data: {
                                    label: row.Label || '',
                                    deathDate: row.DeathDate || '',
                                    kunya: row.Kunya || '',
                                    nasab: row.Nasab || '',
                                    nisba: row.Nisba || '',
                                    shuhra: row.Shuhra || '',
                                    biography: row.Biography || '',
                                    nodeShape: (row.NodeShape as NodeData['nodeShape']) || 'rectangle',
                                    nodeFillColor: row.NodeFillColor || 'white',
                                    borderStyle: (row.BorderStyle as NodeData['borderStyle']) || 'solid',
                                    borderWidth: parseInt(row.BorderWidth || '2'),
                                    borderColor: row.BorderColor || 'black',
                                    width,
                                    height,
                                    parentId: row.ParentID || undefined,
                                },
                            };

                            nodes.push(node);

                            // only create edge from ParentID if no ConnectionData exists anywhere in the file
                            if (!hasAnyConnectionData && row.ParentID) {
                                edges.push({
                                    id: `e${row.ParentID}-${row.ID}`,
                                    source: row.ParentID,
                                    target: row.ID,
                                    sourceHandle: 'bottom',
                                    targetHandle: 'top',
                                    type: 'custom',
                                    data: {
                                        label: row.LineLabel,
                                        lineStyle: (row.LineStyle as EdgeData['lineStyle']) || 'solid',
                                        lineWidth: parseInt(row.LineWidth || '2'),
                                        lineColor: row.LineColor || '#b1b1b7',
                                        arrowStyle: (row.ArrowStyle as EdgeData['arrowStyle']) || 'end',
                                        curveStyle: 'straight',
                                    },
                                });
                            }

                            // Parse ConnectionData for ALL edges (including parent connections)
                            if (row.ConnectionData) {
                                const connections = row.ConnectionData.split(';').filter(c => c.trim());

                                connections.forEach((conn, connIndex) => {
                                    const parts = conn.split(',');
                                    if (parts.length < 8) return; // Skip invalid entries

                                    const [
                                        targetId,
                                        curveType,
                                        sourceHandle,
                                        targetHandle,
                                        lineStyle,
                                        lineColor,
                                        arrowStyle,
                                        label,
                                        ...controlPoints
                                    ] = parts;

                                    const edgeData: EdgeData = {
                                        label: label || undefined,
                                        lineStyle: (lineStyle as EdgeData['lineStyle']) || 'solid',
                                        lineWidth: 2,
                                        lineColor: lineColor || '#b1b1b7',
                                        arrowStyle: (arrowStyle as EdgeData['arrowStyle']) || 'end',
                                        curveStyle: (curveType as EdgeData['curveStyle']) || 'straight',
                                    };

                                    // Add control points for bezier curves
                                    if (curveType === 'bezier' && controlPoints.length >= 4) {
                                        edgeData.controlPoint1X = parseFloat(controlPoints[0]);
                                        edgeData.controlPoint1Y = parseFloat(controlPoints[1]);
                                        edgeData.controlPoint2X = parseFloat(controlPoints[2]);
                                        edgeData.controlPoint2Y = parseFloat(controlPoints[3]);
                                    }

                                    edges.push({
                                        id: `e${row.ID}-${targetId}-${connIndex}`,
                                        source: row.ID,
                                        target: targetId,
                                        sourceHandle: sourceHandle || undefined,
                                        targetHandle: targetHandle || undefined,
                                        type: 'custom',
                                        data: edgeData,
                                    });
                                });
                            }
                        });

                        // Auto-layout if needed AND only if using ParentID method
                        if (needsAutoLayout && !hasAnyConnectionData) {
                            applyHierarchicalLayout(nodes, edges);
                        }

                        resolve({ nodes, edges });
                    } catch (err) {
                        reject(err);
                    }
                },
                error: reject,
            });
        };

        reader.readAsText(file, 'UTF-8');
    });
};

export const generateCSV = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]): string => {
    const rows: CSVRow[] = nodes.map(node => {
        // Use parentId from node data
        const parentId = node.data.parentId || '';

        // Find parent edge for styling information (if it exists)
        const parentEdge = edges.find(e => {
            // Check both directions for parent-child relationship
            return (e.source === parentId && e.target === node.id) ||
                (e.target === parentId && e.source === node.id);
        });

        // Find additional connections - exclude parent-child edges
        const additionalEdges = edges.filter(e => {
            // Only edges from this node
            if (e.source !== node.id) return false;

            // Exclude if this edge connects to the parent
            if (parentId && (e.target === parentId)) return false;

            return true;
        });

        // Build ConnectionData string
        const connectionData = additionalEdges.map(edge => {
            const parts = [
                edge.target,
                edge.data?.curveStyle || 'straight',
                edge.sourceHandle || 'bottom',
                edge.targetHandle || 'top',
                edge.data?.lineStyle || 'solid',
                edge.data?.lineColor || '#b1b1b7',
                edge.data?.arrowStyle || 'end',
                edge.data?.label || ''
            ];

            // Add bezier control points if present
            if (edge.data?.curveStyle === 'bezier') {
                parts.push(
                    edge.data.controlPoint1X?.toString() || '0',
                    edge.data.controlPoint1Y?.toString() || '0',
                    edge.data.controlPoint2X?.toString() || '0',
                    edge.data.controlPoint2Y?.toString() || '0'
                );
            }

            return parts.join(',');
        }).join(';');

        return {
            ID: node.id,
            ParentID: parentId,
            Label: node.data.label || '',
            DeathDate: node.data.deathDate || '',
            Kunya: node.data.kunya || '',
            Nasab: node.data.nasab || '',
            Nisba: node.data.nisba || '',
            Shuhra: node.data.shuhra || '',
            Biography: node.data.biography || '',
            NodeShape: node.data.nodeShape,
            NodeFillColor: node.data.nodeFillColor,
            BorderStyle: node.data.borderStyle,
            BorderWidth: node.data.borderWidth.toString(),
            BorderColor: node.data.borderColor,
            LineStyle: parentEdge?.data?.lineStyle || '',
            LineWidth: parentEdge?.data?.lineWidth?.toString() || '',
            LineColor: parentEdge?.data?.lineColor || '',
            ArrowStyle: parentEdge?.data?.arrowStyle || '',
            LineLabel: parentEdge?.data?.label || '',
            X: node.position.x.toString(),
            Y: node.position.y.toString(),
            Width: node.data.width?.toString() || '',
            Height: node.data.height?.toString() || '',
            ConnectionData: connectionData
        };
    });

    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    return BOM + Papa.unparse(rows);
};

export const generateTemplateCSV = (): string => {
    const template: CSVRow[] = [{
        ID: '1',
        ParentID: '',
        Label: '',
        DeathDate: 'd. 123/456',
        Kunya: 'Abū Bakr',
        Nasab: 'b. ʿAbd Allāh',
        Nisba: 'al-Baghdādī',
        Shuhra: 'al-Ṣiddīq',
        Biography: '',
        NodeShape: 'rounded',
        NodeFillColor: 'white',
        BorderStyle: 'solid',
        BorderWidth: '1',
        BorderColor: 'black',
        LineStyle: 'solid',
        LineWidth: '2',
        LineColor: '#b1b1b7',
        ArrowStyle: 'end',
        LineLabel: '',
        X: '',
        Y: '',
        Width: '',
        Height: '',
        ConnectionData: ''
    }];

    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    return BOM + Papa.unparse(template);
};

const applyHierarchicalLayout = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 });

    // Add nodes with size
    nodes.forEach(n => {
        const width = n.data.width || 150;
        const height = n.data.height || 50;
        g.setNode(n.id, { width, height });
    });

    // DAGRE expects: edge from parent → child
    nodes.forEach(n => {
        const parentId = n.data.parentId;
        if (parentId && nodes.some(p => p.id === parentId)) {
            g.setEdge(parentId, n.id); // PARENT to CHILD
        }
    });

    dagre.layout(g);

    // Compute bounding box
    let minX = Infinity, minY = Infinity;
    nodes.forEach(n => {
        const { x, y } = g.node(n.id);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
    });

    const offsetX = -minX + 100;
    const offsetY = -minY + 100;

    // Apply positions
    nodes.forEach(n => {
        const { x, y } = g.node(n.id);
        const width = n.data.width || 150;
        const height = n.data.height || 50;
        n.position = {
            x: x - width / 2 + offsetX,
            y: y - height / 2 + offsetY,
        };
    });
};
