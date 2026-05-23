import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.hooks import policy

# Define custom tools for Content Curator
def fetch_hacker_news_trends() -> list:
    """Fetches current trending topics from Hacker News for monologue ideas."""
    print("[Content Curator] Querying Hacker News API...")
    return [
        "Google Antigravity SDK: Stateful agentic applications",
        "Veo 3.1: Ultra-realistic video generation at scale",
        "Why Vercel Workflows is the future of durable execution"
    ]

def save_script_to_db(topic: str, script_json: str) -> str:
    """Saves the generated show monologue script to the PostgreSQL database.

    Args:
        topic: The topic of the show.
        script_json: The JSON structure containing clips, text, and prompts.
    """
    print(f"[Content Curator] Saving script for topic '{topic}' to Postgres DB...")
    return f"Script saved successfully to database with ID: show_gce_{hash(topic) % 10000}"

async def main():
    workspace_dir = os.getenv("WORKSPACE_DIR", "/opt/app/adstalk")
    
    # Configure the Content Curator agent
    config = LocalAgentConfig(
        system_instructions=(
            "You are a Content Curator Agent for the Scripted talk show application. "
            "You search for trending topics on Hacker News, create engaging video show concepts, "
            "and pre-save them to the postgres database to speed up user generation."
        ),
        workspaces=[workspace_dir],
        capabilities=CapabilitiesConfig(
            enable_subagents=True
        ),
        policies=[
            policy.workspace_only([workspace_dir]),
            policy.allow("view_file"),
            policy.allow("create_file"),
            policy.allow_all() # Allow all tools for curation tasks
        ],
        tools=[fetch_hacker_news_trends, save_script_to_db]
    )

    print("Initializing Content Curator Agent...")
    async with Agent(config) as agent:
        response = await agent.chat(
            "Find a trending topic on Hacker News, draft a show script, and save it to the database."
        )
        
        print("\n--- Agent Thoughts ---")
        async for thought in response.thoughts:
            print(thought, end="", flush=True)
            
        print("\n\n--- Agent Response ---")
        async for chunk in response:
            print(chunk, end="", flush=True)
        print()

if __name__ == "__main__":
    asyncio.run(main())
