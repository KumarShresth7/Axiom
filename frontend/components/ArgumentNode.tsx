import { Handle, Position } from 'reactflow';
import { ShieldAlert } from 'lucide-react';

export default function ArgumentNode({ data }: any) {
    const isFlagged = !!data.fallacyType;

    return (
        <div className={`relative min-w-[250px] max-w-[350px] p-4 rounded-xl border-2 transition-all duration-500 ${
            isFlagged 
                ? 'bg-[#1a0b12] border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                : 'bg-[#121212] border-[#222]'
        }`}>
            <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-3 !h-3" />
            
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {data.sender}
                </span>
                {isFlagged && (
                    <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase animate-pulse">
                        <ShieldAlert size={12} />
                        Flagged
                    </span>
                )}
            </div>

            <p className="text-gray-200 text-sm font-sans leading-relaxed">
                {data.content}
            </p>

            {isFlagged && (
                <div className="mt-3 pt-3 border-t border-purple-500/30">
                    <p className="text-purple-400 text-xs font-bold mb-1">{data.fallacyType}</p>
                    <p className="text-gray-400 text-[10px] leading-tight">{data.explanation}</p>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !w-3 !h-3" />
        </div>
    );
}