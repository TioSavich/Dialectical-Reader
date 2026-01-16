
import React from 'react';
import { AppPhase } from '../types';
import { UploadIcon, PlayIcon, RefreshIcon, DownloadIcon, StopIcon, HTMLIcon } from './icons';

interface ControlsProps {
    phase: AppPhase;
    fileName: string | null;
    currentChunk: number;
    totalChunks: number;
    isAutoIterating: boolean;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onStartAnalysis: () => void;
    onReset: () => void;
    onExportSession: () => void;
    onExportHTML: () => void;
    onAutoIterate: () => void;
    onStopAutoIterate: () => void;
}

const Controls: React.FC<ControlsProps> = ({
    phase,
    fileName,
    currentChunk,
    totalChunks,
    isAutoIterating,
    onFileChange,
    onStartAnalysis,
    onReset,
    onExportSession,
    onExportHTML,
    onAutoIterate,
    onStopAutoIterate,
}) => {
    const isAnalyzing = phase === AppPhase.FileLoaded || phase === AppPhase.IterativeAnalysis || phase === AppPhase.Consolidating;
    const isIdle = phase === AppPhase.Idle;
    const isFinished = phase === AppPhase.IterativeAnalysisComplete;
    const canAnalyze = phase === AppPhase.GlobalAnalysisComplete;
    
    // Show report export button if a file is loaded, even if analysis hasn't finished.
    // However, we only enable it once there is at least one analysis stage complete.
    const showReportButton = !!fileName;
    const canExportReport = phase !== AppPhase.Idle && phase !== AppPhase.FileLoaded;

    return (
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 flex flex-col lg:flex-row justify-between items-center gap-6 shadow-2xl backdrop-blur-md">
            {/* Left: File Management */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
                <label 
                    htmlFor="file-upload" 
                    className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95 ${isAnalyzing || isAutoIterating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <UploadIcon />
                    <span>{fileName ? 'Change Text' : 'Load Philosophy'}</span>
                </label>
                <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf,.txt,.md,.tex,.json" disabled={isAnalyzing || isAutoIterating} />
                {fileName && (
                    <div className="flex flex-col">
                        <span className="text-gray-300 text-sm font-medium truncate max-w-[150px]">{fileName}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Source Document</span>
                    </div>
                )}
            </div>

            {/* Center: Progress & Main Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-center">
                <div className="flex items-center gap-3">
                    {isAutoIterating ? (
                         <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full">
                            <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                                Processing Stage {currentChunk} / {totalChunks}
                            </span>
                         </div>
                    ) : canAnalyze ? (
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Global Schema Built • Ready for Stage {currentChunk}
                        </div>
                    ) : isFinished ? (
                         <div className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                             Full Dialectic Complete
                         </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {isAutoIterating ? (
                        <button onClick={onStopAutoIterate} className="px-5 py-2.5 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95">
                            <StopIcon />
                            <span>Pause Engine</span>
                        </button>
                    ) : (
                        <>
                            {isIdle && fileName && (
                                <button onClick={onStartAnalysis} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(20,184,166,0.2)] flex items-center gap-2 active:scale-95">
                                    <PlayIcon />
                                    <span>Begin Global Analysis</span>
                                </button>
                            )}
                            {canAnalyze && (
                                 <div className="flex gap-2">
                                    <button onClick={onStartAnalysis} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95">
                                        <PlayIcon />
                                        <span>Next Stage</span>
                                    </button>
                                    <button onClick={onAutoIterate} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95">
                                        <PlayIcon />
                                        <span>Complete All</span>
                                    </button>
                                 </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right: Export & Utilities */}
            <div className="flex items-center gap-2 border-l border-gray-700/50 pl-4 w-full lg:w-auto justify-end">
                {showReportButton && (
                    <button 
                        onClick={onExportHTML} 
                        disabled={isAnalyzing || !canExportReport}
                        className="px-4 py-2 bg-gray-700/50 hover:bg-teal-600 hover:text-white text-teal-400 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-30 border border-gray-600/50"
                        title={canExportReport ? "Export a standalone beautiful HTML report" : "Start analysis to generate a report"}
                    >
                        <HTMLIcon />
                        <span className="text-xs uppercase tracking-wider">Export Report</span>
                    </button>
                )}
                
                <button 
                    onClick={onExportSession} 
                    disabled={!showReportButton || isAnalyzing} 
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all disabled:opacity-30" 
                    title="Export Session (JSON Data)"
                >
                    <DownloadIcon />
                </button>
                
                <button 
                    onClick={onReset} 
                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all" 
                    title="Reset All"
                >
                    <RefreshIcon />
                </button>
            </div>
        </div>
    );
};

export default Controls;
