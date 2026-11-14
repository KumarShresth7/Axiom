"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ReactFlow, { Background, Controls, Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";
import { useWebSocket, WebSocketProvider } from "@/components/providers/WebSocketProvider";
import ArgumentNode from "@/components/ArgumentNode";
import { Send, Mic, MicOff, Video } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";

const nodeTypes = { argument: ArgumentNode };

function ArenaInterface() {
    const { matchId } = useParams();
    const { stompClient, isConnected } = useWebSocket();
    
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [input, setInput] = useState("");
    const [currentUser, setCurrentUser] = useState("");
    
    // WebRTC & A/V State
    const { localStream, remoteStream } = useWebRTC(matchId as string, currentUser, stompClient, isConnected);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    
    // Speech-to-Text State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Fetch identity from JWT
    useEffect(() => {
        const token = localStorage.getItem("axiom_token");
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser(payload.sub);
        }
    }, []);

    // Bind WebRTC streams to video elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(err => console.log("Local video play notice:", err));
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(err => console.log("Remote video play notice:", err));
        }
    }, [remoteStream]);

    // Initialize Web Speech API
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = "";
                    let interimTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (interimTranscript) {
                        setInput(interimTranscript); // Show live transcription in the input box
                    }

                    if (finalTranscript.trim()) {
                        // Automatically transmit when a sentence is completed
                        transmitMessage(finalTranscript.trim());
                        setInput(""); 
                    }
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === "no-speech") {
                        return; // Ignore brief silence timeouts without stopping
                    }
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
        
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [stompClient, currentUser, matchId]); // Re-bind when connection drops/establishes

    const toggleMicrophone = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setInput("");
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // STOMP Routing logic (Fast Path + Slow Path)
    useEffect(() => {
        if (isConnected && stompClient) {
            const debateSub = stompClient.subscribe(`/topic/debate/${matchId}`, (msg) => {
                const message = JSON.parse(msg.body);
                setNodes((nds) => {
                    const newNode = {
                        id: message.messageId,
                        type: 'argument',
                        position: { x: 250, y: nds.length * 150 + 50 },
                        data: { sender: message.sender, content: message.content }
                    };
                    return [...nds, newNode];
                });
                setEdges((eds) => {
                    if (nodes.length === 0) return eds;
                    const lastNodeId = nodes[nodes.length - 1].id;
                    return addEdge({ id: `e-${lastNodeId}-${message.messageId}`, source: lastNodeId, target: message.messageId, animated: true, style: { stroke: '#4b5563' } }, eds);
                });
            });

            const flagSub = stompClient.subscribe(`/topic/debate/${matchId}/flags`, (msg) => {
                const flag = JSON.parse(msg.body);
                setNodes((nds) => nds.map(node => {
                    if (node.id === flag.messageId) {
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
    }, [isConnected, stompClient, matchId, nodes]);

    const transmitMessage = (content: string) => {
        if (!content.trim() || !stompClient) return;
        const payload = {
            matchId: matchId,
            sender: currentUser,
            content: content,
            messageId: `msg-${Date.now()}`
        };
        stompClient.publish({
            destination: `/app/debate/${matchId}/say`,
            body: JSON.stringify(payload)
        });
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transmitMessage(input);
        setInput("");
    };

    return (
        <div className="h-screen w-full flex flex-col bg-[#050505] font-mono relative overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a] z-20">
                <span className="text-white font-bold">Axiom A/V Arena <span className="text-purple-500">.</span></span>
                <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-gray-500">{isConnected ? 'Live' : 'Connecting'}</span>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                </div>
            </div>

            {/* Floating WebRTC Video Panel */}
            <div className="absolute top-20 right-6 z-20 flex flex-col gap-4">
                <div className="relative w-64 h-40 bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-gray-300 flex items-center gap-2">
                        <Video size={10} className="text-yellow-500" /> Opponent
                    </div>
                </div>
                <div className="relative w-48 h-32 bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-xl self-end">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-gray-300">You</div>
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 relative z-10">
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

            {/* Voice & Manual Input Console */}
            <div className="h-24 border-t border-[#1a1a1a] bg-[#0a0a0a] p-4 z-20">
                <form onSubmit={handleManualSubmit} className="max-w-5xl mx-auto flex gap-4 h-full items-center">
                    <button 
                        type="button"
                        onClick={toggleMicrophone}
                        className={`p-3 rounded-lg flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-[#121212] text-gray-400 border border-[#222] hover:text-white'}`}
                    >
                        {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening for your argument..." : "Type your argument manually..."}
                        className={`flex-1 bg-[#121212] border border-[#222] text-white px-4 py-3 rounded-lg focus:outline-none transition-all ${isListening ? 'border-red-500/50' : 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50'}`}
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