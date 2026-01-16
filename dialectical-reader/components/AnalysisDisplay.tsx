
import React, { useState } from 'react';
import { Analysis, GraphData } from '../types';
import GraphDisplay from './GraphDisplay';

const PMLLegend: React.FC = () => (
    <div className="bg-gray-900/80 border border-gray-700 p-4 rounded-lg mb-6 text-xs">
        <h4 className="text-teal-400 font-bold mb-3 uppercase tracking-widest">PML Notation Legend</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
                <p className="text-gray-400 font-bold">Contexts</p>
                <ul className="text-gray-500 space-y-1">
                    <li><code className="text-cyan-400">s(P)</code>: Subjective</li>
                    <li><code className="text-cyan-400">o(P)</code>: Objective</li>
                    <li><code className="text-cyan-400">n(P)</code>: Normative</li>
                </ul>
            </div>
            <div>
                <p className="text-gray-400 font-bold">Modalities</p>
                <ul className="text-gray-500 space-y-1">
                    <li><code className="text-purple-400">comp_nec</code>: Compressive Necessity</li>
                    <li><code className="text-purple-400">exp_nec</code>: Expansive Necessity</li>
                </ul>
            </div>
            <div>
                <p className="text-gray-400 font-bold">Polarity</p>
                <ul className="text-gray-500 space-y-1">
                    <li><span className="text-green-400">Compressive</span>: Synthesis/Det.</li>
                    <li><span className="text-orange-400">Expansive</span>: Analysis/Dissol.</li>
                </ul>
            </div>
        </div>
    </div>
);

interface AnalysisContentProps {
    analysis: Analysis;
    title: string;
    isGlobal?: boolean;
    graphData?: GraphData;
}

const AnalysisContent: React.FC<AnalysisContentProps> = ({ analysis, title, isGlobal, graphData }) => {
    const [tab, setTab] = useState<'prose' | 'logic' | 'history'>('prose');

    return (
         <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-xl overflow-hidden mb-8">
            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-gray-100">{title}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">{analysis.dialectical_history.cumulative_arc}</p>
                </div>
                <div className="flex gap-2">
                    {(['prose', 'logic', 'history'] as const).map(t => (
                        <button 
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === t ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {tab === 'prose' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isGlobal && graphData && (
                            <div className="mb-6 bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                                <GraphDisplay graphData={graphData} />
                            </div>
                        )}
                        <div>
                            <h4 className="text-teal-400 font-bold mb-2 uppercase text-[10px] tracking-widest border-b border-gray-800 pb-1">Thesis Summary</h4>
                            <p className="text-xl text-gray-100 leading-relaxed font-serif italic">
                                {analysis.prose.summary}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-teal-400 font-bold mb-2 uppercase text-[10px] tracking-widest border-b border-gray-800 pb-1">Conceptual Narrative</h4>
                            <div className="text-gray-300 leading-relaxed space-y-4 text-base font-serif">
                                {analysis.prose.conceptual_narrative.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                            </div>
                        </div>
                        {analysis.prose.interpretive_notes && (
                            <div className="bg-blue-900/10 border-l-4 border-blue-500/50 p-4 rounded-r">
                                <h4 className="text-blue-400 font-bold mb-1 uppercase text-[10px] tracking-widest">Interpretive Gloss</h4>
                                <p className="text-sm text-gray-400 leading-relaxed italic">{analysis.prose.interpretive_notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'logic' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <PMLLegend />
                        <div>
                            <h4 className="text-teal-400 font-bold mb-4 uppercase text-[10px] tracking-widest border-b border-gray-800 pb-1">Formal Axioms</h4>
                            <div className="grid gap-4">
                                {analysis.logic.axioms.map(axiom => (
                                    <div key={axiom.id} className="bg-black/40 p-5 rounded-lg border border-gray-700 group hover:border-teal-500/50 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-gray-500 font-mono text-[10px]">SYMBOLIC: {axiom.id}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${axiom.polarity === 'compressive' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                {axiom.polarity}
                                            </span>
                                        </div>
                                        <div className="font-mono text-cyan-400 text-lg mb-3">
                                            [{axiom.premises_symbolic.join(', ')}] <span className="text-gray-600">=&gt;</span> {axiom.conclusion_symbolic}
                                        </div>
                                        <div className="text-sm text-gray-400 font-serif border-t border-gray-800 pt-3">
                                            {analysis.english_translations.axiom_translations.find(t => t.axiom_id === axiom.id)?.plain_english || "No translation provided."}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'history' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-teal-900/10 p-5 rounded-lg border border-teal-800/30">
                            <h4 className="text-teal-400 font-bold mb-2 uppercase text-[10px] tracking-widest">Dialectical Trajectory</h4>
                            <p className="text-teal-500 font-semibold">{analysis.dialectical_history.cumulative_arc}</p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-green-400 font-bold mb-3 uppercase text-[10px] tracking-widest">Emergent Concepts</h4>
                                <ul className="flex flex-wrap gap-2">
                                    {analysis.dialectical_history.concepts_born.length > 0 ? analysis.dialectical_history.concepts_born.map(c => (
                                        <li key={c} className="bg-green-900/30 text-green-300 px-2 py-1 text-xs rounded border border-green-700/50">{c}</li>
                                    )) : <span className="text-gray-600 italic text-xs">None in this stage</span>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-blue-400 font-bold mb-3 uppercase text-[10px] tracking-widest">Preserved Stability</h4>
                                <ul className="flex flex-wrap gap-2">
                                    {analysis.dialectical_history.concepts_preserved.length > 0 ? analysis.dialectical_history.concepts_preserved.map(c => (
                                        <li key={c} className="bg-blue-900/30 text-blue-300 px-2 py-1 text-xs rounded border border-blue-700/50">{c}</li>
                                    )) : <span className="text-gray-600 italic text-xs">None in this stage</span>}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-red-400 font-bold mb-3 uppercase text-[10px] tracking-widest">Conceptual Sublations (Aufhebung)</h4>
                            <div className="space-y-4">
                                {analysis.dialectical_history.concepts_sublated.length > 0 ? analysis.dialectical_history.concepts_sublated.map((s, i) => (
                                    <div key={i} className="bg-gray-900/40 p-4 rounded-lg border border-red-900/20 flex flex-col sm:flex-row gap-4">
                                        <div className="sm:w-1/3 flex items-center justify-center font-bold text-gray-200">
                                            <span className="text-red-500/80 line-through decoration-red-500/50">{s.from}</span>
                                            <span className="mx-3 text-gray-600">→</span>
                                            <span className="text-green-500">{s.into}</span>
                                        </div>
                                        <div className="sm:w-2/3 text-sm text-gray-400 border-l border-gray-700 pl-4 italic leading-relaxed">
                                            {s.mechanism}
                                        </div>
                                    </div>
                                )) : <div className="text-gray-600 italic text-sm text-center py-4">Conceptual structure remained stable in this stage.</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface AnalysisDisplayProps {
    globalAnalysis: Analysis | null;
    analysisHistory: Analysis[];
    graphData: GraphData;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ globalAnalysis, analysisHistory, graphData }) => {
    if (!globalAnalysis) return null;

    return (
        <div className="space-y-12 pb-24">
            <AnalysisContent analysis={globalAnalysis} title="The Whole: Global Analysis" isGlobal graphData={graphData} />
            {analysisHistory.map((a, i) => (
                <AnalysisContent key={i} analysis={a} title={`The Part: Stage ${i + 1}`} />
            ))}
        </div>
    );
};

export default AnalysisDisplay;
