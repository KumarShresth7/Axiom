package com.axiom.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DebateMessage(
        @JsonProperty("matchId") String matchId,
        @JsonProperty("sender") String sender,
        @JsonProperty("content") String content,
        @JsonProperty("messageId") String messageId
) {
}
