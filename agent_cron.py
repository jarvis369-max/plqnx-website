import asyncio
from main import ensure_schema, run_agent_scheduler

if __name__ == "__main__":
    ensure_schema()
    asyncio.run(run_agent_scheduler(manual=False))
