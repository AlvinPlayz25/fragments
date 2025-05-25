import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { command, sandboxId } = await req.json()

  try {
    const sandbox = await Sandbox.reconnect(sandboxId)
    const { stdout, stderr } = await sandbox.commands.run(command)
    
    return new Response(JSON.stringify({
      output: [...stdout, ...stderr].filter(Boolean)
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Terminal command error:', error)
    return new Response(JSON.stringify({
      output: [`Error executing command: ${error.message}`]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}