import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function execChildProcess(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout, stderr };
  } catch (error: any) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message 
    };
  }
}
