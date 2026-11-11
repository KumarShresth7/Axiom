package com.axiom.gateway.controller;

import com.axiom.gateway.config.RabbitConfig;
import com.axiom.gateway.dto.DebateMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.concurrent.CompletableFuture;

@Controller
public class DebateController {

    private static final Logger log = LoggerFactory.getLogger(DebateController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final RabbitTemplate rabbitTemplate;

    public DebateController(SimpMessagingTemplate messagingTemplate, RabbitTemplate rabbitTemplate) {
        this.messagingTemplate = messagingTemplate;
        this.rabbitTemplate = rabbitTemplate;
    }

    @MessageMapping("/debate/{matchId}/say")
    public void handleArgument(@DestinationVariable String matchId, @Payload DebateMessage message) {
        log.info(">>> SERVER RECEIVED: {} for match: {}", message.content(), matchId);

        // 1. Fast path: Broadcast immediately to WebSocket topic subscribers
        messagingTemplate.convertAndSend("/topic/debate/" + matchId, message);

        // 2. Slow/event path: Publish to RabbitMQ asynchronously without blocking or crashing the fast-path thread
        CompletableFuture.runAsync(() -> {
            try {
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_NAME, RabbitConfig.ROUTING_KEY, message);
            } catch (AmqpException e) {
                log.error("Failed to publish message to RabbitMQ: {}", e.getMessage());
            }
        });
    }

    @MessageExceptionHandler
    public void handleException(Throwable exception) {
        log.error("Unhandled exception in DebateController STOMP handler: {}", exception.getMessage(), exception);
    }
}
