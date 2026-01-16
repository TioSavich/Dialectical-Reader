
export enum AxiomStatus {
    Material = "Material",
    Formal = "Formal",
    Stale = "Stale",
    Refined = "Refined"
}

// Added ImageData interface to fix import errors in App.tsx and geminiService.ts
export interface ImageData {
    data: string;
    mimeType: string;
}

export interface ProseSection {
    summary: string;
    conceptual_narrative: string;
    interpretive_notes?: string;
}

export interface LogicAxiom {
    id: string;
    premises_symbolic: string[];
    conclusion_symbolic: string;
    polarity: 'compressive' | 'expansive';
}

export interface Formalization {
    term: string;
    pml_expression: string;
    dependencies: string[];
}

export interface LogicSection {
    axioms: LogicAxiom[];
    formalizations: Formalization[];
}

export interface AxiomTranslation {
    axiom_id: string;
    plain_english: string;
    source_passage?: string;
}

export interface TermDefinition {
    term: string;
    definition: string;
}

export interface EnglishTranslations {
    axiom_translations: AxiomTranslation[];
    term_definitions: TermDefinition[];
}

export interface Sublation {
    from: string;
    into: string;
    mechanism: string;
}

export interface DialecticalHistory {
    concepts_born: string[];
    concepts_sublated: Sublation[];
    concepts_preserved: string[];
    cumulative_arc: string;
}

export interface Pattern {
    name: string;
    terms: string[];
    description: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    relation: 'sublates' | 'implies' | 'contradicts';
}

export interface GraphUpdate {
    new_nodes: string[];
    new_edges: GraphEdge[];
    removed_nodes: string[];
}

export interface Analysis {
    prose: ProseSection;
    logic: LogicSection;
    english_translations: EnglishTranslations;
    dialectical_history: DialecticalHistory;
    patterns: Pattern[];
    graph_update: GraphUpdate;
}

export interface Axiom {
    id: string;
    status: AxiomStatus;
    logic: LogicAxiom;
    translation: AxiomTranslation;
    history: string[];
}

export interface GraphNode {
    id: string;
    name?: string;
}

export interface GraphNode {
    id: string;
    name?: string;
}

export interface GraphLink {
    source: string;
    target: string;
    label?: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export enum AppPhase {
    Idle = "Idle",
    FileLoaded = "FileLoaded",
    GlobalAnalysisComplete = "GlobalAnalysisComplete",
    IterativeAnalysis = "IterativeAnalysis",
    IterativeAnalysisComplete = "IterativeAnalysisComplete",
    AutoIterating = "AutoIterating",
    Consolidating = "Consolidating"
}

export interface ExportData {
    fileContent: string | null;
    fileName: string | null;
    axioms: Axiom[];
    globalAnalysis: Analysis | null;
    analysisHistory: Analysis[];
    currentChunkIndex: number;
    phase: AppPhase;
    graphData: GraphData;
}
