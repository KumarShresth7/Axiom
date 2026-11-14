import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

export function useWebRTC(matchId: string, currentUser: string, stompClient: Client | null, isConnected: boolean) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);

    // STUN servers help browsers find their public IP addresses
    const rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    // 1. Immediately acquire local camera & microphone
    useEffect(() => {
        let stream: MediaStream | null = null;
        let isMounted = true;

        const getMedia = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (isMounted) {
                    setLocalStream(stream);
                } else {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Failed to access camera/microphone:", err);
            }
        };

        getMedia();

        return () => {
            isMounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 2. Setup WebRTC PeerConnection and STOMP signaling once connected and localStream is ready
    useEffect(() => {
        if (!stompClient || !isConnected || !localStream || !currentUser || !matchId) return;

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnection.current = pc;

        // Add local tracks to the connection
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        // Listen for remote tracks
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        // Send ICE candidates to the opponent via Spring Boot
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                stompClient.publish({
                    destination: `/app/debate/${matchId}/signal`,
                    body: JSON.stringify({
                        matchId,
                        sender: currentUser,
                        type: 'ice',
                        data: JSON.stringify(event.candidate)
                    })
                });
            }
        };

        // Subscribe to incoming WebRTC signals
        const subscription = stompClient.subscribe(`/topic/debate/${matchId}/signal`, async (msg) => {
            try {
                const signal = JSON.parse(msg.body);
                if (signal.sender === currentUser) return; // Ignore our own signals

                if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    stompClient.publish({
                        destination: `/app/debate/${matchId}/signal`,
                        body: JSON.stringify({
                            matchId,
                            sender: currentUser,
                            type: 'answer',
                            data: JSON.stringify(answer)
                        })
                    });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
                } else if (signal.type === 'ice') {
                    await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(signal.data)));
                }
            } catch (e) {
                console.error("Error processing WebRTC signal:", e);
            }
        });

        // Trigger offer after brief delay to let subscriptions settle
        const timer = setTimeout(async () => {
            try {
                if (pc.remoteDescription) return; // Already received an offer from opponent
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                stompClient.publish({
                    destination: `/app/debate/${matchId}/signal`,
                    body: JSON.stringify({
                        matchId,
                        sender: currentUser,
                        type: 'offer',
                        data: JSON.stringify(offer)
                    })
                });
            } catch (err) {
                console.error("Error creating WebRTC offer:", err);
            }
        }, 1500);

        return () => {
            clearTimeout(timer);
            subscription.unsubscribe();
            pc.close();
            peerConnection.current = null;
        };
    }, [stompClient, isConnected, localStream, currentUser, matchId]);

    return { localStream, remoteStream };
}