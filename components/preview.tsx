import { DeployDialog } from './deploy-dialog'
import { FragmentCode } from './fragment-code'
import { FragmentPreview } from './fragment-preview'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { ChevronsRight, File, LoaderCircle, Terminal, FolderTree } from 'lucide-react'
import { Dispatch, SetStateAction, useState, useEffect } from 'react'

interface FileSystemEntry {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileSystemEntry[];
}

export function Preview({
  teamID,
  accessToken,
  selectedTab,
  onSelectedTabChange,
  isChatLoading,
  isPreviewLoading,
  fragment,
  result,
  onClose,
}: {
  teamID: string | undefined
  accessToken: string | undefined
  selectedTab: 'code' | 'fragment' | 'files' | 'terminal'
  onSelectedTabChange: Dispatch<SetStateAction<'code' | 'fragment' | 'files' | 'terminal'>>
  isChatLoading: boolean
  isPreviewLoading: boolean
  fragment?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
  onClose: () => void
}) {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [terminalInput, setTerminalInput] = useState('')
  const [fileSystem, setFileSystem] = useState<FileSystemEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  useEffect(() => {
    // Initialize file system structure when sandbox is ready
    if (result?.sbxId) {
      fetchFileSystem()
    }
  }, [result?.sbxId])

  async function fetchFileSystem() {
    if (!result?.sbxId) return

    try {
      const response = await fetch('/api/sandbox/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: '/home/project'
        }),
      })
      const data = await response.json()
      setFileSystem(data.files || []) // Ensure we always set an array
    } catch (error) {
      console.error('Failed to fetch file system:', error)
      setFileSystem([]) // Set empty array on error
    }
  }

  async function handleFileSelect(path: string) {
    if (!result?.sbxId) return

    try {
      const response = await fetch('/api/sandbox/files/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path
        }),
      })
      const data = await response.json()
      setSelectedFile(path)
      setFileContent(data.content || '') // Ensure we always set a string
    } catch (error) {
      console.error('Failed to read file:', error)
      setFileContent('') // Set empty string on error
    }
  }

  async function handleTerminalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!result?.sbxId) return

    try {
      const response = await fetch('/api/sandbox/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: terminalInput,
          sandboxId: result.sbxId,
        }),
      })

      const data = await response.json()
      setTerminalOutput(prev => [...prev, `$ ${terminalInput}`, ...(data.output || [])])
      setTerminalInput('')
      
      // Refresh file system after command execution
      if (terminalInput.startsWith('mkdir') || terminalInput.startsWith('touch') || terminalInput.includes('npm')) {
        fetchFileSystem()
      }
    } catch (error) {
      console.error('Failed to execute command:', error)
      setTerminalOutput(prev => [...prev, `Error: Failed to execute command`])
    }
  }

  function renderFileSystem(entries: FileSystemEntry[], level = 0) {
    if (!Array.isArray(entries)) return null

    return (
      <div style={{ paddingLeft: level * 16 }}>
        {entries.map((entry) => (
          <div key={entry.name} className="py-1">
            <div 
              className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer ${
                selectedFile === entry.name ? 'bg-accent' : ''
              }`}
              onClick={() => entry.type === 'file' && handleFileSelect(entry.name)}
            >
              {entry.type === 'directory' ? (
                <FolderTree className="h-4 w-4 text-yellow-500" />
              ) : (
                <File className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm">{entry.name.split('/').pop()}</span>
            </div>
            {entry.type === 'directory' && entry.children && (
              renderFileSystem(entry.children, level + 1)
            )}
          </div>
        ))}
      </div>
    )
  }

  if (!fragment) {
    return null
  }

  const isLinkAvailable = result?.template !== 'code-interpreter-v1'

  return (
    <div className="absolute md:relative z-10 top-0 left-0 shadow-2xl md:rounded-tl-3xl md:rounded-bl-3xl md:border-l md:border-y bg-black/40 backdrop-blur-md h-full w-full overflow-auto transition-all duration-300 ease-in-out">
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          onSelectedTabChange(value as 'code' | 'fragment' | 'files' | 'terminal')
        }
        className="h-full flex flex-col items-start justify-start"
      >
        <div className="w-full p-2 grid grid-cols-3 items-center border-b border-white/10">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-white/5 transition-colors duration-200"
                  onClick={onClose}
                >
                  <ChevronsRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex justify-center">
            <TabsList className="px-1 py-0 border h-8 bg-black/20">
              <TabsTrigger
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center transition-colors duration-200"
                value="code"
              >
                {isChatLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="h-3 w-3 animate-spin"
                  />
                )}
                Code
              </TabsTrigger>
              <TabsTrigger
                disabled={!result}
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center transition-colors duration-200"
                value="fragment"
              >
                Preview
                {isPreviewLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="h-3 w-3 animate-spin"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center transition-colors duration-200"
                value="files"
              >
                <File className="h-3 w-3" />
                Files
              </TabsTrigger>
              <TabsTrigger
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center transition-colors duration-200"
                value="terminal"
              >
                <Terminal className="h-3 w-3" />
                Terminal
              </TabsTrigger>
            </TabsList>
          </div>
          {result && (
            <div className="flex items-center justify-end gap-2">
              {isLinkAvailable && (
                <DeployDialog
                  url={result.url!}
                  sbxId={result.sbxId!}
                  teamID={teamID}
                  accessToken={accessToken}
                />
              )}
            </div>
          )}
        </div>
        {fragment && (
          <div className="overflow-y-auto w-full h-full">
            <TabsContent value="code" className="h-full">
              {fragment.code && fragment.file_path && (
                <FragmentCode
                  files={[
                    {
                      name: fragment.file_path,
                      content: fragment.code,
                    },
                  ]}
                />
              )}
            </TabsContent>
            <TabsContent value="fragment" className="h-full">
              {result && <FragmentPreview result={result as ExecutionResult} />}
            </TabsContent>
            <TabsContent value="files" className="h-full p-4">
              <div className="grid grid-cols-5 h-full gap-4">
                <div className="col-span-2 bg-black/40 rounded-lg p-4 overflow-auto">
                  {renderFileSystem(fileSystem)}
                </div>
                <div className="col-span-3 bg-black/40 rounded-lg p-4 overflow-auto">
                  {selectedFile ? (
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {fileContent}
                    </pre>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      Select a file to view its contents
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="terminal" className="h-full p-4">
              <div className="font-mono text-sm bg-black/40 p-4 rounded-lg h-full flex flex-col">
                <div className="flex-1 overflow-auto mb-4">
                  {terminalOutput.map((line, i) => (
                    <div key={i} className="text-muted-foreground">
                      {line}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleTerminalSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Run
                  </Button>
                </form>
              </div>
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  )
}