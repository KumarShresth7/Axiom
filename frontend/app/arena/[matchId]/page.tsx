"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import ReactFlow, { Background, Controls, Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import { useWebSocket, WebSocketProvider } from "@/components/providers/WebSocketProvider";
import ArgumentNode from "@/components/ArgumentNode";
import { Send } from "lucide-react";

// Register the custom node type
const nodeTypes = { argument: ArgumentNode };

function ArenaInterface() {
    const { matchId } = useParams();
    const { stompClient, isConnected } = useWebSocket();
    
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [input, setInput] = useState("");
    const [currentUser, setCurrentUser] = useState("");

    // Fetch identity from JWT
    useEffect(() => {
        const token = localStorage.getItem("axiom_token");
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser(payload.sub);
        }
    }, []);

    // WebSocket Subscriptions
    useEffect(() => {
        if (isConnected && stompClient) {
            // 1. Fast Path: Listen for new arguments
            const debateSub = stompClient.subscribe(`/topic/debate/${matchId}`, (msg) => {
                const message = JSON.parse(msg.body);
                
                setNodes((nds) => {
                    const newNode = {
                        id: message.messageId,
                        type: 'argument',
                        position: { x: 250, y: nds.length * 150 + 50 }, // Stack nodes vertically
                        data: { sender: message.sender, content: message.content }
                    };
                    return [...nds, newNode];
                });

                // Link to the previous node automatically
                setEdges((eds) => {
                    if (nodes.length === 0) return eds;
                    const lastNodeId = nodes[nodes.length - 1].id;
                    return addEdge({ id: `e-${lastNodeId}-${message.messageId}`, source: lastNodeId, target: message.messageId, animated: true, style: { stroke: '#4b5563' } }, eds);
                });
            });

            // 2. Slow Path: Listen for AI Fallacy Flags
            const flagSub = stompClient.subscribe(`/topic/debate/${matchId}/flags`, (msg) => {
                const flag = JSON.parse(msg.body);
                
                setNodes((nds) => nds.map(node => {
                    if (node.id === flag.messageId) {
                        // Update node data to trigger the glowing red border
                        return { ...node, data: { ...node.data, fallacyType: flag.fallacyType, explanation: flag.explanation } };
                    }
                    return node;
                }));
            });

            return () => {
                debateSub.unsubscribe();
                flagSub.unsubscribe();
            };
        }
    }, [isConnected, stompClient, matchId, nodes]); // Include nodes to ensure edges connect properly

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !stompClient) return;

        const payload = {
            matchId: matchId,
            sender: currentUser,
            content: input,
            messageId: `msg-${Date.now()}` // Generate a unique ID for the node
        };

        stompClient.publish({
            destination: `/app/debate/${matchId}/say`,
            body: JSON.stringify(payload)
        });

        setInput("");
    };

    return (
        <div className="h-screen w-full flex flex-col bg-[#050505] font-mono">
            {/* Header */}
            <div className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a] z-10">
                <span className="text-white font-bold">Arena: <span className="text-gray-500 text-xs">{matchId}</span></span>
                <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-gray-500">{isConnected ? 'Live' : 'Connecting'}</span>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 relative">
                <ReactFlow 
                    nodes={nodes} 
                    edges={edges} 
                    nodeTypes={nodeTypes}
                    onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
                    onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
                    fitView
                >
                    <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#1a1a1a" />
                    <Controls className="!bg-[#121212] !border-[#222] !fill-gray-400" />
                </ReactFlow>
            </div>

            {/* Input Console */}
            <div className="h-24 border-t border-[#1a1a1a] bg-[#0a0a0a] p-4 z-10">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4 h-full items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Construct your argument..."
                        className="flex-1 bg-[#121212] border border-[#222] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={!isConnected || !input.trim()}
                        className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Send size={18} />
                        TRANSMIT
                    </button>
                </form>
            </div>
        </div>
    );
}

// Wrapper to provide the WebSocket Context
export default function ArenaPage() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setToken(localStorage.getItem("axiom_token"));
    }, []);

    if (!token) return null;

    return (
        <WebSocketProvider token={token}>
            <ArenaInterface />
        </WebSocketProvider>
    );
}