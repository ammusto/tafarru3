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
    parentId?: string; // Added parentId field
}

export interface EdgeData {
    [key: string]: unknown;

    label?: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    lineWidth: number;
    lineColor: string;
    arrowStyle: 'none' | 'start' | 'end' | 'both';
    curveStyle: 'straight' | 'curve' | 'bezier' | 'elbow';
    controlPoint1X?: number;
    controlPoint1Y?: number;
    controlPoint2X?: number;
    controlPoint2Y?: number;
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
    ConnectionData?: string;
}

export type EditorMode = 'select' | 'node';

export interface AppState {
    projectName: string;
    unsavedChanges: boolean;
    gridEnabled: boolean;
    mode: EditorMode;
}