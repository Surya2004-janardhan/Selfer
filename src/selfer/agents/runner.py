import os
import subprocess
from pydantic import BaseModel, Field

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()

class CommandInput(BaseModel):
    command: str = Field(description="The shell command to execute in the repository.")

def execute_command(command: str, root_dir: str = None) -> str:
    """
    Executes a shell command. 
    Implements security heurustics blocking inherently destructive or escaping commands.
    """
    if root_dir is None:
        root_dir = os.getcwd()
        
    logger.info(f"Runner evaluating command: `{command}`")
    
    # Security Heuristics
    risky_patterns = [
        "rm -rf /", 
        "mkfs", 
        "dd if=", 
        "> /dev/sda", 
        ":(){ :|:& };:" # Fork bomb
    ]
    
    for pattern in risky_patterns:
        if pattern in command:
            logger.warning(f"BLOCKED: Command contains strictly prohibited pattern: {pattern}")
            return f"Error: Execution blocked due to security heuristic. Pattern matched: {pattern}"
            
    # In a full Telegram flow, any 'rm' might prompt an approval Ask hook to the User, 
    # similar to OpenClaw's execApprovals flow. For MVP logic, we just run safely isolated in CWD.
    
    try:
        result = subprocess.run(
            command,
            cwd=root_dir,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60 # Max execution time limits
        )
        
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        
        output = []
        if stdout:
            output.append(f"STDOUT:\n{stdout}")
        if stderr:
            output.append(f"STDERR:\n{stderr}")
            
        if result.returncode == 0:
            logger.info("Command completed successfully.")
            return "Command executed successfully.\n" + "\n".join(output)
        else:
            logger.warning(f"Command failed with code {result.returncode}.")
            return f"Command failed with exit code {result.returncode}.\n" + "\n".join(output)
            
    except subprocess.TimeoutExpired:
        logger.error(f"Command '{command}' timed out after 60s.")
        return "Error: Command execution timed out after 60 seconds."
    except Exception as e:
        logger.error(f"Execution error: {e}")
        return f"Error executing command: {e}"
