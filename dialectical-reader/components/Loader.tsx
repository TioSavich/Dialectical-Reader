
import React from 'react';
import { AppPhase } from '../types';

interface LoaderProps {
    phase: AppPhase;
}

const Loader: React.FC<LoaderProps> = ({ phase }) => {
    const messages = {
        [AppPhase.FileLoaded]: "Performing Global Analysis...",
        [AppPhase.GlobalAnalysisComplete]: "Performing Iterative Deep Dive...",
        [AppPhase.IterativeAnalysis]: "Performing Iterative Deep Dive...",
        [AppPhase.IterativeAnalysisComplete]: "Analysis Complete.",
        [AppPhase.Consolidating]: "Hermeneutic Reflection (Part-to-Whole)...",
        [AppPhase.Idle]: "Preparing...",
        [AppPhase.AutoIterating]: "Auto-Iterating..."
    }

    const subMessages = {
        [AppPhase.FileLoaded]: "The AI is reading the entire text to find the main conceptual structure.",
        [AppPhase.GlobalAnalysisComplete]: "The AI is now focusing on a specific section to refine its understanding.",
        [AppPhase.IterativeAnalysis]: "The AI is reading a specific section to identify new dialectical shifts.",
        [AppPhase.Consolidating]: "The AI is using recent Axioms (Parts) to redefine the Global Context (Whole) and prune the system.",
        [AppPhase.IterativeAnalysisComplete]: "All chunks have been processed.",
        [AppPhase.Idle]: "Waiting for input...",
        [AppPhase.AutoIterating]: "Processing..."
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
            <svg className="animate-spin h-12 w-12 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-gray-300">{messages[phase] || "Processing..."}</p>
            <p className="text-gray-500">{subMessages[phase] || "Please wait."}</p>
        </div>
    );
};

export default Loader;
