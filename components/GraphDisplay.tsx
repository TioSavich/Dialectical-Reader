import React, { useMemo } from 'react';
import { GraphData } from '../types';

interface GraphDisplayProps {
    graphData: GraphData;
}

const GraphDisplay: React.FC<GraphDisplayProps> = ({ graphData }) => {
    const { nodes, links } = graphData;

    const nodePositions = useMemo(() => {
        const positions = new Map<string, { x: number; y: number }>();
        const width = 500; // SVG viewbox width
        const height = 300; // SVG viewbox height
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40; // Leave some padding for labels
        
        if (nodes.length === 0) {
            return positions;
        }

        const angleStep = (2 * Math.PI) / nodes.length;

        nodes.forEach((node, index) => {
            if (nodes.length === 1) {
                positions.set(node.id, { x: centerX, y: centerY });
            } else {
                const angle = index * angleStep;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                positions.set(node.id, { x, y });
            }
        });

        return positions;
    }, [nodes]);

    if (!nodes || nodes.length === 0) {
        return <p className="text-gray-500 text-center">No graph data to display.</p>;
    }

    return (
        <div className="w-full h-80 flex items-center justify-center">
            <svg viewBox="0 0 500 300" className="w-full h-full">
                <g className="links">
                    {links.map((link, i) => {
                        const sourcePos = nodePositions.get(link.source);
                        const targetPos = nodePositions.get(link.target);
                        if (!sourcePos || !targetPos) return null;
                        return (
                            <line
                                key={`${link.source}-${link.target}-${i}`}
                                x1={sourcePos.x}
                                y1={sourcePos.y}
                                x2={targetPos.x}
                                y2={targetPos.y}
                                className="stroke-current text-gray-600"
                                strokeWidth="1"
                            />
                        );
                    })}
                </g>
                <g className="nodes">
                    {nodes.map((node) => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return null;
                        return (
                            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                <circle r="10" className="fill-current text-teal-500 stroke-current text-gray-900" strokeWidth="2" />
                                <text
                                    y="-15"
                                    textAnchor="middle"
                                    className="fill-current text-gray-200 text-xs font-semibold"
                                >
                                    {node.name || node.id}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};

export default GraphDisplay;
