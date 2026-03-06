import os
import json
import asyncio
import signal
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
from selfer.core.config import load_config, save_config, SelferConfig

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
@click.group(invoke_without_command=True)
@click.version_option(version="0.1.0", prog_name="Selfer")
@click.pass_context
def cli(ctx):
    """Selfer — Local-First Autonomous Developer Agent."""
    root_dir = os.getcwd()
    selfer_dir = os.path.join(root_dir, ".selfer")

    # Auto-init: if .selfer/ doesn't exist and user didn't explicitly call init,
    # silently create the workspace so every selfer command just works.
    if not os.path.exists(selfer_dir) and ctx.invoked_subcommand != "init":
        console.print(BANNER)
        console.print(Panel(
            "[warning]No Selfer workspace found. Initializing automatically...[/warning]",
            border_style="yellow",
        ))
        ctx.invoke(init_cmd)
        console.print()

    # If no subcommand given, show help
    if ctx.invoked_subcommand is None:
        console.print(BANNER)
        console.print(ctx.get_help())


# ─── init ─────────────────────────────────────────────────────────────────────
@cli.command("init")
def init_cmd():
    """Initialize Selfer in the current repository."""
    from selfer.memory.database import init_db
    from selfer.core.directory_mapper import DirectoryMapper

    root_dir = os.getcwd()
    selfer_dir = os.path.join(root_dir, ".selfer")
    config_path = os.path.join(selfer_dir, "config.json")

    if os.path.exists(selfer_dir):
        console.print(Panel(
            f"[warning]Already initialized.[/warning]\n  Edit config at: [bold cyan]{config_path}[/bold cyan]",
            border_style="yellow",
        ))
        return

    with Progress(
        SpinnerColumn(style="bold cyan"),
        TextColumn("[step]{task.description}"),
        BarColumn(bar_width=30, style="blue", complete_style="green"),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Creating workspace...", total=4)

        os.makedirs(os.path.join(selfer_dir, "logs"), exist_ok=True)
        os.makedirs(os.path.join(selfer_dir, "sessions"), exist_ok=True)
        progress.advance(task)

        # ── User-editable config with clear descriptions ──────────────
        config = {
            "_comment": "Edit this file to configure Selfer. All fields are optional.",
            "bot_name": "Selfer",
            "user_name": "Master",

            "llm": {
                "_comment": "LLM provider config. Set 'provider' to: ollama | openai | gemini | groq | claude",
                "provider": "ollama",
                "model": "llama3",
                "ollama_url": "http://localhost:11434",
                "openai_api_key": "",
                "gemini_api_key": "",
                "groq_api_key": "",
                "anthropic_api_key": "",
                "max_tokens": 64000,
                "temperature": 0.2
            },

            "telegram": {
                "_comment": "Set bot_token from @BotFather. Add your Telegram username to authorized_users.",
                "enabled": False,
                "bot_token": "",
                "authorized_users": []
            },

            "memory": {
                "chunk_tokens": 400,
                "chunk_overlap": 80,
                "max_results": 6,
                "chroma_collection": "selfer_memory"
            },

            "security": {
                "command_timeout_seconds": 60,
                "max_retries": 3
            },

            "ignore_patterns": [".env", ".git", "node_modules", ".venv", "__pycache__", ".selfer"]
        }

        with open(config_path, "w") as f:
            json.dump(config, f, indent=4)
        progress.advance(task)

        with open(os.path.join(selfer_dir, "session.json"), "w") as f:
            json.dump({"current_plan": [], "current_step": 0, "history": []}, f, indent=4)
        progress.advance(task)

        init_db(root_dir)
        progress.advance(task)

    console.print(Panel(
        f"[success]✔ Selfer workspace ready![/success]\n\n"
        f"  Edit your config: [bold cyan]{config_path}[/bold cyan]\n\n"
        f"  [dim]→ Set your LLM provider (ollama by default)[/dim]\n"
        f"  [dim]→ Add Telegram bot token if you want Telegram support[/dim]\n"
        f"  [dim]→ Add API keys for OpenAI/Gemini/Groq/Claude if not using Ollama[/dim]\n\n"
        f"  Then run: [bold green]selfer start[/bold green]",
        title="[title] Selfer Initialized [/title]",
        border_style="bright_cyan",
        padding=(1, 2),
    ))



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
    from selfer.memory.memory_search import index_repository
    from selfer.core.session import session_manager

    root_dir = os.getcwd()

    # Validate config at startup — fail fast, not mid-task
    cfg = load_config(root_dir)

    # Initialize session manager
    session_manager.initialize(root_dir)

    # Auto-init ChromaDB if repo has been initialized but never indexed
    chroma_dir = os.path.join(root_dir, ".selfer", "chroma_db")
    if not os.path.exists(chroma_dir):
        console.print("[dim]Auto-indexing repository into ChromaDB...[/dim]")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, index_repository, root_dir)
        console.print("[success]✔ ChromaDB auto-index complete.[/success]")

    queue_manager.start_worker()
    console.print("[info]Event queue worker started.[/info]")

    # ─── Graceful Shutdown Handler ─────────────────────────────────────────────
    shutdown_event = asyncio.Event()

    def _shutdown_handler():
        console.print("\n[warning]Signal received — flushing sessions and shutting down...[/warning]")
        session_manager.flush_repo(root_dir)
        shutdown_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _shutdown_handler)
        except (NotImplementedError, RuntimeError):
            # Windows: signal handlers not supported in event loop
            pass

    tasks = []
    if not no_telegram:
        tg = TelegramInterface()
        tasks.append(asyncio.create_task(tg.start_polling()))

    tasks.append(asyncio.create_task(_cli_input_loop(name)))
    tasks.append(asyncio.create_task(shutdown_event.wait()))

    try:
        # Stop on first completed task (either CLI exit or shutdown signal)
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass
    finally:
        await queue_manager.stop_worker()
        session_manager.flush_repo(root_dir)
        console.print("[success]✔ Selfer shut down cleanly.[/success]")


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


