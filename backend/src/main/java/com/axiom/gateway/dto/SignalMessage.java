package com.axiom.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SignalMessage(
        @JsonProperty("matchId") String matchId,
        @JsonProperty("sender") String sender,
        @JsonProperty("type") String type,
        @JsonProperty("data") String data
) {}
