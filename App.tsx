
import React, { useState, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import AxiomManager from './components/AxiomManager';
import AnalysisDisplay from './components/AnalysisDisplay';
import Loader from './components/Loader';
import { Axiom, Analysis, ImageData, AppPhase, AxiomStatus, ProposedAxiom, ExportData, AxiomUpdate } from './types';
import { readFileContent } from './utils/fileUtils';
import { analyzeText } from './services/geminiService';

// Reduced from 15000 to prevent JSON truncation (token limit exhaustion)
const CHUNK_SIZE = 9000; 
const AUTO_ITERATE_DELAY = 4000;
const CONSOLIDATION_INTERVAL = 3; // Consolidate every 3 chunks

const App: React.FC = () => {
    const [phase, setPhase] = useState<AppPhase>(AppPhase.Idle);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [axioms, setAxioms] = useState<Axiom[]>([]);
    const [globalAnalysis, setGlobalAnalysis] = useState<Analysis | null>(null);
    const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isAutoIterating, setIsAutoIterating] = useState(false);
    
    // Track chunks processed since last consolidation
    const [chunksSinceConsolidation, setChunksSinceConsolidation] = useState(0);

    const autoIterateRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const textChunks = useMemo(() => {
        if (!fileContent) return [];
        const chunks = [];
        for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
            chunks.push(fileContent.substring(i, i + CHUNK_SIZE));
        }
        return chunks;
    }, [fileContent]);

    const handleReset = useCallback(() => {
        if (autoIterateRef.current) {
            clearInterval(autoIterateRef.current);
            autoIterateRef.current = null;
        }
        setPhase(AppPhase.Idle);
        setFileContent(null);
        setFileName(null);
        setImageData(null);
        setAxioms([]);
        setGlobalAnalysis(null);
        setAnalysisHistory([]);
        setError(null);
        setCurrentChunkIndex(0);
        setChunksSinceConsolidation(0);
        setIsAutoIterating(false);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }, []);

    const handleImportSession = useCallback((data: ExportData) => {
        handleReset();
        setFileContent(data.fileContent);
        setFileName(data.fileName);
        setAxioms(data.axioms);
        setGlobalAnalysis(data.globalAnalysis);
        setAnalysisHistory(data.analysisHistory);
        setCurrentChunkIndex(data.currentChunkIndex);
        setPhase(data.phase);
    }, [handleReset]);
    
    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        handleReset();
        setError(null);

        try {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImageData({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                    alert("Image loaded. Please also upload a text file to proceed.");
                };
                reader.readAsDataURL(file);
            } else if (file.name.endsWith('.json')) {
                const content = await readTextFile(file);
                const data = JSON.parse(content) as ExportData;
                handleImportSession(data);
            } else {
                const content = await readFileContent(file);
                setFileContent(content);
                setFileName(file.name);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while reading the file.");
        }
    }, [handleReset, handleImportSession]);

    const readTextFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsText(file);
        });
    };

    const processAnalysisResults = (analysis: Analysis, analysisPhase: AppPhase, infoStr?: string) => {
        const historyEntry = `[${analysisPhase === AppPhase.FileLoaded ? 'Global' : infoStr}]`;

        setAxioms(currentAxioms => {
            let updatedAxioms = [...currentAxioms];

            // 1. Process Updates to Existing Axioms (Dialectical Refinement)
            if (analysis.axiom_updates && analysis.axiom_updates.length > 0) {
                analysis.axiom_updates.forEach(update => {
                    const targetIndex = updatedAxioms.findIndex(a => a.id === update.axiom_id);
                    if (targetIndex !== -1) {
                        const target = { ...updatedAxioms[targetIndex] };
                        
                        // Apply status change
                        if (update.new_status) {
                            target.status = update.new_status;
                        }

                        // Apply conclusion refinement
                        if (update.refined_conclusion) {
                            target.conclusion = update.refined_conclusion;
                        }

                        // Add to history
                        target.history = [...target.history, `${historyEntry} ${update.modification_rationale}`];
                        
                        updatedAxioms[targetIndex] = target;
                    }
                });
            }

            // 2. Add New Proposed Axioms (Skip this during Consolidation phase usually)
            if (analysis.proposed_axioms && analysis.proposed_axioms.length > 0) {
                 const nextIdNum = updatedAxioms.length + 1;
                const newAxioms: Axiom[] = analysis.proposed_axioms.map((p, index) => ({
                    id: `A${nextIdNum + index}`,
                    premises: p.premises,
                    conclusion: p.conclusion,
                    rationale: p.rationale,
                    status: AxiomStatus.Material,
                    history: [`${historyEntry} Created`],
                }));
                updatedAxioms = [...updatedAxioms, ...newAxioms];
            }

            return updatedAxioms;
        });
    };

    const runGlobalAnalysis = useCallback(async () => {
        if (!fileContent) return;
        setPhase(AppPhase.FileLoaded);
        setError(null);

        try {
            // Pass null for previous analysis in global phase
            const analysis = await analyzeText(fileContent, axioms, imageData, 'global', null, null, null);
            setGlobalAnalysis(analysis);
            processAnalysisResults(analysis, AppPhase.FileLoaded);
            setPhase(AppPhase.GlobalAnalysisComplete);
            setCurrentChunkIndex(0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Global analysis failed.');
            setPhase(AppPhase.Idle);
        }
    }, [fileContent, axioms, imageData]);

    const runConsolidation = useCallback(async () => {
        setPhase(AppPhase.Consolidating);
        setError(null);
        
        try {
            const analysis = await analyzeText("", axioms, null, 'consolidation', globalAnalysis, null, "Consolidation");
            
            // Apply axiom updates
            processAnalysisResults(analysis, AppPhase.Consolidating, "Hermeneutic Reflection");

            // Apply Global Context Updates (Hermeneutic Circle)
            if (analysis.updated_global_concepts || analysis.updated_graph_data) {
                setGlobalAnalysis(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        key_concepts: analysis.updated_global_concepts || prev.key_concepts,
                        graph_data: analysis.updated_graph_data || prev.graph_data
                    };
                });
            }
            
            // After consolidation, we reset the counter
            setChunksSinceConsolidation(0);
            setPhase(AppPhase.GlobalAnalysisComplete); // Ready for next chunk
            
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Consolidation failed.');
            setPhase(AppPhase.GlobalAnalysisComplete);
        }
    }, [axioms, globalAnalysis]);

    const runNextChunkAnalysis = useCallback(async () => {
        // Check if we should consolidate first
        if (chunksSinceConsolidation >= CONSOLIDATION_INTERVAL && chunksSinceConsolidation > 0) {
            await runConsolidation();
            return;
        }

        if (!globalAnalysis || currentChunkIndex >= textChunks.length) {
            setPhase(AppPhase.IterativeAnalysisComplete);
            setIsAutoIterating(false);
            if(autoIterateRef.current) clearInterval(autoIterateRef.current);
            return;
        }

        setPhase(AppPhase.IterativeAnalysis);
        setError(null);
        
        const chunk = textChunks[currentChunkIndex];
        const chunkInfo = `Chunk ${currentChunkIndex + 1}/${textChunks.length}`;
        
        const previousContext = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1] : null;

        try {
            const analysis = await analyzeText(chunk, axioms, null, 'iterative', globalAnalysis, previousContext, chunkInfo);
            setAnalysisHistory(prev => [...prev, analysis]);
            processAnalysisResults(analysis, AppPhase.IterativeAnalysis, chunkInfo);
            
            const nextIndex = currentChunkIndex + 1;
            setCurrentChunkIndex(nextIndex);
            setChunksSinceConsolidation(prev => prev + 1);
            
            if (nextIndex >= textChunks.length) {
                setPhase(AppPhase.IterativeAnalysisComplete);
                setIsAutoIterating(false);
                if(autoIterateRef.current) clearInterval(autoIterateRef.current);
            } else {
                setPhase(AppPhase.GlobalAnalysisComplete);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : `Iterative analysis for ${chunkInfo} failed.`);
            setPhase(AppPhase.GlobalAnalysisComplete);
            setIsAutoIterating(false);
            if(autoIterateRef.current) clearInterval(autoIterateRef.current);
        }
    }, [axioms, globalAnalysis, analysisHistory, currentChunkIndex, textChunks, chunksSinceConsolidation, runConsolidation]);
    
    const handleStartAnalysis = useCallback(() => {
        if (phase === AppPhase.Idle && fileContent) {
            runGlobalAnalysis();
        } else if (phase === AppPhase.GlobalAnalysisComplete) {
            runNextChunkAnalysis();
        }
    }, [phase, fileContent, runGlobalAnalysis, runNextChunkAnalysis]);

    const handleAutoIterate = useCallback(() => {
        setIsAutoIterating(true);
        // We trigger the first step immediately
        runNextChunkAnalysis(); 
        
        // Then set up the interval
        autoIterateRef.current = setInterval(() => {
             // We use a hidden button or direct state check to trigger next step
             // But inside setInterval, state is stale. 
             // The reliable pattern here is letting the effect or a ref handle "next".
             // For simplicity in this structure: we click a hidden trigger that calls runNextChunkAnalysis
             // This ensures we always have fresh state (like currentChunkIndex) in the callback.
             document.getElementById('hidden-trigger')?.click();
        }, AUTO_ITERATE_DELAY);
    }, [runNextChunkAnalysis]);
    
    const handleStopAutoIterate = useCallback(() => {
        setIsAutoIterating(false);
        if (autoIterateRef.current) {
            clearInterval(autoIterateRef.current);
            autoIterateRef.current = null;
        }
    }, []);

    const handleExportSession = useCallback(() => {
        const exportData: ExportData = {
            fileContent,
            fileName,
            axioms,
            globalAnalysis,
            analysisHistory,
            currentChunkIndex,
            phase,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dialectical-reader-session-${fileName || 'untitled'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [fileContent, fileName, axioms, globalAnalysis, analysisHistory, currentChunkIndex, phase]);
    
    const isAnalyzing = phase === AppPhase.FileLoaded || (phase === AppPhase.IterativeAnalysis && !isAutoIterating) || phase === AppPhase.Consolidating;

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 {/* This hidden trigger allows the Interval to call the fresh useCallback function */}
                 <button id="hidden-trigger" onClick={runNextChunkAnalysis} style={{ display: 'none' }}></button>

                <div className="mb-6">
                    <Controls 
                        phase={phase}
                        fileName={fileName}
                        currentChunk={currentChunkIndex + 1}
                        totalChunks={textChunks.length}
                        onFileChange={handleFileChange}
                        onStartAnalysis={handleStartAnalysis}
                        onReset={handleReset}
                        onExportSession={handleExportSession}
                        onAutoIterate={handleAutoIterate}
                        onStopAutoIterate={handleStopAutoIterate}
                        isAutoIterating={isAutoIterating}
                    />
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-6">
                        <p className="font-bold">An Error Occurred:</p>
                        <p>{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 h-[calc(100vh-12rem)]">
                        <AxiomManager axioms={axioms} />
                    </div>
                    <div className="lg:col-span-2">
                        {isAnalyzing || (isAutoIterating && phase !== AppPhase.IterativeAnalysisComplete) ? (
                            <Loader phase={phase} />
                        ) : (globalAnalysis || analysisHistory.length > 0) ? (
                            <AnalysisDisplay 
                                globalAnalysis={globalAnalysis}
                                analysisHistory={analysisHistory}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
                                <h2 className="text-xl font-semibold text-gray-400">Welcome to the Dialectical Reader</h2>
                                <p className="text-gray-500 mt-2">Upload a file (PDF, TXT, MD, or .json session) to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
