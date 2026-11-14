package com.axiom.gateway.controller;

import com.axiom.gateway.dto.SignalMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class SignalController {
    private final SimpMessagingTemplate messagingTemplate;

    public SignalController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/debate/{matchId}/signal")
    public void handleSignaling(@DestinationVariable String matchId, @Payload SignalMessage signal) {
        // Broadcast the signal to the specific debate room.
        // In the frontend, we will ignore signals where sender == currentUser
        messagingTemplate.convertAndSend("/topic/debate/" + matchId + "/signal", signal);
    }
}
