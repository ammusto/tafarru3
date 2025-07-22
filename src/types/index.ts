export interface NameComponents {
    kunya?: string;
    nasab?: string;
    nisba?: string;
    shuhra?: string;
}

export interface NodeData extends NameComponents {
    [key: string]: unknown;

    label?: string;
    deathDate?: string;
    biography?: string;
    nodeShape: 'rectangle' | 'rounded';
    nodeFillColor: string;
    borderStyle: 'solid' | 'dashed' | 'dotted';
    borderWidth: number;
    borderColor: string;
    width?: number;
    height?: number;
}

export interface EdgeData {
    [key: string]: unknown;

    label?: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    lineWidth: number;
    lineColor: string;
    arrowStyle: 'none' | 'start' | 'end' | 'both';
    curveStyle: 'straight' | 'curve' | 'elbow';
}

export interface CSVRow {
    ID: string;
    ParentID?: string;
    Label?: string;
    DeathDate?: string;
    Kunya?: string;
    Nasab?: string;
    Nisba?: string;
    Shuhra?: string;
    Biography?: string;
    NodeShape?: string;
    NodeFillColor?: string;
    BorderStyle?: string;
    BorderWidth?: string;
    BorderColor?: string;
    LineStyle?: string;
    LineWidth?: string;
    LineColor?: string;
    ArrowStyle?: string;
    LineLabel?: string;
    X?: string;
    Y?: string;
    Width?: string;
    Height?: string;
    Connections?: string;
    ConnectionStyles?: string;
    ConnectionLabels?: string;
}

export type EditorMode = 'select' | 'node' | 'edge';

export interface AppState {
    projectName: string;
    unsavedChanges: boolean;
    gridEnabled: boolean;
    mode: EditorMode;
}