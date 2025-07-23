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

                        const needsAutoLayout = rows.every(row => !row.X || !row.Y);

                        rows.forEach((row, index) => {
                            const width = row.Width ? parseInt(row.Width) : undefined;
                            const height = row.Height ? parseInt(row.Height) : undefined;

                            const node: Node<NodeData> = {
                                id: row.ID || `node-${index}`,
                                type: 'custom',
                                position: {
                                    x: row.X ? parseFloat(row.X) : 0,
                                    y: row.Y ? parseFloat(row.Y) : 0,
                                },
                                data: {
                                    label: row.Label,
                                    deathDate: row.DeathDate,
                                    kunya: row.Kunya,
                                    nasab: row.Nasab,
                                    nisba: row.Nisba,
                                    shuhra: row.Shuhra,
                                    biography: row.Biography,
                                    nodeShape: (row.NodeShape as NodeData['nodeShape']) || 'rectangle',
                                    nodeFillColor: row.NodeFillColor || 'white',
                                    borderStyle: (row.BorderStyle as NodeData['borderStyle']) || 'solid',
                                    borderWidth: parseInt(row.BorderWidth || '2'),
                                    borderColor: row.BorderColor || 'black',
                                    width,
                                    height,
                                },
                            };

                            nodes.push(node);

                            if (row.ParentID) {
                                edges.push({
                                    id: `e${row.ParentID}-${row.ID}`,
                                    source: row.ParentID,
                                    target: row.ID,
                                    sourceHandle: 'bottom',  // Changed from 'top'
                                    targetHandle: 'top',     // Changed from 'bottom'
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

                            if (row.Connections) {
                                const targets = row.Connections.split(',').map(t => t.trim());
                                const styles = row.ConnectionStyles?.split(',') || [];
                                const labels = row.ConnectionLabels?.split(',') || [];

                                targets.forEach((targetId, connIndex) => {
                                    const styleParts = styles[connIndex]?.split(';') || [];
                                    const [lineStyle, lineColor, arrowStr] = styleParts;

                                    edges.push({
                                        id: `e${row.ID}-${targetId}-${connIndex}`,
                                        source: row.ID,
                                        target: targetId,
                                        type: 'custom',
                                        data: {
                                            label: labels[connIndex],
                                            lineStyle: (lineStyle as EdgeData['lineStyle']) || 'solid',
                                            lineWidth: 2,
                                            lineColor: lineColor || '#b1b1b7',
                                            arrowStyle: (arrowStr?.replace('arrow-', '') as EdgeData['arrowStyle']) || 'end',
                                            curveStyle: 'straight',
                                        },
                                    });
                                });
                            }
                        });

                        if (needsAutoLayout) {
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
        // Find parent edge - look for edges targeting this node
        const parentEdge = edges.find(e =>
            e.target === node.id &&
            e.sourceHandle === 'bottom' &&  // Changed from 'bottom'
            e.targetHandle === 'top'        // Changed from 'top'
        );

        // Find additional connections - edges from this node that aren't the hierarchical ones
        const additionalEdges = edges.filter(e =>
            e.source === node.id &&
            !(e.sourceHandle === 'bottom' && e.targetHandle === 'top')  // Updated condition
        );

        const connections = additionalEdges.map(e => e.target).join(',');
        const connectionStyles = additionalEdges.map(e =>
            `${e.data?.lineStyle || 'solid'};${e.data?.lineColor || '#b1b1b7'};arrow-${e.data?.arrowStyle || 'end'}`
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
        Nasab: 'ibn ʿAbd Allāh',
        Nisba: 'al-Baghdādī',
        Shuhra: 'al-Ṣiddīq',
        Biography: 'A notable scholar with expertise in ḥadīth',
        NodeShape: 'rectangle',
        NodeFillColor: 'white',
        BorderStyle: 'solid',
        BorderWidth: '2',
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
        Connections: '',
        ConnectionStyles: '',
        ConnectionLabels: ''
    }];

    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    return BOM + Papa.unparse(template);
};


const applyHierarchicalLayout = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 75 });

    nodes.forEach(n => g.setNode(n.id, { width: n.data.width || 150, height: n.data.height || 50 }));
    edges.forEach(e => g.setEdge(e.source, e.target));

    dagre.layout(g);

    nodes.forEach(n => {
        const pos = g.node(n.id);
        n.position = {
            x: pos.x - (n.data.width || 150) / 2,
            y: pos.y - (n.data.height || 50) / 2,
        };
    });
};