package com.axiom.gateway.service;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AiModeratorListener {

    private final SimpMessagingTemplate messagingTemplate;

    public AiModeratorListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @RabbitListener(queues = "ai.flags.queue")
    public void receiveAiFlag(Map<String, Object> flagEvent) {
        String matchId = (String) flagEvent.get("matchId");
        System.out.println(">>> AI FLAG RECEIVED for match " + matchId + ": " + flagEvent.get("fallacyType"));

        // Push the fallacy flag to the specific debate room's UI
        messagingTemplate.convertAndSend("/topic/debate/" + matchId + "/flags", (Object) flagEvent);
    }
}