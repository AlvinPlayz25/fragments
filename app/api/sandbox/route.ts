import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'

const sandboxTimeout = 10 * 60 * 1000 // 10 minute in ms

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    fragment,
    userID,
    teamID,
    accessToken,
  }: {
    fragment: FragmentSchema
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
  } = await req.json()
  console.log('fragment', fragment)
  console.log('userID', userID)
  // console.log('apiKey', apiKey)

  // Create an interpreter or a sandbox
  const sbx = await Sandbox.create(fragment.template, {
    metadata: {
      template: fragment.template,
      userID: userID ?? '',
      teamID: teamID ?? '',
    },
    timeoutMs: sandboxTimeout,
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })

  // Install packages
  if (fragment.has_additional_dependencies) {
    await sbx.commands.run(fragment.install_dependencies_command)
    console.log(
      `Installed dependencies: ${fragment.additional_dependencies.join(', ')} in sandbox ${sbx.sandboxId}`,
    )
  }

  // Copy files to fs
  if (fragment.files && fragment.files.length > 0) {
    // New multi-file approach
    for (const file of fragment.files) {
      await sbx.files.write(file.file_path, file.file_content)
      console.log(`Copied file to ${file.file_path} in ${sbx.sandboxId}`)
    }
  } else if (fragment.file_path && fragment.code) {
    // Legacy single file approach (backward compatibility)
    await sbx.files.write(fragment.file_path, fragment.code)
    console.log(`Copied file to ${fragment.file_path} in ${sbx.sandboxId}`)
  }

  // Execute terminal commands if specified
  let terminalOutput: string[] = []
  if (fragment.has_terminal_commands && fragment.terminal_commands && fragment.terminal_commands.length > 0) {
    console.log(`Executing ${fragment.terminal_commands.length} terminal commands in sandbox ${sbx.sandboxId}`)

    for (const command of fragment.terminal_commands) {
      try {
        console.log(`Running command: ${command}`)
        const result = await sbx.commands.run(command)

        // Combine stdout and stderr for logging
        terminalOutput.push(`$ ${command}`)

        // Add stdout (split by lines if it's a string)
        if (result.stdout) {
          if (typeof result.stdout === 'string') {
            terminalOutput.push(...result.stdout.split('\n').filter(line => line.trim() !== ''))
          } else if (Array.isArray(result.stdout)) {
            terminalOutput.push(...(result.stdout as string[]).filter(line => line.trim() !== ''))
          }
        }

        // Add stderr (split by lines if it's a string)
        if (result.stderr) {
          if (typeof result.stderr === 'string') {
            terminalOutput.push(...result.stderr.split('\n').filter(line => line.trim() !== ''))
          } else if (Array.isArray(result.stderr)) {
            terminalOutput.push(...(result.stderr as string[]).filter(line => line.trim() !== ''))
          }
        }

        console.log(`Command "${command}" completed with exit code: ${result.exitCode}`)
      } catch (error) {
        console.error(`Error executing command "${command}":`, error)
        terminalOutput.push(`$ ${command}`)
        terminalOutput.push(`Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // Return URL to the running sandbox
  return new Response(
    JSON.stringify({
      sbxId: sbx?.sandboxId,
      template: fragment.template,
      url: `https://${sbx?.getHost(fragment.port || 80)}`,
      terminalOutput: terminalOutput.length > 0 ? terminalOutput : undefined,
    } as ExecutionResultWeb),
  )
}
