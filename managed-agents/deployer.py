import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.hooks import policy

# Define custom tools for the deployment helper
def get_gce_vm_status(instance_name: str) -> str:
    """Retrieves the status of a GCE Compute Engine VM.

    Args:
        instance_name: The name of the GCE instance.
    """
    print(f"[Deployer] Fetching GCE status for: {instance_name}")
    return f"Instance {instance_name} is RUNNING. Zone: us-central1-a. External IP: 34.120.10.15."

def trigger_app_restart() -> str:
    """Restarts the systemd system service running the Next.js production build on Linux."""
    print("[Deployer] Executing: sudo systemctl restart nextjs-app.service")
    return "Service nextjs-app.service restarted successfully."

async def main():
    workspace_dir = os.getenv("WORKSPACE_DIR", "/opt/app/adstalk")
    
    # Configure the deployment agent to run on Google Cloud Linux
    # It requires broader command execution privileges to build and restart services
    config = LocalAgentConfig(
        system_instructions=(
            "You are a DevOps and Deployment Helper Agent. "
            "You run inside a Google Cloud VM. You are responsible for rebuilding the "
            "Next.js site, deploying updates, checking service health, and restarting services if needed."
        ),
        workspaces=[workspace_dir],
        capabilities=CapabilitiesConfig(
            enable_subagents=False
        ),
        # Configure safety policies: allow command execution for deployment purposes, but restrict dangerous commands
        policies=[
            policy.workspace_only([workspace_dir]),
            policy.allow("run_command", when=lambda args: any(cmd in args.get("CommandLine", "") for cmd in ["npm run build", "git pull", "pm2 restart", "systemctl"])),
            policy.deny("run_command", name="block_danger")
        ],
        tools=[get_gce_vm_status, trigger_app_restart]
    )

    print("Initializing DevOps Deployment Agent on GCE Linux...")
    async with Agent(config) as agent:
        response = await agent.chat(
            "Please perform a production deploy. Check the status, pull the latest git changes, run the build, and restart the service."
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
