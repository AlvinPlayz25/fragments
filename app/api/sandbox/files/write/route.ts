import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { sandboxId, path, content } = await req.json()

  try {
    const sandbox = await Sandbox.connect(sandboxId)
    await (sandbox as any).filesystem.write(path, content)
    
    return new Response(JSON.stringify({
      message: `File written at ${path}`
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('File write error:', error)
    return new Response(JSON.stringify({
      error: `Error writing file: ${error instanceof Error ? error.message : String(error)}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}