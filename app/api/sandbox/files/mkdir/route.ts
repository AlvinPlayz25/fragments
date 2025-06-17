import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { sandboxId, path } = await req.json()

  try {
    const sandbox = await Sandbox.connect(sandboxId)
    await (sandbox as any).filesystem.makeDir(path, { recursive: true })
    
    return new Response(JSON.stringify({
      message: `Directory created at ${path}`
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Directory creation error:', error)
    return new Response(JSON.stringify({
      error: `Error creating directory: ${error instanceof Error ? error.message : String(error)}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}