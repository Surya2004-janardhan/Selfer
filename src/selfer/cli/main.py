import click
from selfer.core.logger import logger, console

@click.group()
@click.version_option()
def cli():
    """Selfer - Intelligent Local-First Developer Agent."""
    pass

@cli.command()
def start():
    """Start the Selfer agent session."""
    logger.info("Starting Selfer session...")
    console.print("[bold green]Selfer is alive and waiting for Master.[/bold green]")

import os
import json
from selfer.memory.database import init_db
from selfer.memory.models import Base # Ensure models are loaded
from selfer.core.directory_mapper import DirectoryMapper

@cli.command()
def init():
    """Initialize Selfer in the current repository."""
    logger.info("Initializing Selfer workspace...")
    root_dir = os.getcwd()
    selfer_dir = os.path.join(root_dir, '.selfer')

    if os.path.exists(selfer_dir):
        console.print("[yellow]Workspace is already initialized.[/yellow]")
        return
        
    os.makedirs(selfer_dir, exist_ok=True)
    os.makedirs(os.path.join(selfer_dir, 'logs'), exist_ok=True)
    
    config_defaults = {
        "bot_name": "Selfer",
        "user_name": "Master",
        "preferred_model": "llama3",
        "fallback_model": "gpt-4o",
        "ignore_patterns": [".env", ".git", "node_modules", ".venv", "__pycache__"]
    }
    
    session_defaults = {
        "current_plan": [],
        "current_step": 0,
        "is_active": False,
        "history": []
    }
    
    with open(os.path.join(selfer_dir, 'config.json'), 'w') as f:
        json.dump(config_defaults, f, indent=4)
        
    with open(os.path.join(selfer_dir, 'session.json'), 'w') as f:
        json.dump(session_defaults, f, indent=4)
        
    init_db(root_dir)
    
    # Generate the initial map payload
    mapper = DirectoryMapper(root_dir)
    mapper.save_map()
        
    console.print(f"[bold blue]Workspace initialized successfully at {selfer_dir}[/bold blue]")

@cli.command()
@click.option('--bot-name', default="selfer", help="Name of the bot persona.")
@click.option('--user-name', default="master", help="Name of the user persona.")
def mode(bot_name, user_name):
    """Set the system persona mode."""
    logger.info(f"Setting operation mode: Bot={bot_name}, User={user_name}")
    console.print(f"[bold yellow]Mode adapted. {bot_name} is now serving {user_name}.[/bold yellow]")

if __name__ == '__main__':
    cli()
