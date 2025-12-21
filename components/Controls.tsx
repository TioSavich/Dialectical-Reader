import React from 'react';
import { AppPhase } from '../types';
import { UploadIcon, PlayIcon, RefreshIcon, DownloadIcon, StopIcon } from './icons';

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
    onAutoIterate,
    onStopAutoIterate,
}) => {
    const isAnalyzing = phase === AppPhase.FileLoaded || phase === AppPhase.IterativeAnalysis;
    const isIdle = phase === AppPhase.Idle;
    const isFinished = phase === AppPhase.IterativeAnalysisComplete;
    const canAnalyze = phase === AppPhase.GlobalAnalysisComplete;

    return (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
                <label htmlFor="file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${isAnalyzing || isAutoIterating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <UploadIcon />
                    <span>{fileName ? 'Change File' : 'Upload File'}</span>
                </label>
                <input id="file-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf,.txt,.md,.tex,.json" disabled={isAnalyzing || isAutoIterating} />
                {fileName && <span className="text-gray-400 text-sm truncate max-w-[10rem] sm:max-w-xs">{fileName}</span>}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
                {isAutoIterating ? (
                     <span className="text-sm text-teal-400 animate-pulse">
                        Auto-analyzing chunk {currentChunk} of {totalChunks}...
                    </span>
                ) : canAnalyze ? (
                    <span className="text-sm text-gray-400">
                        Ready for chunk {currentChunk} of {totalChunks}.
                    </span>
                ) : isFinished ? (
                     <span className="text-sm text-green-400">
                        Analysis Complete ({totalChunks}/{totalChunks}).
                    </span>
                ) : null}

                {isAutoIterating ? (
                    <button onClick={onStopAutoIterate} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors inline-flex items-center gap-2">
                        <StopIcon />
                        <span>Stop Analysis</span>
                    </button>
                ) : (
                    <>
                        {isIdle && fileName && (
                            <button onClick={onStartAnalysis} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                                <PlayIcon />
                                <span>Start Global Analysis</span>
                            </button>
                        )}
                        {canAnalyze && (
                             <>
                                <button onClick={onStartAnalysis} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                                    <PlayIcon />
                                    <span>Analyze Next Chunk</span>
                                </button>
                                <button onClick={onAutoIterate} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors inline-flex items-center gap-2">
                                    <PlayIcon />
                                    <span>Analyze All Remaining</span>
                                </button>
                             </>
                        )}
                    </>
                )}
                 {(phase !== AppPhase.Idle || fileName) && (
                     <>
                        <button onClick={onExportSession} disabled={phase === AppPhase.Idle || isAnalyzing} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Export Session">
                            <DownloadIcon />
                        </button>
                        <button onClick={onReset} className="p-2 text-gray-400 hover:text-white transition-colors" title="Reset">
                            <RefreshIcon />
                        </button>
                     </>
                 )}
            </div>
        </div>
    );
};

export default Controls;
