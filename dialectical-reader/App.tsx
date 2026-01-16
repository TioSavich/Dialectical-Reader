
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import AxiomManager from './components/AxiomManager';
import AnalysisDisplay from './components/AnalysisDisplay';
import Loader from './components/Loader';
import { 
    Axiom, Analysis, ImageData, AppPhase, AxiomStatus, 
    ExportData, GraphData, LogicAxiom, AxiomTranslation 
} from './types';
import { readFileContent } from './utils/fileUtils';
import { analyzeText } from './services/geminiService';

const CHUNK_SIZE = 9000; 
const AUTO_ITERATE_DELAY = 4000;
const CONSOLIDATION_INTERVAL = 3;

const App: React.FC = () => {
    const [hasKey, setHasKey] = useState<boolean | null>(null);
    const [phase, setPhase] = useState<AppPhase>(AppPhase.Idle);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [axioms, setAxioms] = useState<Axiom[]>([]);
    const [globalAnalysis, setGlobalAnalysis] = useState<Analysis | null>(null);
    const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([]);
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [error, setError] = useState<string | null>(null);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isAutoIterating, setIsAutoIterating] = useState(false);
    const [chunksSinceConsolidation, setChunksSinceConsolidation] = useState(0);

    const autoIterateRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // FIX: Define isAnalyzing derived state to resolve 'Cannot find name isAnalyzing' error
    const isAnalyzing = useMemo(() => 
        phase === AppPhase.FileLoaded || 
        phase === AppPhase.IterativeAnalysis || 
        phase === AppPhase.Consolidating, 
    [phase]);

    useEffect(() => {
        const checkKey = async () => {
            try {
                // @ts-ignore
                const selected = await window.aistudio.hasSelectedApiKey();
                setHasKey(selected);
            } catch (e) {
                setHasKey(false);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        try {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            setHasKey(true);
        } catch (e) {
            console.error("Key selection failed", e);
        }
    };

    const textChunks = useMemo(() => {
        if (!fileContent) return [];
        const chunks = [];
        for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
            chunks.push(fileContent.substring(i, i + CHUNK_SIZE));
        }
        return chunks;
    }, [fileContent]);

    const handleReset = useCallback(() => {
        if (autoIterateRef.current) clearInterval(autoIterateRef.current);
        setPhase(AppPhase.Idle);
        setFileContent(null);
        setFileName(null);
        setImageData(null);
        setAxioms([]);
        setGlobalAnalysis(null);
        setAnalysisHistory([]);
        setGraphData({ nodes: [], links: [] });
        setError(null);
        setCurrentChunkIndex(0);
        setChunksSinceConsolidation(0);
        setIsAutoIterating(false);
    }, []);

    const updateGraph = useCallback((update: Analysis['graph_update']) => {
        setGraphData(prev => {
            const nodes = [...prev.nodes];
            const links = [...prev.links];
            update.removed_nodes.forEach(id => {
                const idx = nodes.findIndex(n => n.id === id);
                if (idx !== -1) nodes.splice(idx, 1);
            });
            update.new_nodes.forEach(id => {
                if (!nodes.find(n => n.id === id)) nodes.push({ id, name: id });
            });
            update.new_edges.forEach(edge => {
                if (!links.find(l => l.source === edge.from && l.target === edge.to)) {
                    links.push({ source: edge.from, target: edge.to, label: edge.relation });
                }
            });
            return { nodes, links };
        });
    }, []);

    const processAnalysisResults = useCallback((analysis: Analysis, analysisPhase: AppPhase, infoStr?: string) => {
        const historyEntry = `[${analysisPhase === AppPhase.FileLoaded ? 'Global' : infoStr}]`;
        setAxioms(currentAxioms => {
            let updatedAxioms = [...currentAxioms];
            analysis.logic.axioms.forEach(logicAxiom => {
                const translation = analysis.english_translations.axiom_translations.find(t => t.axiom_id === logicAxiom.id);
                if (!translation) return;
                const existingIdx = updatedAxioms.findIndex(a => a.id === logicAxiom.id);
                if (existingIdx !== -1) {
                    updatedAxioms[existingIdx] = {
                        ...updatedAxioms[existingIdx],
                        logic: logicAxiom,
                        translation,
                        history: [...updatedAxioms[existingIdx].history, `${historyEntry} Updated`]
                    };
                } else {
                    updatedAxioms.push({
                        id: logicAxiom.id,
                        status: AxiomStatus.Material,
                        logic: logicAxiom,
                        translation,
                        history: [`${historyEntry} Created`]
                    });
                }
            });
            return updatedAxioms;
        });
        updateGraph(analysis.graph_update);
    }, [updateGraph]);

    const runGlobalAnalysis = useCallback(async () => {
        if (!fileContent) return;
        setPhase(AppPhase.FileLoaded);
        setError(null);
        try {
            const analysis = await analyzeText(fileContent, [], imageData, 'global', null, null, null);
            setGlobalAnalysis(analysis);
            processAnalysisResults(analysis, AppPhase.FileLoaded);
            setPhase(AppPhase.GlobalAnalysisComplete);
        } catch (e: any) {
            setError(e instanceof Error ? e.message : 'Global analysis failed.');
            setPhase(AppPhase.Idle);
        }
    }, [fileContent, imageData, processAnalysisResults]);

    const runConsolidation = useCallback(async () => {
        setPhase(AppPhase.Consolidating);
        try {
            const analysis = await analyzeText("", axioms, null, 'consolidation', globalAnalysis, null, "Consolidation");
            setGlobalAnalysis(prev => analysis); 
            processAnalysisResults(analysis, AppPhase.Consolidating, "Reflection");
            setChunksSinceConsolidation(0);
            setPhase(AppPhase.GlobalAnalysisComplete);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Consolidation failed.');
            setPhase(AppPhase.GlobalAnalysisComplete);
        }
    }, [axioms, globalAnalysis, processAnalysisResults]);

    const runNextChunkAnalysis = useCallback(async () => {
        if (chunksSinceConsolidation >= CONSOLIDATION_INTERVAL) {
            await runConsolidation();
            return;
        }
        if (currentChunkIndex >= textChunks.length) {
            setPhase(AppPhase.IterativeAnalysisComplete);
            setIsAutoIterating(false);
            if (autoIterateRef.current) clearInterval(autoIterateRef.current);
            return;
        }
        setPhase(AppPhase.IterativeAnalysis);
        const chunk = textChunks[currentChunkIndex];
        const chunkInfo = `Chunk ${currentChunkIndex + 1}/${textChunks.length}`;
        const previous = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1] : null;
        try {
            const analysis = await analyzeText(chunk, axioms, null, 'iterative', globalAnalysis, previous, chunkInfo, currentChunkIndex + 1, textChunks.length);
            setAnalysisHistory(prev => [...prev, analysis]);
            processAnalysisResults(analysis, AppPhase.IterativeAnalysis, chunkInfo);
            setCurrentChunkIndex(prev => prev + 1);
            setChunksSinceConsolidation(prev => prev + 1);
            setPhase(AppPhase.GlobalAnalysisComplete);
        } catch (e) {
            setError(e instanceof Error ? e.message : `Iterative analysis failed.`);
            setPhase(AppPhase.GlobalAnalysisComplete);
            setIsAutoIterating(false);
            if (autoIterateRef.current) clearInterval(autoIterateRef.current);
        }
    }, [axioms, globalAnalysis, analysisHistory, currentChunkIndex, textChunks, chunksSinceConsolidation, runConsolidation, processAnalysisResults]);

    const handleStartAnalysis = () => phase === AppPhase.Idle ? runGlobalAnalysis() : runNextChunkAnalysis();

    const handleAutoIterate = () => {
        setIsAutoIterating(true);
        runNextChunkAnalysis();
        autoIterateRef.current = setInterval(() => {
            const btn = document.getElementById('hidden-trigger');
            if (btn) btn.click();
        }, AUTO_ITERATE_DELAY);
    };

    const handleStopAutoIterate = () => {
        setIsAutoIterating(false);
        if (autoIterateRef.current) clearInterval(autoIterateRef.current);
    };

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportSession = useCallback(() => {
        const name = fileName ? fileName.split('.')[0] : 'analysis';
        const exportData: ExportData = { fileContent, fileName, axioms, globalAnalysis, analysisHistory, currentChunkIndex, phase, graphData };
        downloadFile(JSON.stringify(exportData, null, 2), `${name}_full.json`, 'application/json');
    }, [fileContent, fileName, axioms, globalAnalysis, analysisHistory, currentChunkIndex, phase, graphData]);

    const handleExportHTML = useCallback(() => {
        const name = fileName ? fileName.split('.')[0] : 'analysis';
        const axiomHtml = axioms.map(a => `
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-4 transition-all hover:border-cyan-500/30">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">${a.id}</span>
                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">${a.status}</span>
                </div>
                <div class="font-mono text-emerald-400 text-xs bg-black/40 p-3 rounded-lg mb-3 leading-relaxed border border-slate-800">
                    [${a.logic.premises_symbolic.join(', ')}] <span class="text-slate-600">⇒</span> ${a.logic.conclusion_symbolic}
                </div>
                <div class="text-sm text-slate-300 italic font-serif leading-relaxed">
                    ${a.translation.plain_english}
                </div>
            </div>
        `).join('');

        const renderAnalysis = (a: Analysis, title: string, subtitle: string) => `
            <section class="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 md:p-12 mb-16 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                <div class="absolute top-0 right-0 p-8 opacity-5 select-none font-black text-6xl text-slate-500 italic uppercase tracking-tighter">
                    ${title.split(':')[0]}
                </div>
                <header class="border-b border-slate-800 pb-6 mb-10">
                    <h2 class="text-3xl font-black text-white tracking-tight">${title}</h2>
                    <p class="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em] mt-3">${a.dialectical_history.cumulative_arc}</p>
                </header>
                <div class="space-y-12">
                    <div>
                        <h4 class="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-4 flex items-center gap-2">
                             <span class="w-8 h-px bg-slate-800"></span> Synthesis
                        </h4>
                        <p class="text-2xl text-slate-100 font-serif italic leading-snug">${a.prose.summary}</p>
                    </div>
                    <div>
                        <h4 class="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-4 flex items-center gap-2">
                             <span class="w-8 h-px bg-slate-800"></span> Analytical Narrative
                        </h4>
                        <div class="text-slate-300 font-serif leading-relaxed space-y-6 text-lg">
                            ${a.prose.conceptual_narrative.split('\n').map(p => `<p>${p}</p>`).join('')}
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-800/50">
                         <div>
                            <h4 class="text-emerald-500 text-[10px] uppercase font-black tracking-[0.2em] mb-4">Emergent Schema</h4>
                            <div class="flex flex-wrap gap-2">
                                ${a.dialectical_history.concepts_born.map(c => `<span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-lg">${c}</span>`).join('')}
                            </div>
                         </div>
                         <div>
                            <h4 class="text-rose-500 text-[10px] uppercase font-black tracking-[0.2em] mb-4">Aufhebung (Sublations)</h4>
                            <div class="space-y-4">
                                ${a.dialectical_history.concepts_sublated.map(s => `
                                    <div class="text-[11px] flex flex-col gap-1 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <div class="flex items-center gap-2">
                                            <span class="text-rose-500 line-through opacity-50">${s.from}</span>
                                            <span class="text-slate-600 font-black">→</span>
                                            <span class="text-emerald-400 font-bold">${s.into}</span>
                                        </div>
                                        <div class="text-slate-500 italic pl-6 mt-1">— ${s.mechanism}</div>
                                    </div>
                                `).join('')}
                            </div>
                         </div>
                    </div>
                </div>
            </section>
        `;

        const globalHtml = globalAnalysis ? renderAnalysis(globalAnalysis, "The Whole", "Foundational Schema") : "";
        const historyHtml = analysisHistory.map((a, i) => renderAnalysis(a, `Stage ${i+1}`, `Deep Dive ${i+1}`)).join('');

        const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dialectic Snapshot: ${name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,900;1,400&family=Lora:ital,wght@0,400;1,400&display=swap');
        body { font-family: 'Inter', sans-serif; background: #030712; color: #f8fafc; }
        .font-serif { font-family: 'Lora', serif; }
        .font-display { font-family: 'Playfair Display', serif; }
        .bg-noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
    </style>
</head>
<body class="p-4 md:p-12 relative">
    <div class="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>
    <div class="max-w-7xl mx-auto relative z-10">
        <header class="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-12 mb-20 gap-8">
            <div class="max-w-2xl">
                <div class="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4 rounded-full">Formal Dialectic Report</div>
                <h1 class="text-6xl font-display font-black text-white leading-tight mb-4">Interpretation of ${fileName}</h1>
                <p class="text-slate-500 text-sm font-medium leading-relaxed">Derived through iterative polarized modal logic decomposition and hermeneutic reconstruction via the Dialectical Reader Engine.</p>
            </div>
            <div class="text-right border-l border-slate-800 pl-8">
                <p class="text-[9px] text-slate-600 uppercase font-black tracking-[0.4em] mb-2">Generation Epoch</p>
                <p class="text-sm text-slate-400 font-mono">${new Date().toUTCString()}</p>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-16">
            <aside class="lg:col-span-1">
                <div class="sticky top-12">
                    <h3 class="text-slate-500 text-[10px] uppercase font-black tracking-[0.4em] mb-10 flex items-center gap-3">
                         <span class="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[8px] font-bold">∑</span> 
                         Symbolic Corpus
                    </h3>
                    <div class="space-y-6">
                        ${axiomHtml || '<p class="text-slate-600 italic text-sm">No axioms derived in this session.</p>'}
                    </div>
                    
                    <div class="mt-16 p-8 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-md">
                        <h4 class="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-6">PML Reference</h4>
                        <div class="space-y-4 text-[11px] font-mono text-slate-400">
                            <div class="flex justify-between border-b border-slate-800/50 pb-2"><span class="text-cyan-400">s(P)</span> <span>Subjective</span></div>
                            <div class="flex justify-between border-b border-slate-800/50 pb-2"><span class="text-cyan-400">o(P)</span> <span>Objective</span></div>
                            <div class="flex justify-between border-b border-slate-800/50 pb-2"><span class="text-emerald-400">comp_nec</span> <span>Compressive</span></div>
                            <div class="flex justify-between pb-2"><span class="text-rose-400">exp_nec</span> <span>Expansive</span></div>
                        </div>
                    </div>
                </div>
            </aside>
            <main class="lg:col-span-3">
                ${globalHtml}
                ${historyHtml}
                <footer class="mt-32 pt-16 border-t border-slate-800 text-center">
                    <p class="text-[10px] text-slate-600 uppercase font-black tracking-[1em]">Finalized Interpretation</p>
                    <p class="text-slate-800 text-[8px] mt-8 uppercase font-bold">Proof of Concept Snapshot • Dialectical Reader v2.5</p>
                </footer>
            </main>
        </div>
    </div>
</body>
</html>
        `;
        downloadFile(finalHtml, `${name}_dialectical_report.html`, 'text/html');
    }, [fileName, axioms, globalAnalysis, analysisHistory]);

    if (hasKey === null) return <div className="bg-gray-900 min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div></div>;

    if (!hasKey) return (
        <div className="bg-[#0a0c10] text-gray-200 min-h-screen flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-10 shadow-2xl text-center">
                <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg></div>
                <h1 className="text-3xl font-bold text-white mb-4">API Key Required</h1>
                <p className="text-gray-400 mb-8 text-sm">Please select a project with billing enabled to use the Dialectical Reader.</p>
                <button onClick={handleSelectKey} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl transition-all shadow-lg mb-6">Select Gemini Key</button>
                <p className="text-[11px] text-gray-500">See: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a></p>
            </div>
        </div>
    );

    return (
        <div className="bg-[#0a0c10] text-gray-200 min-h-screen font-sans selection:bg-teal-500/30">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <button id="hidden-trigger" onClick={handleStartAnalysis} style={{ display: 'none' }}></button>
                <div className="mb-8">
                    <Controls 
                        phase={phase} fileName={fileName} currentChunk={currentChunkIndex + 1} totalChunks={textChunks.length}
                        onFileChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const content = await readFileContent(file);
                            setFileContent(content);
                            setFileName(file.name);
                        }}
                        onStartAnalysis={handleStartAnalysis} onReset={handleReset} onExportSession={handleExportSession} onExportHTML={handleExportHTML}
                        onAutoIterate={handleAutoIterate} onStopAutoIterate={handleStopAutoIterate} isAutoIterating={isAutoIterating}
                    />
                </div>
                {error && <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl mb-8 flex justify-between items-center"><span className="text-sm font-medium">{error}</span><button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1">✕</button></div>}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 h-[calc(100vh-14rem)] sticky top-24">
                        <AxiomManager axioms={axioms} />
                    </div>
                    <div className="lg:col-span-3">
                        {isAnalyzing ? <Loader phase={phase} /> : (globalAnalysis || analysisHistory.length > 0) ? <AnalysisDisplay globalAnalysis={globalAnalysis} analysisHistory={analysisHistory} graphData={graphData} /> : <div className="flex flex-col items-center justify-center h-full bg-gray-900/50 border-2 border-dashed border-gray-800 rounded-3xl p-16 text-center"><div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6"><svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div><h2 className="text-2xl font-bold text-gray-200">The Hermeneutic Circle</h2><p className="text-gray-500 mt-4 max-sm leading-relaxed text-sm">Upload a philosophical text to initiate the dialectical engine. The reader cycles between the <strong>Whole</strong> (Global Analysis) and the <strong>Part</strong> (Individual Chunks).</p></div>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
