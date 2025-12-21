import React from 'react';
import { Analysis } from '../types';
import GraphDisplay from './GraphDisplay';

interface AnalysisSectionProps {
    analysis: Analysis;
    title: string;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h4 className="text-md font-semibold text-teal-400 mb-2 border-b border-gray-700 pb-1">{title}</h4>
        {children}
    </div>
);

const AnalysisContent: React.FC<AnalysisSectionProps> = ({ analysis, title }) => {
    return (
         <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-200 mb-4">{title}</h3>

            {title.startsWith('Global') && analysis.graph_data && (
                <Section title="Conceptual Graph">
                    <GraphDisplay graphData={analysis.graph_data} />
                </Section>
            )}

            <Section title="Key Concepts">
                <div className="flex flex-wrap gap-2">
                    {analysis.key_concepts.map((concept, i) => (
                        <span key={i} className="bg-gray-700 text-gray-300 px-3 py-1 text-sm rounded-full">
                            {concept}
                        </span>
                    ))}
                </div>
            </Section>

            <Section title="Proposed Axioms">
                <ul className="space-y-3">
                    {analysis.proposed_axioms.map((axiom, i) => (
                        <li key={i} className="bg-gray-900/50 p-3 rounded-md border border-gray-700">
                            <p className="font-mono text-sm text-cyan-400">
                                [{axiom.premises.join(', ')}] =&gt; {axiom.conclusion}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 italic">"{axiom.rationale}"</p>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="PML Formalizations">
                 <ul className="space-y-2">
                    {analysis.pml_formalizations.map((item, i) => (
                        <li key={i} className="text-sm">
                            <strong className="text-gray-300">{item.concept}:</strong>
                            <span className="font-mono text-blue-400 ml-2">{item.formalization}</span>
                            <p className="text-xs text-gray-500 pl-2 mt-0.5">{item.explanation}</p>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Dialectical Patterns">
                 <ul className="space-y-2">
                    {analysis.dialectical_patterns.map((item, i) => (
                        <li key={i} className="text-sm">
                            <strong className="text-gray-300">{item.pattern} ({item.concepts.join(', ')}):</strong>
                            <span className="text-gray-400 ml-2">{item.description}</span>
                        </li>
                    ))}
                </ul>
            </Section>
        </div>
    );
};

interface AnalysisDisplayProps {
    globalAnalysis: Analysis | null;
    analysisHistory: Analysis[];
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ globalAnalysis, analysisHistory }) => {
    if (!globalAnalysis) {
        return <div className="text-center text-gray-500 py-10">No analysis to display.</div>;
    }

    return (
        <div className="space-y-6">
            <AnalysisContent analysis={globalAnalysis} title="Global Analysis" />
            
            {analysisHistory.map((analysis, index) => (
                <AnalysisContent 
                    key={index} 
                    analysis={analysis}
                    title={`Iterative Analysis: Chunk ${index + 1}`} 
                />
            ))}
        </div>
    );
};

export default AnalysisDisplay;
