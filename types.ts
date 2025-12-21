
export enum AxiomStatus {
    Material = "Material",
    Formal = "Formal",
    Stale = "Stale",
    Refined = "Refined"
}

export interface Axiom {
    id: string;
    status: AxiomStatus;
    premises: string[];
    conclusion: string;
    rationale: string;
    history: string[];
}

export interface ImageData {
    data: string;
    mimeType: string;
}

export interface GraphNode {
    id: string;
    name?: string;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface PMLFormalization {
    concept: string;
    formalization: string;
    explanation: string;
}

export interface ProposedAxiom {
    premises: string[];
    conclusion: string;
    rationale: string;
    polarity: string;
}

export interface AxiomUpdate {
    axiom_id: string;
    new_status?: AxiomStatus;
    modification_rationale: string;
    refined_conclusion?: string;
}

export interface DialecticalPattern {
    pattern: string;
    concepts: string[];
    description: string;
}

export interface Analysis {
    key_concepts: string[];
    pml_formalizations: PMLFormalization[];
    proposed_axioms: ProposedAxiom[];
    axiom_updates?: AxiomUpdate[]; 
    dialectical_patterns: DialecticalPattern[];
    graph_data?: GraphData;
    // Hermeneutic updates:
    updated_global_concepts?: string[];
    updated_graph_data?: GraphData;
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
}
