package com.axiom.gateway.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    public static final String EXCHANGE_NAME = "debate.events.exchange";
    public static final String QUEUE_NAME = "debate.events.queue";
    public static final String ROUTING_KEY = "debate.say";

    @Bean
    public DirectExchange debateExchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue debateQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Bean
    public Binding binding(Queue debateQueue, DirectExchange debateExchange) {
        return BindingBuilder.bind(debateQueue).to(debateExchange).with(ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
