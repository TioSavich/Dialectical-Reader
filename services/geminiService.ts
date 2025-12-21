
import { GoogleGenAI, Type } from "@google/genai";
import { Axiom, Analysis, ImageData, AxiomStatus } from '../types';

const formatAxiomsForPrompt = (axioms: Axiom[]): string => {
    if (axioms.length === 0) {
        return "No axioms loaded yet.";
    }
    // Filter out Stale axioms to save tokens and focus attention, 
    // unless we are in consolidation mode where we might want to review them (but usually we just ignore stale)
    const activeAxioms = axioms.filter(a => a.status !== AxiomStatus.Stale);
    
    if (activeAxioms.length === 0) return "No active axioms.";

    return activeAxioms.map(axiom => 
        `- ID: ${axiom.id} | STATUS: ${axiom.status} | LOGIC: [${axiom.premises.join(', ')}] => ${axiom.conclusion}`
    ).join('\n');
};

const getSystemInstruction = (phase: 'global' | 'iterative' | 'consolidation'): string => {
    const commonInstructions = `
You are a philosophical interpreter using a system inspired by Polarized Modal Logic (PML).
Your task is to analyze the provided philosophical text.

PML VOCABULARY:
- Contexts: s(P) = subjective, o(P) = objective, n(P) = normative
- Modalities: comp_nec(P) (compressive necessity), exp_nec(P) (expansive necessity)
- Polarity: 'compressive' (synthesis, determination), 'expansive' (analysis, dissolution).

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object.
CRITICAL: Keep all 'rationale', 'explanation', and 'description' fields CONCISE (max 20-30 words). Avoid verbosity to ensure valid JSON output.
`;

    if (phase === 'global') {
        return `${commonInstructions}
You are in the GLOBAL ANALYSIS phase. Read the entire text.
Identify main concepts and initial axioms.
The 'graph_data' is required here.

JSON Structure:
{
  "key_concepts": ["concept1"],
  "pml_formalizations": [{"concept": "Being", "formalization": "s(being)", "explanation": "Short explain"}],
  "proposed_axioms": [{"premises": ["s(being)"], "conclusion": "s(nothing)", "rationale": "Short rationale", "polarity": "compressive"}],
  "dialectical_patterns": [{"pattern": "oscillation", "concepts": ["being", "nothing"], "description": "Short desc"}],
  "graph_data": {
    "nodes": [{"id": "being"}],
    "links": [{"source": "being", "target": "nothing"}]
  }
}`;
    } else if (phase === 'consolidation') {
        return `${commonInstructions}
You are in the HERMENEUTIC REFLECTION (Part-to-Whole) phase.

YOUR TASK:
1. **Refine the Parts (Axioms)**: 
   - Aggressively MERGE duplicates. If 5 axioms describe the same phenomenon, pick the best one (mark as 'Formal') and mark others 'Stale'.
   - Prune weak/redundant axioms. We want a TIGHT logical system, not a transcript.
   
2. **Refine the Whole (Global Context)**: 
   - Based on the detailed reading of the recent chunks, has the Global understanding changed? 
   - Update 'updated_global_concepts' and 'updated_graph_data' if the detailed axioms reveal that our initial global map was imprecise.
   - This closes the Hermeneutic Circle: The Parts reshape the Whole.

JSON Structure:
{
  "key_concepts": [],
  "pml_formalizations": [],
  "proposed_axioms": [],
  "axiom_updates": [
     { "axiom_id": "A1", "new_status": "Stale", "modification_rationale": "Merged into A5." },
     { "axiom_id": "A5", "new_status": "Formal", "refined_conclusion": "Updated conclusion...", "modification_rationale": "Synthesized with A1." }
  ],
  "dialectical_patterns": [],
  "updated_global_concepts": ["refined_concept_1", "new_major_concept"],
  "updated_graph_data": { "nodes": [], "links": [] }
}`;
    } else { // iterative phase
        return `${commonInstructions}
You are in the ITERATIVE DEEP DIVE phase.

CRITICAL INSTRUCTION ON AXIOMS:
- **QUALITY OVER QUANTITY**. Do NOT generate axioms for every sentence.
- Only propose a NEW axiom if it represents a **major structural shift** or a **novel synthesis** not covered by existing axioms.
- **PREFER UPDATING**: If the text supports/refines an existing axiom, update it (mark 'Refined' or 'Formal') rather than making a new one.
- **DETECT CONTRADICTIONS**: If the text contradicts an existing axiom, mark it 'Stale'.

JSON Structure:
{
  "key_concepts": ["concept_from_chunk"],
  "pml_formalizations": [{"concept": "New Concept", "formalization": "s(new)", "explanation": "Short explain"}],
  "proposed_axioms": [{"premises": ["s(old)"], "conclusion": "s(new)", "rationale": "Short rationale", "polarity": "compressive"}],
  "axiom_updates": [
     { "axiom_id": "A1", "new_status": "Stale", "modification_rationale": "Refuted by paragraph 2." },
     { "axiom_id": "A2", "new_status": "Refined", "refined_conclusion": "s(being) => s(becoming)", "modification_rationale": "Concept evolved." }
  ],
  "dialectical_patterns": [{"pattern": "refinement", "concepts": ["old", "new"], "description": "Short desc"}]
}`;
    }
};

const getResponseSchema = (phase: 'global' | 'iterative' | 'consolidation') => {
    const baseSchema = {
        type: Type.OBJECT,
        properties: {
            key_concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            pml_formalizations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { concept: { type: Type.STRING }, formalization: { type: Type.STRING }, explanation: { type: Type.STRING } },
                    required: ["concept", "formalization", "explanation"],
                },
            },
            proposed_axioms: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        premises: { type: Type.ARRAY, items: { type: Type.STRING } },
                        conclusion: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        polarity: { type: Type.STRING },
                    },
                    required: ["premises", "conclusion", "rationale", "polarity"],
                },
            },
            dialectical_patterns: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        pattern: { type: Type.STRING },
                        concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING },
                    },
                    required: ["pattern", "concepts", "description"],
                },
            },
        },
         required: ["key_concepts", "pml_formalizations", "proposed_axioms", "dialectical_patterns"],
    };

    if (phase === 'global') {
        (baseSchema.properties as any).graph_data = {
            type: Type.OBJECT,
            properties: {
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] } },
                links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING } }, required: ["source", "target"] } },
            },
            required: ["nodes", "links"],
        };
        (baseSchema.required as string[]).push("graph_data");
    } else {
        // Add axiom_updates for iterative and consolidation phase
        (baseSchema.properties as any).axiom_updates = {
             type: Type.ARRAY,
             items: {
                 type: Type.OBJECT,
                 properties: {
                     axiom_id: { type: Type.STRING },
                     new_status: { type: Type.STRING, enum: [AxiomStatus.Stale, AxiomStatus.Formal, AxiomStatus.Refined, AxiomStatus.Material] },
                     modification_rationale: { type: Type.STRING },
                     refined_conclusion: { type: Type.STRING }
                 },
                 required: ["axiom_id", "modification_rationale"]
             }
        };
        
        if (phase === 'consolidation') {
            // Add Hermeneutic Circle updates
            (baseSchema.properties as any).updated_global_concepts = { type: Type.ARRAY, items: { type: Type.STRING } };
            (baseSchema.properties as any).updated_graph_data = {
                type: Type.OBJECT,
                properties: {
                    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] } },
                    links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING } }, required: ["source", "target"] } },
                },
                required: ["nodes", "links"],
            };
        }
    }

    return baseSchema;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeText = async (
    text: string, 
    currentAxioms: Axiom[], 
    image: ImageData | null,
    phase: 'global' | 'iterative' | 'consolidation',
    globalAnalysis: Analysis | null,
    previousAnalysis: Analysis | null, // The most recent chunk's analysis
    chunkInfo: string | null
): Promise<Analysis> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const axiomText = formatAxiomsForPrompt(currentAxioms);
    let userPromptContent = `Current Active Axioms (The Parts):\n${axiomText}\n\n`;

    if (phase === 'consolidation') {
        userPromptContent += `Current Global Analysis (The Whole):\n${JSON.stringify(globalAnalysis?.key_concepts || [], null, 2)}\n\n`;
        userPromptContent += `INSTRUCTION: Perform HERMENEUTIC REFLECTION. Use the Axioms (Parts) to Refine the Global Context (Whole). Aggressively prune redundant axioms.`;
    } else if (phase === 'iterative') {
        userPromptContent += `Global Analysis (The Big Picture):\n${JSON.stringify(globalAnalysis?.key_concepts || [], null, 2)}\n\n`;
        
        if (previousAnalysis) {
            userPromptContent += `Previous Chunk Analysis (Immediate Context):\n`;
            userPromptContent += `- Recent Concepts: ${previousAnalysis.key_concepts.join(', ')}\n`;
            userPromptContent += `- Recent Patterns: ${previousAnalysis.dialectical_patterns.map(p => p.pattern).join(', ')}\n\n`;
        }

        userPromptContent += `--- Analyze this Text Chunk (${chunkInfo}) ---\n${text}\n---`;
    } else {
        userPromptContent += `--- Text to analyze ---\n${text}\n---`;
    }

    const requestParts: any[] = [{ text: userPromptContent }];
    if (image && phase === 'global') {
        requestParts.push({
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        });
    }

    const request = {
        model: 'gemini-3-pro-preview', // Upgraded to 3.0 Pro for better complex reasoning
        contents: { parts: requestParts },
        config: {
            systemInstruction: getSystemInstruction(phase),
            responseMimeType: "application/json",
            responseSchema: getResponseSchema(phase),
        },
    };
    
    let attempt = 0;
    const maxRetries = 3;
    const baseDelay = 5000; 

    while (attempt <= maxRetries) {
        try {
            const response = await ai.models.generateContent(request);
            const jsonText = response.text.trim();
            const cleanedText = jsonText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
            const analysisResult = JSON.parse(cleanedText) as Analysis;
            return analysisResult;

        } catch (e: any) {
            const errorMsg = e.toString().toLowerCase();
            const isRetryable = errorMsg.includes("429") || 
                                errorMsg.includes("resource_exhausted") || 
                                errorMsg.includes("503") || 
                                errorMsg.includes("overloaded") ||
                                errorMsg.includes("json") ||     // Handle JSON parse errors
                                errorMsg.includes("syntax");     // Handle SyntaxErrors

            if (isRetryable && attempt < maxRetries) {
                attempt++;
                const delay = baseDelay * Math.pow(2, attempt - 1); 
                console.warn(`Gemini API Error (Attempt ${attempt}/${maxRetries}): ${errorMsg}. Retrying in ${delay}ms...`);
                await sleep(delay);
                continue;
            }

            console.error("Gemini API call failed:", e);
            throw new Error(`Failed to get a valid analysis from the AI. Error: ${e.message || e}`);
        }
    }
    
    throw new Error("Gemini API request failed after maximum retries.");
};
