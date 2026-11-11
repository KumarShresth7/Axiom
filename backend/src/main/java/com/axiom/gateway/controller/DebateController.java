package com.axiom.gateway.controller;

import com.axiom.gateway.config.RabbitConfig;
import com.axiom.gateway.dto.DebateMessage;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;

public class DebateController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RabbitTemplate rabbitTemplate;

    public DebateController(SimpMessagingTemplate messagingTemplate, RabbitTemplate rabbitTemplate) {
        this.messagingTemplate = messagingTemplate;
        this.rabbitTemplate = rabbitTemplate;
    }

    @MessageMapping("/debate/{matchId}/say")
    public void handleArgument(@DestinationVariable String matchId, @Payload DebateMessage message) {
        System.out.println(">>> SERVER RECEIVED: " + message.content() + " for match: " + matchId);
        messagingTemplate.convertAndSend("/topic/debate/" + matchId, message);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_NAME, RabbitConfig.ROUTING_KEY, message);
    }


}
