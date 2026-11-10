package com.axiom.gateway.config;

import com.axiom.gateway.security.AuthChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final AuthChannelInterceptor authChannelInterceptor;

    public WebSocketConfig(AuthChannelInterceptor authChannelInterceptor) {
        this.authChannelInterceptor = authChannelInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The endpoint the React client will connect to
        registry.addEndpoint("/axiom-ws")
                .setAllowedOriginPatterns("*"); // In production, restrict to your frontend domain
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // /topic for public audience broadcasts, /queue for private messages
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages sent from client to server (e.g., /app/debate/...)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authChannelInterceptor);
    }
}
