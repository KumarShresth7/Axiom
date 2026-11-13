"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WebSocketProvider, useWebSocket } from "@/components/providers/WebSocketProvider";
import { Activity, Crosshair } from "lucide-react";

// The inner interface that utilizes the active WebSocket connection
function LobbyInterface() {
    const { stompClient, isConnected } = useWebSocket();
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isConnected && stompClient) {
            // Subscribe to the user's private queue for matchmaking events
            const subscription = stompClient.subscribe('/user/queue/match', (message) => {
                const matchData = JSON.parse(message.body);
                // When the Java server pairs us, route instantly to the arena
                router.push(`/arena/${matchData.matchId}`);
            });

            return () => subscription.unsubscribe();
        }
    }, [isConnected, stompClient, router]);

    const joinQueue = async () => {
        setIsSearching(true);
        const token = localStorage.getItem("axiom_token");
        
        try {
            await fetch("http://localhost:8080/api/match/join", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error("Failed to join queue", error);
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-mono selection:bg-yellow-500/30">
            <div className="w-full max-w-md p-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-2xl relative overflow-hidden text-center">
                {/* Connection Status Indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {isConnected ? "Uplink Active" : "Connecting..."}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`} />
                </div>

                <div className="mb-10 mt-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Axiom Lobby</h2>
                    <p className="text-gray-500 text-sm">Global ELO Rating: <span className="text-yellow-500 font-bold">1200</span></p>
                </div>

                {!isSearching ? (
                    <button
                        onClick={joinQueue}
                        disabled={!isConnected}
                        className="group relative w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-4 rounded transition-all duration-300 hover:bg-yellow-100 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Crosshair size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                        FIND MATCH
                    </button>
                ) : (
                    <div className="py-4 border border-[#222] rounded bg-[#121212] flex flex-col items-center justify-center gap-4">
                        <Activity size={24} className="text-yellow-500 animate-pulse" />
                        <span className="text-gray-300 text-sm tracking-widest uppercase">Calculating Opponent...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// The main page component acts as a gatekeeper and layout wrapper
export default function LobbyPage() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem("axiom_token");
        if (!storedToken) {
            router.push("/"); // Boot unauthenticated users back to login
        } else {
            setToken(storedToken);
        }
    }, [router]);

    if (!token) return null; // Prevent hydration flashes

    return (
        <WebSocketProvider token={token}>
            <LobbyInterface />
        </WebSocketProvider>
    );
}