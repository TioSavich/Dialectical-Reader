
import React, { useState } from 'react';
import { Axiom, AxiomStatus } from '../types';
import { BookOpenIcon } from './icons';

const getStatusStyles = (status: AxiomStatus) => {
    switch (status) {
        case AxiomStatus.Material:
            return { badge: 'bg-green-900/50 text-green-300 border-green-700/50', card: 'border-gray-700/80 opacity-100' };
        case AxiomStatus.Formal:
            return { badge: 'bg-blue-900/50 text-blue-300 border-blue-700/50', card: 'border-blue-900/50 bg-blue-900/10' };
        case AxiomStatus.Stale:
            return { badge: 'bg-red-900/50 text-red-300 border-red-700/50', card: 'border-red-900/30 bg-red-900/10 opacity-75' };
        case AxiomStatus.Refined:
             return { badge: 'bg-purple-900/50 text-purple-300 border-purple-700/50', card: 'border-purple-900/50 bg-purple-900/10' };
        default:
            return { badge: 'bg-gray-700 text-gray-300', card: 'border-gray-700' };
    }
};

const AxiomCard: React.FC<{ axiom: Axiom }> = ({ axiom }) => {
    const styles = getStatusStyles(axiom.status);
    
    return (
        <li className={`bg-gray-800/60 p-4 rounded-lg border transition-all hover:shadow-lg ${styles.card}`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-mono text-gray-500">{axiom.id}</p>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${styles.badge}`}>
                    {axiom.status}
                </span>
            </div>
            
            <div className="flex flex-col gap-1">
                {axiom.status === AxiomStatus.Stale ? (
                     <p className="font-mono text-base text-gray-500 line-through decoration-red-500/50">
                        {axiom.conclusion}
                    </p>
                ) : (
                    <p className="font-mono text-base text-cyan-300">
                         <span className="text-gray-500 text-xs block mb-1">[{axiom.premises.join(', ')}] =&gt;</span>
                         {axiom.conclusion}
                    </p>
                )}
            </div>

            <p className="text-sm text-gray-400 italic mt-2 border-l-2 border-gray-700 pl-2">
                "{axiom.rationale}"
            </p>
            
            <div className="mt-3 pt-2 border-t border-gray-700/50">
                <details className="group">
                    <summary className="text-xs text-gray-500 font-semibold cursor-pointer hover:text-gray-300 select-none">
                        View History ({axiom.history.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                        {axiom.history.map((h, i) => (
                            <li key={i} className="text-xs text-gray-500 font-mono">{h}</li>
                        ))}
                    </ul>
                </details>
            </div>
        </li>
    );
};

const AxiomManager: React.FC<{ axioms: Axiom[] }> = ({ axioms }) => {
    const [showStale, setShowStale] = useState(false);

    const filteredAxioms = showStale 
        ? axioms 
        : axioms.filter(a => a.status !== AxiomStatus.Stale);

    return (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 bg-gray-800/70 border-b border-gray-700 flex items-center justify-between sticky top-0 backdrop-blur-sm z-10 rounded-t-lg">
                <div className="flex items-center gap-2">
                     <BookOpenIcon />
                    <h3 className="text-lg font-semibold text-teal-300">Axioms</h3>
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{filteredAxioms.length}</span>
                </div>
                <div className="flex items-center">
                    <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer hover:text-gray-200">
                        <input 
                            type="checkbox" 
                            checked={showStale} 
                            onChange={e => setShowStale(e.target.checked)}
                            className="rounded bg-gray-700 border-gray-600 text-teal-600 focus:ring-teal-500 focus:ring-offset-gray-800"
                        />
                        Show Stale
                    </label>
                </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                {axioms.length > 0 ? (
                    <ul className="space-y-4">
                        {filteredAxioms.slice().reverse().map(axiom => (
                           <AxiomCard key={axiom.id} axiom={axiom} />
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                        <BookOpenIcon />
                        <p className="mt-2">Knowledge base empty.</p>
                        <p className="text-xs mt-1">Start analysis to generate axioms.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AxiomManager;
