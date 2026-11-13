import pika
import json
import os
from typing import TypedDict, Optional
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, END

load_dotenv()

class DebateState(TypedDict):
    event: dict         
    has_fallacy: bool
    fallacy_type: Optional[str]
    explanation: Optional[str]

llm = ChatGroq(temperature=0, model_name="llama3-8b-8192")

def evaluate_argument(state: DebateState):
    event = state["event"]
    argument = event.get("content", "")
    
    parser = JsonOutputParser()
    prompt = PromptTemplate(
        template="""You are an expert debate moderator. Analyze the following argument for logical fallacies.
        Argument: "{argument}"
        
        If there is a clear logical fallacy (e.g., Ad Hominem, Straw Man, Red Herring, Appeal to Emotion, False Dilemma), flag it. 
        Respond ONLY with a valid JSON object matching this schema:
        {{
            "hasFallacy": true/false,
            "fallacyType": "Name of fallacy or null",
            "explanation": "Brief 1-sentence explanation or null"
        }}
        \n{format_instructions}""",
        input_variables=["argument"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    chain = prompt | llm | parser
    result = chain.invoke({"argument": argument})
    
    return {
        "has_fallacy": result.get("hasFallacy", False),
        "fallacy_type": result.get("fallacyType"),
        "explanation": result.get("explanation")
    }

workflow = StateGraph(DebateState)
workflow.add_node("evaluate", evaluate_argument)
workflow.set_entry_point("evaluate")
workflow.add_edge("evaluate", END)
ai_moderator_app = workflow.compile()

def process_message(ch, method, properties, body):
    try:
        event = json.loads(body)
        print(f"\n[AI Moderator] Evaluating message from {event.get('sender')}: '{event.get('content')}'")
        
        initial_state = {"event": event}
        result_state = ai_moderator_app.invoke(initial_state)
        
        if result_state.get("has_fallacy"):
            flag_event = {
                "matchId": event.get("matchId"),
                "messageId": event.get("messageId"),
                "fallacyType": result_state.get("fallacy_type"),
                "explanation": result_state.get("explanation")
            }
            
            ch.basic_publish(
                exchange='',
                routing_key='ai.flags.queue',
                body=json.dumps(flag_event)
            )
            print(f"[AI Moderator] 🚩 Flagged! {flag_event['fallacyType']} -> Broadcasted to Audience")
        else:
            print("[AI Moderator] ✅ Argument is clean.")
            
    except Exception as e:
        print(f"[AI Moderator] Error processing message: {e}")

def main():
    print("Starting Axiom AI Moderator (LangGraph + Groq)...")
    
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue='debate.events.queue', durable=True)
    channel.queue_declare(queue='ai.flags.queue', durable=True)

    channel.basic_consume(
        queue='debate.events.queue', 
        on_message_callback=process_message, 
        auto_ack=True
    )

    print("Axiom AI Moderator is online. Waiting for real-time debates...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("\nShutting down AI Moderator...")
        channel.stop_consuming()
    
    connection.close()

if __name__ == "__main__":
    main()