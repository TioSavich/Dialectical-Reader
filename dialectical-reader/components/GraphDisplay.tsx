
import React, { useRef, useEffect } from 'react';
// @ts-ignore - imported from importmap
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData } from '../types';

interface GraphDisplayProps {
    graphData: GraphData;
}

const GraphDisplay: React.FC<GraphDisplayProps> = ({ graphData }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    if (!graphData.nodes || graphData.nodes.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-gray-900/20 rounded-xl border border-gray-800">
                <p className="text-gray-600 text-xs uppercase tracking-widest font-bold">Establishing Conceptual Lattice...</p>
            </div>
        );
    }

    // Map relations to colors
    const getLinkColor = (label?: string) => {
        switch (label) {
            case 'sublates': return '#10b981'; // green
            case 'implies': return '#3b82f6';  // blue
            case 'contradicts': return '#ef4444'; // red
            default: return '#4b5563'; // gray
        }
    };

    return (
        <div ref={containerRef} className="w-full h-80 relative bg-black/20 rounded-xl border border-gray-800 overflow-hidden">
            <div className="absolute top-3 left-3 z-10 text-[10px] text-gray-500 font-bold uppercase tracking-widest pointer-events-none">
                Hermeneutic Circle visualization
            </div>
            <ForceGraph2D
                graphData={graphData}
                width={containerRef.current?.clientWidth || 600}
                height={320}
                backgroundColor="rgba(0,0,0,0)"
                nodeLabel="id"
                nodeColor={() => '#14b8a6'}
                nodeRelSize={6}
                linkColor={(link: any) => getLinkColor(link.label)}
                linkLabel="label"
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={(d: any) => (d.label === 'sublates' ? 0.01 : 0.005)}
                linkWidth={1.5}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.id;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5);

                    ctx.fillStyle = 'rgba(10, 12, 16, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - 8, bckgDimensions[0], bckgDimensions[1]);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(label, node.x, node.y - 8);

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                    ctx.fillStyle = '#14b8a6';
                    ctx.fill();
                }}
            />
        </div>
    );
};

export default GraphDisplay;
