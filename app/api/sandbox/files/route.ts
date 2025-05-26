import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { sandboxId, path } = await req.json()

  try {
    const sandbox = await Sandbox.reconnect(sandboxId)
    const files = await sandbox.filesystem.list(path)
    
    return new Response(JSON.stringify({
      files
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('File system error:', error)
    return new Response(JSON.stringify({
      error: `Error accessing file system: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}