"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';

interface WebSocketContextType {
    stompClient: Client | null;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ stompClient: null, isConnected: false });

export const WebSocketProvider = ({ children, token }: { children: React.ReactNode, token: string }) => {
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            brokerURL: 'ws://localhost:8080/axiom-ws',
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            onConnect: () => setIsConnected(true),
            onDisconnect: () => setIsConnected(false),
            onStompError: (frame) => console.error('Broker reported error: ' + frame.headers['message'])
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, [token]);

    return (
        <WebSocketContext.Provider value={{ stompClient, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);