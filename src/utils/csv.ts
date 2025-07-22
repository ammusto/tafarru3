import Papa from 'papaparse';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeData, CSVRow } from '../types';
import { formatNodeLabel } from './nameFormatter';

export const parseCSV = (file: File): Promise<{ nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const nodes: Node<NodeData>[] = [];
                    const edges: Edge<EdgeData>[] = [];
                    const rows = results.data as CSVRow[];

                    // First pass: create nodes
                    rows.forEach((row, index) => {
                        const nodeData: NodeData = {
                            label: row.Label,
                            deathDate: row.DeathDate,
                            kunya: row.Kunya,
                            nasab: row.Nasab,
                            nisba: row.Nisba,
                            shuhra: row.Shuhra,
                            biography: row.Biography,
                            nodeShape: (row.NodeShape as 'rectangle' | 'rounded') || 'rectangle',
                            nodeFillColor: row.NodeFillColor || 'white',
                            borderStyle: (row.BorderStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
                            borderWidth: parseInt(row.BorderWidth || '2'),
                            borderColor: row.BorderColor || 'black',
                            width: row.Width ? parseInt(row.Width) : undefined,
                            height: row.Height ? parseInt(row.Height) : undefined
                        };

                        const node: Node<NodeData> = {
                            id: row.ID || `node-${index}`,
                            type: 'custom',
                            position: {
                                x: row.X ? parseFloat(row.X) : index * 150,
                                y: row.Y ? parseFloat(row.Y) : 100
                            },
                            data: nodeData
                        };

                        nodes.push(node);

                        // Create edge from ParentID
                        if (row.ParentID) {
                            const edgeData: EdgeData = {
                                label: row.LineLabel,
                                lineStyle: (row.LineStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
                                lineWidth: parseInt(row.LineWidth || '2'),
                                lineColor: row.LineColor || 'gray',
                                arrowStyle: (row.ArrowStyle as 'none' | 'start' | 'end' | 'both') || 'end',
                                curveStyle: 'straight'
                            };

                            edges.push({
                                id: `e${row.ParentID}-${row.ID}`,
                                source: row.ParentID,
                                target: row.ID,
                                type: 'custom',
                                data: edgeData
                            });
                        }

                        // Create additional connections
                        if (row.Connections) {
                            const connections = row.Connections.split(',').map(c => c.trim());
                            const styles = row.ConnectionStyles ? row.ConnectionStyles.split(',') : [];
                            const labels = row.ConnectionLabels ? row.ConnectionLabels.split(',') : [];

                            connections.forEach((targetId, connIndex) => {
                                const styleStr = styles[connIndex] || 'solid;gray;arrow-end';
                                const [lineStyle, lineColor, arrowConfig] = styleStr.split(';');

                                const edgeData: EdgeData = {
                                    label: labels[connIndex],
                                    lineStyle: (lineStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
                                    lineWidth: 2,
                                    lineColor: lineColor || 'gray',
                                    arrowStyle: arrowConfig?.replace('arrow-', '') as any || 'end',
                                    curveStyle: 'straight'
                                };

                                edges.push({
                                    id: `e${row.ID}-${targetId}-${connIndex}`,
                                    source: row.ID,
                                    target: targetId,
                                    type: 'custom',
                                    data: edgeData
                                });
                            });
                        }
                    });

                    resolve({ nodes, edges });
                } catch (error) {
                    reject(error);
                }
            },
            error: (error) => reject(error)
        });
    });
};

export const generateCSV = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]): string => {
    const rows: CSVRow[] = nodes.map(node => {
        // Find parent edge
        const parentEdge = edges.find(e => e.target === node.id && e.id.startsWith('e') && !e.id.includes('-', 2));

        // Find additional connections
        const additionalEdges = edges.filter(e =>
            e.source === node.id &&
            (!parentEdge || e.id !== parentEdge.id)
        );

        const connections = additionalEdges.map(e => e.target).join(',');
        const connectionStyles = additionalEdges.map(e =>
            `${e.data?.lineStyle || 'solid'};${e.data?.lineColor || 'gray'};arrow-${e.data?.arrowStyle || 'end'}`
        ).join(',');
        const connectionLabels = additionalEdges.map(e => e.data?.label || '').join(',');

        return {
            ID: node.id,
            ParentID: parentEdge?.source || '',
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
            Connections: connections,
            ConnectionStyles: connectionStyles,
            ConnectionLabels: connectionLabels
        };
    });

    return Papa.unparse(rows);
};

export const generateTemplateCSV = (): string => {
    const template: CSVRow[] = [{
        ID: '1',
        ParentID: '',
        Label: '',
        DeathDate: '',
        Kunya: '',
        Nasab: '',
        Nisba: '',
        Shuhra: '',
        Biography: '',
        NodeShape: 'rectangle',
        NodeFillColor: 'white',
        BorderStyle: 'solid',
        BorderWidth: '2',
        BorderColor: 'black',
        LineStyle: 'solid',
        LineWidth: '2',
        LineColor: 'gray',
        ArrowStyle: 'end',
        LineLabel: '',
        X: '100',
        Y: '100',
        Width: '',
        Height: '',
        Connections: '',
        ConnectionStyles: '',
        ConnectionLabels: ''
    }];

    return Papa.unparse(template);
};