import os from 'os'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'

const exec = promisify(child_process.exec)

export type SandboxOptions = {
  root?: string // project root to copy into sandbox
}

export async function createSandbox(root: string = process.cwd()) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'selfer-sandbox-'))

  // Copy repo to sandbox, exclude node_modules and .git for speed/safety
  const entries = await fs.promises.readdir(root)
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue
    const src = path.join(root, entry)
    const dest = path.join(tmpDir, entry)
    await copyRecursive(src, dest)
  }

  return tmpDir
}

async function copyRecursive(src: string, dest: string) {
  const stat = await fs.promises.stat(src)
  if (stat.isDirectory()) {
    await fs.promises.mkdir(dest, { recursive: true })
    const children = await fs.promises.readdir(src)
    for (const child of children) {
      if (child === 'node_modules' || child === '.git') continue
      await copyRecursive(path.join(src, child), path.join(dest, child))
    }
  } else {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    await fs.promises.copyFile(src, dest)
  }
}

export async function executeInSandbox(toolName: string, params: any, opts?: { dryRun?: boolean, root?: string }) {
  const dryRun = opts?.dryRun ?? true
  const sandboxRoot = await createSandbox(opts?.root || process.cwd())

  try {
    if (toolName === 'write_file') {
      const files = params.files || []
      const diffs: Array<{ path: string, before: string | null, after: string }> = []
      for (const f of files) {
        const abs = path.join(sandboxRoot, f.path)
        let before: string | null = null
        try { before = await fs.promises.readFile(abs, 'utf8') } catch { before = null }
        await fs.promises.mkdir(path.dirname(abs), { recursive: true })
        if (!dryRun) await fs.promises.writeFile(abs, f.content, 'utf8')
        diffs.push({ path: f.path, before, after: f.content })
      }
      return { success: true, dryRun, sandboxRoot, diffs }
    }

    if (toolName === 'rename_file') {
      const oldPath = path.join(sandboxRoot, params.old_path)
      const newPath = path.join(sandboxRoot, params.new_path)
      if (dryRun) return { success: true, dryRun, sandboxRoot, action: `rename ${params.old_path} -> ${params.new_path}` }
      await fs.promises.mkdir(path.dirname(newPath), { recursive: true })
      await fs.promises.rename(oldPath, newPath)
      return { success: true, dryRun: false, sandboxRoot }
    }

    if (toolName === 'run_cmd') {
      const cmd = params.command
      if (dryRun) return { success: true, dryRun, sandboxRoot, action: `would run: ${cmd}` }
      const cwd = params.cwd ? path.join(sandboxRoot, params.cwd) : sandboxRoot
      const res = await exec(cmd, { cwd, timeout: params.timeout || 0 })
      return { success: true, dryRun: false, stdout: res.stdout, stderr: res.stderr }
    }

    // Default: not implemented in sandbox
    return { success: false, error: 'Tool not supported by sandbox' }
  } finally {
    // Note: we keep sandbox for inspection. Caller may remove it explicitly.
  }
}

export async function removeSandbox(sandboxRoot: string) {
  // best-effort recursive rm
  try {
    await fs.promises.rm(sandboxRoot, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export default { createSandbox, executeInSandbox, removeSandbox }
