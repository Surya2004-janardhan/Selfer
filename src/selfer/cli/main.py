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

@cli.command()
def init():
    """Initialize Selfer in the current repository."""
    logger.info("Initializing Selfer workspace...")
    # TODO: Create .selfer directory and structure
    console.print("[bold blue]Workspace initialized successfully.[/bold blue]")

@cli.command()
@click.option('--bot-name', default="selfer", help="Name of the bot persona.")
@click.option('--user-name', default="master", help="Name of the user persona.")
def mode(bot_name, user_name):
    """Set the system persona mode."""
    logger.info(f"Setting operation mode: Bot={bot_name}, User={user_name}")
    console.print(f"[bold yellow]Mode adapted. {bot_name} is now serving {user_name}.[/bold yellow]")

if __name__ == '__main__':
    cli()
