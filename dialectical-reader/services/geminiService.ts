
import { GoogleGenAI, Type } from "@google/genai";
import { Axiom, Analysis, AxiomStatus, ImageData } from '../types';

const formatAxiomsForPrompt = (axioms: Axiom[]): string => {
    if (axioms.length === 0) return "No axioms loaded yet.";
    const activeAxioms = axioms.filter(a => a.status !== AxiomStatus.Stale);
    if (activeAxioms.length === 0) return "No active axioms.";

    return activeAxioms.map(axiom => 
        `- ID: ${axiom.id} | LOGIC: [${axiom.logic.premises_symbolic.join(', ')}] => ${axiom.logic.conclusion_symbolic} | ENGLISH: ${axiom.translation.plain_english}`
    ).join('\n');
};

const formatGlobalContext = (analysis: Analysis | null): string => {
    if (!analysis) return "No global context established.";
    return `GLOBAL SUMMARY: ${analysis.prose.summary}\nCONCEPTUAL ARC: ${analysis.dialectical_history.cumulative_arc}`;
};

const REVISED_SYSTEM_INSTRUCTION = `
You are a philosophical interpreter using Polarized Modal Logic (PML) to analyze text.

=== OUTPUT PHILOSOPHY ===
Your outputs must be HUMAN-READABLE and MACHINE-SEPARABLE. Every piece of your analysis will be downloaded independently. Users should be able to:
1. Read the PROSE sections like a well-written essay.
2. Copy the LOGIC sections into a formal proof assistant.
3. See exactly how each concept EVOLVED across the reading.

=== CRITICAL RULES ===

1. **PROSE CONTAINS NO SYMBOLS**: Use natural philosophical language. Write as if for publication.
2. **LOGIC CONTAINS NO PROSE**: Pure syntax only. Valid PML notation.
3. **TRANSLATIONS BRIDGE THE GAP**: Provide a 1:1 mapping between every axiom and a plain English sentence.
4. **TRACK SUBLATION EXPLICITLY**: Show what was EMERGED, EATEN (sublated), and PRESERVED.
5. **CUMULATIVE ARC REQUIRED**: Connect this chunk to the overall movement.

=== PML VOCABULARY REFERENCE ===
- Contexts: s(P) = subjective, o(P) = objective, n(P) = normative
- Modalities: comp_nec(P) = compressive necessity, exp_nec(P) = expansive necessity
- Polarity: 'compressive' (synthesis, determination), 'expansive' (analysis, dissolution)
`;

const getPhaseSpecificAddition = (phase: 'global' | 'iterative' | 'consolidation', chunkN?: number, chunkM?: number, axiomList?: string, globalContext?: string): string => {
    if (phase === 'global') {
        return `
You are in the GLOBAL ANALYSIS phase. Establish the INITIAL conceptual landscape.
- "prose.conceptual_narrative" should provide a map of the overall argument.
- "dialectical_history" should identify the fundamental starting concepts.
`;
    } else if (phase === 'iterative') {
        return `
You are in the ITERATIVE DEEP DIVE phase, analyzing chunk [${chunkN}] of [${chunkM}].

GLOBAL CONTEXT (The Whole):
${globalContext}

EXISTING AXIOMS (for reference):
${axiomList}

YOUR TASK:
1. Read this chunk THROUGH the lens of the global context.
2. In "dialectical_history.concepts_sublated", show if this chunk's specific logic EATS or transforms the global concepts.
3. Prefer UPDATING axioms (using existing IDs) to creating new ones.
`;
    } else {
        return `
You are in the HERMENEUTIC REFLECTION phase. The Parts rewrite the Whole.

YOUR TASK:
1. AGGRESSIVELY merge redundant axioms. 
2. Generate a FINAL "prose.conceptual_narrative" that synthesizes everything learned.
3. Show the COMPLETE sublation chain from start to finish.
`;
    }
};

const getResponseSchema = () => {
    return {
        type: Type.OBJECT,
        properties: {
            prose: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    conceptual_narrative: { type: Type.STRING },
                    interpretive_notes: { type: Type.STRING },
                },
                required: ["summary", "conceptual_narrative"]
            },
            logic: {
                type: Type.OBJECT,
                properties: {
                    axioms: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                premises_symbolic: { type: Type.ARRAY, items: { type: Type.STRING } },
                                conclusion_symbolic: { type: Type.STRING },
                                polarity: { type: Type.STRING, enum: ['compressive', 'expansive'] },
                            },
                            required: ["id", "premises_symbolic", "conclusion_symbolic", "polarity"]
                        }
                    },
                    formalizations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING },
                                pml_expression: { type: Type.STRING },
                                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ["term", "pml_expression", "dependencies"]
                        }
                    }
                },
                required: ["axioms", "formalizations"]
            },
            english_translations: {
                type: Type.OBJECT,
                properties: {
                    axiom_translations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                axiom_id: { type: Type.STRING },
                                plain_english: { type: Type.STRING },
                                source_passage: { type: Type.STRING },
                            },
                            required: ["axiom_id", "plain_english"]
                        }
                    },
                    term_definitions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                term: { type: Type.STRING },
                                definition: { type: Type.STRING },
                            },
                            required: ["term", "definition"]
                        }
                    }
                },
                required: ["axiom_translations", "term_definitions"]
            },
            dialectical_history: {
                type: Type.OBJECT,
                properties: {
                    concepts_born: { type: Type.ARRAY, items: { type: Type.STRING } },
                    concepts_sublated: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                from: { type: Type.STRING },
                                into: { type: Type.STRING },
                                mechanism: { type: Type.STRING },
                            },
                            required: ["from", "into", "mechanism"]
                        }
                    },
                    concepts_preserved: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cumulative_arc: { type: Type.STRING }
                },
                required: ["concepts_born", "concepts_sublated", "concepts_preserved", "cumulative_arc"]
            },
            patterns: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        terms: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING },
                    },
                    required: ["name", "terms", "description"]
                }
            },
            graph_update: {
                type: Type.OBJECT,
                properties: {
                    new_nodes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    new_edges: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                from: { type: Type.STRING },
                                to: { type: Type.STRING },
                                relation: { type: Type.STRING, enum: ['sublates', 'implies', 'contradicts'] },
                            },
                            required: ["from", "to", "relation"]
                        }
                    },
                    removed_nodes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["new_nodes", "new_edges", "removed_nodes"]
            }
        },
        required: ["prose", "logic", "english_translations", "dialectical_history", "patterns", "graph_update"]
    };
};

export const analyzeText = async (
    text: string, 
    currentAxioms: Axiom[], 
    image: ImageData | null,
    phase: 'global' | 'iterative' | 'consolidation',
    globalAnalysis: Analysis | null,
    previousAnalysis: Analysis | null,
    chunkInfo: string | null,
    chunkN?: number,
    chunkM?: number
): Promise<Analysis> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const axiomText = formatAxiomsForPrompt(currentAxioms);
    const globalContext = formatGlobalContext(globalAnalysis);
    const phaseAdd = getPhaseSpecificAddition(phase, chunkN, chunkM, axiomText, globalContext);
    
    const userPrompt = `
${phase === 'iterative' ? `--- ANALYSIS OF CHUNK: ${chunkInfo} ---` : ''}
${text ? `TEXT TO ANALYZE:\n${text}\n---` : ''}
`;

    const requestParts: any[] = [{ text: userPrompt }];
    if (image && phase === 'global') {
        requestParts.push({
            inlineData: { data: image.data, mimeType: image.mimeType }
        });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: requestParts },
        config: {
            systemInstruction: REVISED_SYSTEM_INSTRUCTION + phaseAdd,
            responseMimeType: "application/json",
            responseSchema: getResponseSchema(),
            maxOutputTokens: 20000, // Large output allowed for detailed JSON
            thinkingConfig: { thinkingBudget: 15000 },
        },
    });

    try {
        const textResponse = response.text.trim();
        return JSON.parse(textResponse) as Analysis;
    } catch (e) {
        console.error("JSON Parse Error:", e, response.text);
        throw new Error("AI returned invalid JSON. The philosophical complexity may have exceeded current token limits for this chunk.");
    }
};
