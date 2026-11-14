package com.axiom.gateway.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Service
public class MatchmakingService {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String QUEUE_KEY = "axiom:matchmaking:queue";

    public MatchmakingService(StringRedisTemplate redisTemplate, SimpMessagingTemplate messagingTemplate) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    // Called when a user clicks "Find Match"
    public void joinQueue(String userEmail, double eloRating) {
        redisTemplate.opsForZSet().add(QUEUE_KEY, userEmail, eloRating);
        System.out.println(userEmail + " joined the queue with ELO " + eloRating);
    }

    @Scheduled(fixedDelay = 2000)
    public void processQueue() {
        // Fetch everyone in the queue, sorted by ELO
        Set<ZSetOperations.TypedTuple<String>> waitingPlayers =
                redisTemplate.opsForZSet().rangeWithScores(QUEUE_KEY, 0, -1);

        if (waitingPlayers == null || waitingPlayers.size() < 2) {
            return; // Not enough players online
        }

        ZSetOperations.TypedTuple<String> previousPlayer = null;

        for (ZSetOperations.TypedTuple<String> currentPlayer : waitingPlayers) {
            if (previousPlayer != null) {
                double scoreDiff = Math.abs(currentPlayer.getScore() - previousPlayer.getScore());

                // If ELO difference is within 150, pair them up
                if (scoreDiff <= 150) {
                    String matchId = UUID.randomUUID().toString();
                    System.out.println("Match found: " + matchId + " between "
                            + previousPlayer.getValue() + " and " + currentPlayer.getValue());

                    // Remove both from the Redis queue immediately so they aren't double-booked
                    redisTemplate.opsForZSet().remove(QUEUE_KEY, previousPlayer.getValue(), currentPlayer.getValue());

                    // Construct the routing payload
                    String payload = "{\"matchId\":\"" + matchId + "\"}";

                    // Broadcast the match UUID to Player 1's private STOMP queue
                    messagingTemplate.convertAndSendToUser(previousPlayer.getValue(), "/queue/match", payload);

                    // Broadcast the match UUID to Player 2's private STOMP queue
                    messagingTemplate.convertAndSendToUser(currentPlayer.getValue(), "/queue/match", payload);

                    // Reset to find the next pair in the set
                    previousPlayer = null;
                    continue;
                }
            }
            previousPlayer = currentPlayer;
        }
    }
}