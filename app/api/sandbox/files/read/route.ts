import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { sandboxId, path } = await req.json()

  try {
    const sandbox = await Sandbox.reconnect(sandboxId)
    const content = await sandbox.filesystem.read(path)
    
    return new Response(JSON.stringify({
      content
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('File read error:', error)
    return new Response(JSON.stringify({
      error: `Error reading file: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}