package com.axiom.gateway.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Service
public class MatchmakingService {
    private static final String QUEUE_KEY = "axiom:matchmaking:queue";
    private final StringRedisTemplate redisTemplate;
    public MatchmakingService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

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
            return; // Not enough players
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

                    // Remove both from the queue
                    redisTemplate.opsForZSet().remove(QUEUE_KEY, previousPlayer.getValue(), currentPlayer.getValue());

                    // TODO: Publish MatchFound event to these specific users via STOMP /queue

                    previousPlayer = null; // Reset for the next pair
                    continue;
                }
            }
            previousPlayer = currentPlayer;
        }
    }


}
