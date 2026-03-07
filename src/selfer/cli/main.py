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

    # Auto-init: check for config.json (not the dir) — logger may pre-create the dir
    if not os.path.exists(os.path.join(selfer_dir, "config.json")) and ctx.invoked_subcommand != "init":
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

    # Check config.json — not the dir (logger may have pre-created .selfer/logs/)
    if os.path.exists(config_path):
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
def start(bot_name):
    """Start Selfer — opens interactive chat and optionally connects Telegram."""
    console.print(BANNER)

    root_dir = os.getcwd()
    selfer_dir = os.path.join(root_dir, ".selfer")
    config_path = os.path.join(selfer_dir, "config.json")

    cfg = _load_config()
    name = bot_name or cfg.get("bot_name", "Selfer")
    llm_cfg = cfg.get("llm", {})
    tg_cfg  = cfg.get("telegram", {})

    # ─── Mode Picker ───────────────────────────────────────────────────────────
    console.print(Panel(
        f"[bold bright_cyan]How do you want to run {name}?[/bold bright_cyan]\n\n"
        "  [bold green][1][/bold green]  Chat only  (CLI interactive terminal)\n"
        "  [bold blue][2][/bold blue]  Chat + Telegram  (both channels, one shared queue)\n",
        border_style="bright_cyan", padding=(1, 3),
    ))
    while True:
        choice = console.input("[bold cyan]Enter 1 or 2 ›[/bold cyan] ").strip()
        if choice in ("1", "2"):
            break
        console.print("[warning]Please enter 1 or 2.[/warning]")

    use_telegram = (choice == "2")

    # ─── LLM Pre-flight ────────────────────────────────────────────────────────
    console.print()
    with console.status("[bold cyan]Checking LLM connection...[/bold cyan]"):
        llm_ok, llm_err = _probe_llm(llm_cfg)

    if not llm_ok:
        provider  = llm_cfg.get("provider", "ollama")
        model     = llm_cfg.get("model", "llama3")
        ollama_url = llm_cfg.get("ollama_url", "http://localhost:11434")

        if provider == "ollama":
            config_hint = (
                f'"llm": {{\n'
                f'    "provider": "ollama",\n'
                f'    "model":    "llama3",        ← or mistral, phi3, etc.\n'
                f'    "ollama_url": "{ollama_url}"  ← make sure Ollama is running\n'
                f'}}'
            )
            action = "Make sure [bold]Ollama is running[/bold] (`ollama serve`) and the model is pulled (`ollama pull llama3`)."
        else:
            key_map = {
                "openai":    "openai_api_key",
                "gemini":    "gemini_api_key",
                "groq":      "groq_api_key",
                "claude":    "anthropic_api_key",
                "anthropic": "anthropic_api_key",
            }
            key_field = key_map.get(provider, f"{provider}_api_key")
            config_hint = (
                f'"llm": {{\n'
                f'    "provider": "{provider}",\n'
                f'    "model":    "{model}",\n'
                f'    "{key_field}": "YOUR_API_KEY_HERE"\n'
                f'}}'
            )
            action = f"Add your [bold]{provider.upper()} API key[/bold] to the config file."

        console.print(Panel(
            f"[error]✘ Could not connect to LLM.[/error]  ({llm_err})\n\n"
            f"[bold]Edit:[/bold] [cyan]{config_path}[/cyan]\n\n"
            f"[dim]{config_hint}[/dim]\n\n"
            f"{action}\n\n"
            f"Then run: [bold green]selfer start[/bold green]",
            title="[bold red] LLM Not Connected [/bold red]",
            border_style="red", padding=(1, 2),
        ))
        raise SystemExit(1)

    console.print(f"[success]✔ LLM connected[/success] [dim]({llm_cfg.get('provider','ollama')} / {llm_cfg.get('model','llama3')})[/dim]")

    # ─── Telegram Pre-flight (mode 2 only) ────────────────────────────────────
    if use_telegram:
        token = tg_cfg.get("bot_token", "").strip()
        if not token:
            console.print(Panel(
                "[error]✘ Telegram bot token is not set.[/error]\n\n"
                f"[bold]Edit:[/bold] [cyan]{config_path}[/cyan]\n\n"
                '[dim]"telegram": {\n'
                '    "enabled": true,\n'
                '    "bot_token": "YOUR_BOT_TOKEN",   ← from @BotFather on Telegram\n'
                '    "authorized_users": ["your_username"]\n'
                '}[/dim]\n\n'
                "Then run: [bold green]selfer start[/bold green]",
                title="[bold red] Telegram Not Configured [/bold red]",
                border_style="red", padding=(1, 2),
            ))
            raise SystemExit(1)

        # Quick token format sanity check
        if ":" not in token or len(token) < 20:
            console.print(Panel(
                "[error]✘ Telegram token looks invalid.[/error]\n"
                "  It should look like: [dim]110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw[/dim]\n\n"
                f"Get one from [bold]@BotFather[/bold] on Telegram and add it to:\n[cyan]{config_path}[/cyan]\n\n"
                "Then run: [bold green]selfer start[/bold green]",
                border_style="red", padding=(1, 2),
            ))
            raise SystemExit(1)

        console.print(f"[success]✔ Telegram token found.[/success] [dim](users: {tg_cfg.get('authorized_users', []) or 'all allowed'})[/dim]")

    # ─── All checks passed → Launch ────────────────────────────────────────────
    console.print()
    console.print(Panel(
        f"[success]⚡ {name} is online.[/success]  [dim]Type 'exit' or Ctrl+C to quit.[/dim]",
        border_style="bright_green",
    ))

    asyncio.run(_run_start_loop(name, use_telegram, root_dir))



# ─── Core Run Loop (async) ─────────────────────────────────────────────────────
async def _run_start_loop(name: str, use_telegram: bool, root_dir: str):
    from selfer.core.queue import queue_manager
    from selfer.core.session import session_manager

    session_manager.initialize(root_dir)
    queue_manager.start_worker()

    # ── Auto-index ChromaDB if missing ──────────────────────────────────────
    chroma_dir = os.path.join(root_dir, ".selfer", "chroma_db")
    if not os.path.exists(chroma_dir):
        console.print("[dim]First run: indexing repository into ChromaDB...[/dim]")
        # Must run in main thread synchronously — HuggingFace embeddings crash in background threads on Windows
        from selfer.memory.memory_search import index_repository
        index_repository(root_dir)

    # ── Signal Handler ──────────────────────────────────────────────────────
    shutdown_event = asyncio.Event()

    def _shutdown_handler():
        console.print("\n[warning]Shutting down...[/warning]")
        session_manager.flush_repo(root_dir)
        shutdown_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _shutdown_handler)
        except (NotImplementedError, RuntimeError):
            pass  # Windows: use KeyboardInterrupt fallback instead

    # ── Launch Tasks ────────────────────────────────────────────────────────
    tasks = [
        asyncio.create_task(_chat_loop(name)),
        asyncio.create_task(shutdown_event.wait()),
    ]

    if use_telegram:
        from selfer.core.telegram import TelegramInterface
        tg = TelegramInterface()
        tasks.append(asyncio.create_task(tg.start_polling()))
        console.print("[dim]Telegram bot connected and listening.[/dim]")

    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass
    except KeyboardInterrupt:
        _shutdown_handler()
    finally:
        await queue_manager.stop_worker()
        session_manager.flush_repo(root_dir)
        console.print("[success]✔ Selfer shut down cleanly.[/success]")


# ─── Interactive Chat Loop (Claude Code-style) ─────────────────────────────────
async def _chat_loop(name: str):
    """
    Full interactive async chat loop.
    - User input is read asynchronously (never blocks the event loop).
    - Each message is enqueued into the shared queue — same queue Telegram uses.
    - If the agent is busy, user sees queue position immediately.
    - When job completes, output is printed to the chat.
    """
    from langchain_core.messages import HumanMessage
    from selfer.core.graph import run_agent_async
    from selfer.core.queue import queue_manager

    loop = asyncio.get_event_loop()

    # Print chat welcome header
    console.print()
    console.rule("[bold cyan]Chat Session Started[/bold cyan]")
    console.print(
        f"  [dim]You are talking to[/dim] [bold bright_cyan]{name}[/bold bright_cyan].\n"
        f"  [dim]Type[/dim] [bold]exit[/bold] [dim]or[/dim] [bold]quit[/bold] [dim]to stop.\n"
        f"  Any message sent from Telegram will also appear in this queue.[/dim]"
    )
    console.print()

    while True:
        try:
            # Read user input without blocking the event loop
            user_input = await loop.run_in_executor(
                None, lambda: _read_input()
            )
        except (EOFError, KeyboardInterrupt):
            break

        if user_input is None:
            break

        text = user_input.strip()
        if not text:
            continue
        if text.lower() in ("exit", "quit", "/exit", "/quit"):
            break

        # Show "you" line
        console.print(f"\n  [bold green]You ›[/bold green] {text}")

        # Enqueue and track
        job_id = queue_manager.enqueue(
            description=text[:60],
            coro=run_agent_async([HumanMessage(content=text)])
        )

        queue_depth = sum(
            1 for j in queue_manager.get_all_jobs()
            if j["status"] in ("Pending", "Running")
        )
        if queue_depth > 1:
            console.print(
                f"  [yellow]⏳ Queued[/yellow] [dim](position {queue_depth} in queue)[/dim]"
            )

        # Animate while waiting
        spinner_chars = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]
        spin_i = 0
        while True:
            j = queue_manager.get_job_status(job_id)
            status = j["status"]
            if status == "Running":
                char = spinner_chars[spin_i % len(spinner_chars)]
                print(
                    f"\r  {char} {name} is thinking...          ",
                    end="", flush=True
                )
                spin_i += 1
            elif status == "Completed":
                print("\r" + " " * 50 + "\r", end="")
                _render_response(name, j.get("result"))
                break
            elif status == "Failed":
                print("\r" + " " * 50 + "\r", end="")
                console.print(f"\n  [error]✘ {name} › {j.get('error', 'Unknown error')}[/error]\n")
                break
            await asyncio.sleep(0.15)

    console.print()
    console.rule("[dim]Chat session ended[/dim]")


def _read_input() -> str | None:
    """Blocking input read — runs in executor so it doesn't block the event loop."""
    try:
        return input("\n  You › ")
    except (EOFError, KeyboardInterrupt):
        return None


def _render_response(name: str, result: dict | None):
    """Pretty-print the agent's response to the chat."""
    if not result:
        console.print(f"\n  [bold bright_cyan]{name} ›[/bold bright_cyan] (no response)\n")
        return

    messages = result.get("messages", [])
    if messages:
        last = messages[-1]
        content = getattr(last, "content", str(last))
        console.print(Panel(
            content,
            title=f"[bold bright_cyan]{name}[/bold bright_cyan]",
            border_style="bright_cyan",
            padding=(0, 2),
        ))
    else:
        console.print(f"\n  [bold bright_cyan]{name} ›[/bold bright_cyan] Done.\n")


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
        ("router",      "Master Supervisor — classifies intent and routes to Planner or Casual."),
        ("planner",     "Task Decomposer — breaks down user objectives into ordered step arrays."),
        ("executor",    "Step Runner — executes each plan step using bound LangChain tools."),
        ("tools",       "Tool Dispatcher — file IO, code search, git, and shell execution."),
        ("interrogate", "User Blocker — pauses graph to request clarification from the user."),
        ("summarizer",  "Context Compactor — compresses oversized histories into concise summaries."),
        ("retriever",   "RAG Engine — queries the ChromaDB vector index for code context."),
    ]
    for n, desc in agent_list:
        table.add_row(n, desc)

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


# ─── config ───────────────────────────────────────────────────────────────────
@cli.command("config")
def show_config():
    """Show the path to and contents of the active config file."""
    root_dir = os.getcwd()
    cfg_path = os.path.join(root_dir, ".selfer", "config.json")
    if not os.path.exists(cfg_path):
        console.print("[warning]No config found. Run [bold]selfer init[/bold] first.[/warning]")
        return

    with open(cfg_path) as f:
        raw = f.read()

    console.print(Panel(
        raw,
        title=f"[bold cyan]{cfg_path}[/bold cyan]",
        border_style="bright_cyan",
    ))


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


def _probe_llm(llm_cfg: dict) -> tuple[bool, str]:
    """Test the LLM connection with a tiny payload."""
    import logging
    from selfer.core.llm import LLMFactory
    from langchain_core.messages import HumanMessage

    try:
        # LLMFactory uses the current config
        llm = LLMFactory.create_llm(
            provider=llm_cfg.get("provider"),
            model_name=llm_cfg.get("model")
        )
        # Send a tiny ping
        audit_log = logging.getLogger("selfer.audit")
        old_level = audit_log.level
        audit_log.setLevel(logging.CRITICAL)  # suppress logs for the ping

        response = llm.invoke([HumanMessage(content="Ping? Reply with exactly 'Pong'")])

        audit_log.setLevel(old_level)
        return True, ""
    except Exception as e:
        err = str(e)
        if "maximum context length" in err.lower():
            return True, ""  # model exists but we messed up the ping, technically a pass
        if "authentication" in err.lower() or "api key" in err.lower() or "401" in err:
            return False, "Invalid API Key"
        if "connection" in err.lower() or "connrefused" in err.lower() or "target machine actively refused it" in err.lower():
            return False, "Connection refused (is the server running?)"
        if "not found" in err.lower() or "404" in err:
            return False, "Model or endpoint not found"
        return False, err


if __name__ == "__main__":
    cli()


