import { execSync } from 'node:child_process'
import { platform } from 'node:os'

const port = process.argv[2]
if (!port) process.exit(0)

if (platform() !== 'win32') process.exit(0)

try {
  const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
  const pids = new Set(
    out
      .split('\n')
      .filter((line) => line.includes('LISTENING'))
      .map((line) => line.trim().split(/\s+/).pop())
      .filter(Boolean),
  )
  for (const pid of pids) {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
  }
} catch {
  // port not in use
}
