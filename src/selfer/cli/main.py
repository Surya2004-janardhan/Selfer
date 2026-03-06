import os
import json
import asyncio
import click
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.live import Live
from rich.spinner import Spinner
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.theme import Theme
from rich.align import Align

# ─── Selfer Theme ─────────────────────────────────────────────────────────────
selfer_theme = Theme({
    "info":     "bold cyan",
    "success":  "bold green",
    "warning":  "bold yellow",
    "error":    "bold red",
    "step":     "bold blue",
    "dim":      "dim white",
    "title":    "bold bright_cyan on dark_blue",
})

console = Console(theme=selfer_theme)

BANNER = """
[bold bright_cyan]
 ██████╗███████╗██╗     ███████╗███████╗██████╗ 
██╔════╝██╔════╝██║     ██╔════╝██╔════╝██╔══██╗
╚█████╗ █████╗  ██║     █████╗  █████╗  ██████╔╝
 ╚═══██╗██╔══╝  ██║     ██╔══╝  ██╔══╝  ██╔══██╗
██████╔╝███████╗███████╗██║     ███████╗██║  ██║
╚═════╝ ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
[/bold bright_cyan][dim]  Local-First Autonomous Developer Agent[/dim]
"""


# ─── CLI Group ────────────────────────────────────────────────────────────────
@click.group()
@click.version_option(version="0.1.0", prog_name="Selfer")
def cli():
    """Selfer — Local-First Autonomous Developer Agent."""
    pass


# ─── init ─────────────────────────────────────────────────────────────────────
@cli.command()
def init():
    """Initialize Selfer in the current repository."""
    from selfer.memory.database import init_db
    from selfer.memory.memory_search import index_repository
    from selfer.core.directory_mapper import DirectoryMapper

    root_dir = os.getcwd()
    selfer_dir = os.path.join(root_dir, ".selfer")

    console.print(BANNER)

    if os.path.exists(selfer_dir):
        console.print("[warning]Workspace already initialized.[/warning]")
        return

    with Progress(
        SpinnerColumn(style="bold cyan"),
        TextColumn("[step]{task.description}"),
        BarColumn(bar_width=30, style="blue", complete_style="green"),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Setting up workspace...", total=5)

        os.makedirs(selfer_dir, exist_ok=True)
        os.makedirs(os.path.join(selfer_dir, "logs"), exist_ok=True)
        progress.advance(task)

        config = {
            "bot_name": "Selfer",
            "user_name": "Master",
            "preferred_model": "llama3",
            "fallback_model": "gpt-4o",
            "ignore_patterns": [".env", ".git", "node_modules", ".venv", "__pycache__"],
            "authorized_telegram_users": [],
        }
        with open(os.path.join(selfer_dir, "config.json"), "w") as f:
            json.dump(config, f, indent=4)
        progress.advance(task)

        session = {"current_plan": [], "current_step": 0, "is_active": False, "history": []}
        with open(os.path.join(selfer_dir, "session.json"), "w") as f:
            json.dump(session, f, indent=4)
        progress.advance(task)

        init_db(root_dir)
        progress.advance(task)

        mapper = DirectoryMapper(root_dir)
        mapper.save_map()
        progress.advance(task)

    console.print(Panel(
        f"[success]✔ Selfer workspace initialized at[/success] [bold cyan]{selfer_dir}[/bold cyan]",
        title="[title] Selfer Init [/title]",
        border_style="bright_cyan",
    ))

    # Non-blocking background index
    console.print("[dim]Indexing repository into ChromaDB in background...[/dim]")
    asyncio.run(_background_index(root_dir))


async def _background_index(root_dir: str):
    from selfer.memory.memory_search import index_repository
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, index_repository, root_dir)
    console.print("[success]✔ ChromaDB index complete.[/success]")


# ─── start ────────────────────────────────────────────────────────────────────
@cli.command()
@click.option("--bot-name", default=None, help="Override bot persona name.")
@click.option("--no-telegram", is_flag=True, default=False, help="Disable Telegram polling.")
def start(bot_name, no_telegram):
    """Start Selfer — activates queue, CLI loop, and Telegram bot."""
    from selfer.core.queue import queue_manager
    from selfer.core.telegram import TelegramInterface

    console.print(BANNER)

    cfg = _load_config()
    name = bot_name or cfg.get("bot_name", "Selfer")

    console.print(Panel(
        f"[success]⚡ {name} is online and waiting for your command, Master.[/success]",
        border_style="bright_green",
    ))

    asyncio.run(_run_start_loop(name, no_telegram))


async def _run_start_loop(name: str, no_telegram: bool):
    from selfer.core.queue import queue_manager
    from selfer.core.telegram import TelegramInterface

    queue_manager.start_worker()
    console.print("[info]Event queue worker started.[/info]")

    tasks = []
    if not no_telegram:
        tg = TelegramInterface()
        tasks.append(asyncio.create_task(tg.start_polling()))

    tasks.append(asyncio.create_task(_cli_input_loop(name)))

    try:
        await asyncio.gather(*tasks)
    except (KeyboardInterrupt, asyncio.CancelledError):
        console.print("\n[warning]Shutting down Selfer...[/warning]")
        await queue_manager.stop_worker()


async def _cli_input_loop(name: str):
    """Async CLI input loop — reads tasks and enqueues them into the event queue."""
    from langchain_core.messages import HumanMessage
    from selfer.core.graph import run_agent_async
    from selfer.core.queue import queue_manager

    console.print("[dim]Type your instruction (or 'exit' to quit):[/dim]")
    loop = asyncio.get_event_loop()

    while True:
        user_input = await loop.run_in_executor(None, lambda: input("\n[selfer] > "))

        if user_input.strip().lower() in ("exit", "quit"):
            break

        if not user_input.strip():
            continue

        job_id = queue_manager.enqueue(
            description=user_input[:60],
            coro=run_agent_async([HumanMessage(content=user_input)])
        )

        with Live(Spinner("dots2", text=f"  [cyan]Job [{job_id}] queued...[/cyan]"), console=console, refresh_per_second=10) as live:
            while True:
                status = queue_manager.get_job_status(job_id)
                if status["status"] == "Running":
                    live.update(Spinner("dots2", text=f"  [blue]Running [{job_id}]: {status['description']}...[/blue]"))
                elif status["status"] in ("Completed", "Failed"):
                    break
                await asyncio.sleep(0.3)

        final = queue_manager.get_job_status(job_id)
        if final["status"] == "Completed":
            console.print(Panel(
                f"[success]✔ Task Completed[/success]",
                border_style="green",
            ))
        else:
            console.print(Panel(
                f"[error]✘ Task Failed:[/error] {final['error']}",
                border_style="red",
            ))


# ─── status ───────────────────────────────────────────────────────────────────
@cli.command()
def status():
    """Show status of all queued and running jobs."""
    from selfer.core.queue import queue_manager

    jobs = queue_manager.get_all_jobs()
    if not jobs:
        console.print("[dim]No jobs found in the event queue.[/dim]")
        return

    table = Table(title="Selfer Job Queue", border_style="bright_cyan", header_style="bold blue")
    table.add_column("ID", style="cyan", width=10)
    table.add_column("Description", style="white")
    table.add_column("Status", style="green")
    table.add_column("Error", style="red")

    for j in jobs:
        status_color = {
            "Pending": "[yellow]Pending[/yellow]",
            "Running": "[blue]Running[/blue]",
            "Completed": "[green]Completed[/green]",
            "Failed": "[red]Failed[/red]",
        }.get(j["status"], j["status"])
        table.add_row(j["id"], j["description"], status_color, j.get("error") or "—")

    console.print(table)


# ─── queue ────────────────────────────────────────────────────────────────────
@cli.command("queue")
@click.argument("task_description")
def enqueue(task_description):
    """Directly enqueue a task by description."""
    from langchain_core.messages import HumanMessage
    from selfer.core.graph import run_agent_async
    from selfer.core.queue import queue_manager

    job_id = queue_manager.enqueue(
        description=task_description,
        coro=run_agent_async([HumanMessage(content=task_description)])
    )
    console.print(f"[success]✔ Job [{job_id}] enqueued:[/success] {task_description}")


# ─── mode ─────────────────────────────────────────────────────────────────────
@cli.command()
@click.option("--bot-name", default="Selfer", help="The AI bot persona name.")
@click.option("--user-name", default="Master", help="The user's name to respond to.")
def mode(bot_name, user_name):
    """Set the runtime session persona."""
    cfg = _load_config()
    cfg["bot_name"] = bot_name
    cfg["user_name"] = user_name
    _save_config(cfg)
    console.print(Panel(
        f"[success]Mode updated.[/success]\n  Bot: [bold cyan]{bot_name}[/bold cyan]\n  User: [bold blue]{user_name}[/bold blue]",
        border_style="blue",
    ))


# ─── agents ───────────────────────────────────────────────────────────────────
@cli.command()
def agents():
    """List all registered Selfer agents and their descriptions."""
    table = Table(title="Registered Selfer Agents", border_style="bright_cyan", header_style="bold blue")
    table.add_column("Agent", style="bold cyan", width=20)
    table.add_column("Description", style="white")

    agent_list = [
        ("router", "Master Supervisor — classifies intent and routes to Planner or Casual."),
        ("planner", "Task Decomposer — breaks down user objectives into ordered step arrays."),
        ("executor", "Step Runner — executes each plan step using bound LangChain tools."),
        ("tools", "Tool Dispatcher — file IO, code search, git, and shell execution."),
        ("interrogate", "User Blocker — pauses graph to request clarification from the user."),
        ("summarizer", "Context Compactor — compresses oversized histories into concise summaries."),
        ("retriever", "RAG Engine — queries the ChromaDB vector index for code context."),
    ]
    for name, desc in agent_list:
        table.add_row(name, desc)

    console.print(table)


# ─── index ────────────────────────────────────────────────────────────────────
@cli.command()
def index():
    """Re-index the repository into the ChromaDB vector store."""
    from selfer.memory.memory_search import index_repository

    root_dir = os.getcwd()
    console.print("[info]Starting ChromaDB repository re-index...[/info]")

    with Progress(
        SpinnerColumn(style="bold cyan"),
        TextColumn("[step]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Indexing files...", total=None)
        index_repository(root_dir)
        progress.stop()

    console.print("[success]✔ Repository re-indexed successfully.[/success]")


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _load_config() -> dict:
    cfg_path = os.path.join(os.getcwd(), ".selfer", "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path) as f:
            return json.load(f)
    return {}

def _save_config(cfg: dict):
    cfg_path = os.path.join(os.getcwd(), ".selfer", "config.json")
    with open(cfg_path, "w") as f:
        json.dump(cfg, f, indent=4)


if __name__ == "__main__":
    cli()
