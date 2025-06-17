import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { sandboxId, path } = await req.json()

  try {
    const sandbox = await Sandbox.connect(sandboxId)
    await (sandbox as any).filesystem.remove(path, { recursive: true })
    
    return new Response(JSON.stringify({
      message: `Deleted: ${path}`
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Deletion error:', error)
    return new Response(JSON.stringify({
      error: `Error deleting: ${error instanceof Error ? error.message : String(error)}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}