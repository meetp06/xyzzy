import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.hooks import policy

# Define custom tools for the Code Reviewer agent
def run_eslint_check(file_path: str) -> str:
    """Runs ESLint on a specific file and returns the output.

    Args:
        file_path: The relative path to the file to check, e.g. "app/page.tsx".
    """
    # Fake command execution inside GCE Linux environment
    print(f"[Code Reviewer] Executing: npm run lint -- --file {file_path}")
    return "ESLint check passed. No warnings or errors found."

async def main():
    # Workspace directory on Google Cloud Linux
    workspace_dir = os.getenv("WORKSPACE_DIR", "/opt/app/adstalk")
    
    # Configure the code reviewer agent
    config = LocalAgentConfig(
        system_instructions=(
            "You are an expert Next.js and TypeScript Code Reviewer Agent. "
            "Your job is to read file changes in the workspace, run ESLint checks, "
            "verify code formatting, and suggest optimizations."
        ),
        workspaces=[workspace_dir],
        capabilities=CapabilitiesConfig(
            enable_subagents=True
        ),
        # Configure safety policies: allow reading files, restrict write operations
        policies=[
            policy.workspace_only([workspace_dir]),
            policy.allow("view_file"),
            policy.allow("search_directory"),
            policy.deny("run_command", when=lambda args: "rm " in args.get("CommandLine", ""))
        ],
        tools=[run_eslint_check]
    )

    print("Initializing Code Reviewer Agent...")
    async with Agent(config) as agent:
        # Prompt the agent to review the main Next.js page
        response = await agent.chat(
            "Please review 'app/page.tsx' to ensure standard imports and proper Next.js 16 components."
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
