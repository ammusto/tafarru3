import Papa from 'papaparse';
import { Node, Edge } from 'reactflow';
import { NodeData, EdgeData, CSVRow } from '../types';
import { formatNodeLabel } from './nameFormatter';
import dagre from 'dagre';

export const parseCSV = (file: File): Promise<{ nodes: Node<NodeData>[], edges: Edge<EdgeData>[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;

            interface ParseCompleteResult {
                data: unknown[];
                errors: Papa.ParseError[];
                meta: Papa.ParseMeta;
            }

            interface PapaParseConfig {
                header: boolean;
                skipEmptyLines: boolean;
                encoding: string;
                complete: (results: ParseCompleteResult) => void;
                error: (error: Papa.ParseError) => void;
            }

            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results: ParseCompleteResult) => {
                    try {
                        const nodes: Node<NodeData>[] = [];
                        const edges: Edge<EdgeData>[] = [];
                        const rows = results.data as CSVRow[];

                        // Check if we need auto-layout
                        const needsAutoLayout: boolean = rows.every((row: CSVRow) => !row.X || !row.Y);

                        // First pass: create nodes
                        rows.forEach((row: CSVRow, index: number) => {
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
                                    x: row.X ? parseFloat(row.X) : 0,
                                    y: row.Y ? parseFloat(row.Y) : 0
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
                                    lineColor: row.LineColor || '#b1b1b7',
                                    arrowStyle: (row.ArrowStyle as 'none' | 'start' | 'end' | 'both') || 'end',
                                    curveStyle: 'straight'
                                };

                                edges.push({
                                    id: `e${row.ParentID}-${row.ID}`,
                                    source: row.ParentID,
                                    target: row.ID,
                                    sourceHandle: 'bottom',
                                    targetHandle: 'top',
                                    type: 'custom',
                                    data: edgeData
                                });
                            }

                            // Create additional connections
                            if (row.Connections) {
                                const connections: string[] = row.Connections.split(',').map((c: string) => c.trim());
                                const styles: string[] = row.ConnectionStyles ? row.ConnectionStyles.split(',') : [];
                                const labels: string[] = row.ConnectionLabels ? row.ConnectionLabels.split(',') : [];

                                connections.forEach((targetId: string, connIndex: number) => {
                                    const styleStr: string = styles[connIndex] || 'solid;gray;arrow-end';
                                    const [lineStyle, lineColor, arrowConfig] = styleStr.split(';');

                                    const edgeData: EdgeData = {
                                        label: labels[connIndex],
                                        lineStyle: (lineStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
                                        lineWidth: 2,
                                        lineColor: lineColor || '#b1b1b7',
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

                        // If auto-layout needed, apply it
                        if (needsAutoLayout) {
                            applyHierarchicalLayout(nodes, edges);
                        }

                        resolve({ nodes, edges });
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error: Papa.ParseError) => reject(error)
            } as PapaParseConfig);
        };

        reader.readAsText(file, 'UTF-8');
    });
};

const applyHierarchicalLayout = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => {
    // Create a new dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 75 });

    // Add nodes to dagre
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {
            width: node.data.width || 150,
            height: node.data.height || 50
        });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Apply the layout
    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.position = {
            x: nodeWithPosition.x - (node.data.width || 150) / 2,
            y: nodeWithPosition.y - (node.data.height || 50) / 2,
        };
    });
};

export const generateCSV = (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]): string => {
    const rows: CSVRow[] = nodes.map(node => {
        // Find parent edge - look for edges targeting this node
        const parentEdge = edges.find(e =>
            e.target === node.id &&
            e.sourceHandle === 'bottom' &&
            e.targetHandle === 'top'
        );

        // Find additional connections - edges from this node that aren't the hierarchical ones
        const additionalEdges = edges.filter(e =>
            e.source === node.id &&
            !(e.sourceHandle === 'bottom' && e.targetHandle === 'top')
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