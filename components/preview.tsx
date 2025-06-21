import { useState, useEffect, useRef, KeyboardEvent, Dispatch, SetStateAction } from 'react';
import { DeployDialog } from './deploy-dialog';
import { FragmentCode } from './fragment-code';
import { FragmentPreview } from './fragment-preview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FragmentSchema } from '@/lib/schema';
import { ExecutionResult } from '@/lib/types';
import { DeepPartial } from 'ai';
import {
  ChevronsRight,
  File,
  LoaderCircle,
  Terminal,
  FolderTree,
  Plus,
  Trash,
  Save,
  FolderPlus,
  ArrowUp,
  RotateCw
} from 'lucide-react';

interface FileSystemEntry {
  path: string;
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
  teamID: string | undefined;
  accessToken: string | undefined;
  selectedTab: 'code' | 'fragment' | 'files';
  onSelectedTabChange: Dispatch<SetStateAction<'code' | 'fragment' | 'files'>>;
  isChatLoading: boolean;
  isPreviewLoading: boolean;
  fragment?: DeepPartial<FragmentSchema>;
  result?: ExecutionResult;
  onClose: () => void;
}) {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileSystem, setFileSystem] = useState<FileSystemEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/home/project');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (result?.sbxId) {
      fetchFileSystem();
    }
  }, [result?.sbxId, currentPath]);
  
  useEffect(() => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  }, [selectedTab]);

  async function fetchFileSystem() {
    if (!result?.sbxId) return;

    try {
      const response = await fetch('/api/sandbox/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: currentPath
        }),
      });
      const data = await response.json();
      setFileSystem(data.files || []);
    } catch (error) {
      console.error('Failed to fetch file system:', error);
      setFileSystem([]);
    }
  }

  async function handleFileSelect(entry: FileSystemEntry) {
    if (!result?.sbxId) return;

    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
      setSelectedFile(null);
      setFileContent('');
      return;
    }

    try {
      const response = await fetch('/api/sandbox/files/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: entry.path
        }),
      });
      const data = await response.json();
      setSelectedFile(entry.path);
      setFileContent(data.content || '');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to read file:', error);
      setFileContent('');
    }
  }

  async function saveFile() {
    if (!result?.sbxId || !selectedFile) return;

    try {
      await fetch('/api/sandbox/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: selectedFile,
          content: fileContent
        }),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }

  async function createFile() {
    if (!result?.sbxId || !newFileName) return;

    const filePath = `${currentPath}/${newFileName}`;

    try {
      await fetch('/api/sandbox/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: filePath,
          content: ''
        }),
      });
      setNewFileName('');
      setShowCreateFile(false);
      fetchFileSystem();
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  }

  async function createFolder() {
    if (!result?.sbxId || !newFolderName) return;

    const folderPath = `${currentPath}/${newFolderName}`;

    try {
      await fetch('/api/sandbox/files/mkdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: folderPath
        }),
      });
      setNewFolderName('');
      setShowCreateFolder(false);
      fetchFileSystem();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  }

  async function deleteEntry(entry: FileSystemEntry) {
    if (!result?.sbxId) return;

    try {
      await fetch('/api/sandbox/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sandboxId: result.sbxId,
          path: entry.path
        }),
      });
      fetchFileSystem();
      if (selectedFile === entry.path) {
        setSelectedFile(null);
        setFileContent('');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  function goUp() {
    const newPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(newPath);
  }

  async function handleTerminalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!result?.sbxId || !terminalInput.trim()) return;

    // Add to history
    const newHistory = [...commandHistory, terminalInput];
    setCommandHistory(newHistory);
    setHistoryIndex(newHistory.length);

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
      });

      const data = await response.json();
      // Combine output into single string and split by newlines
      const combinedOutput = (data.output || []).join('');
      const outputLines = combinedOutput.split('\n');
      setTerminalOutput(prev => [...prev, `$ ${terminalInput}`, ...outputLines]);
      setTerminalInput('');

      // Refresh file system after command execution
      fetchFileSystem();
    } catch (error) {
      console.error('Failed to execute command:', error);
      setTerminalOutput(prev => [...prev, `Error: Failed to execute command`]);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (commandHistory.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : 0;
      setHistoryIndex(newIndex);
      setTerminalInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : commandHistory.length - 1;
      setHistoryIndex(newIndex);
      setTerminalInput(commandHistory[newIndex] || '');
    }
  }

  function clearTerminal() {
    setTerminalOutput([]);
  }

  function renderFileSystem(entries: FileSystemEntry[], level = 0) {
    if (!Array.isArray(entries)) return null;

    return (
      <div className="space-y-1">
        {level === 0 && currentPath !== '/' && (
          <div 
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer"
            onClick={goUp}
          >
            <ArrowUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm">..</span>
          </div>
        )}
        
        {entries.map((entry) => (
          <div key={entry.path} className="py-0.5">
            <div className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer">
              <div 
                className="flex-1 flex items-center gap-2"
                onClick={() => handleFileSelect(entry)}
              >
                {entry.type === 'directory' ? (
                  <FolderTree className="h-4 w-4 text-yellow-500" />
                ) : (
                  <File className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm">{entry.name}</span>
              </div>
              <button 
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEntry(entry);
                }}
              >
                <Trash className="h-3 w-3" />
              </button>
            </div>
            {entry.type === 'directory' && entry.children && (
              <div className="pl-4">
                {renderFileSystem(entry.children, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!fragment) {
    return null;
  }

  const isLinkAvailable = result?.template !== 'code-interpreter-v1';

  return (
    <div className="absolute md:relative z-10 top-0 left-0 shadow-2xl md:rounded-tl-3xl md:rounded-bl-3xl md:border-l md:border-y bg-black/40 backdrop-blur-md h-full w-full overflow-auto transition-all duration-300 ease-in-out">
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          onSelectedTabChange(value as 'code' | 'fragment' | 'files')
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
            </TabsList>
          </div>

        </div>
        {fragment && (
          <div className="overflow-y-auto w-full h-full">
            <TabsContent value="code" className="h-full">
              {fragment.files && fragment.files.length > 0 ? (
                <FragmentCode
                  files={fragment.files.map(file => ({
                    name: file.file_path,
                    content: file.file_content,
                  }))}
                />
              ) : fragment.code && fragment.file_path ? (
                <FragmentCode
                  files={[
                    {
                      name: fragment.file_path,
                      content: fragment.code,
                    },
                  ]}
                />
              ) : null}
            </TabsContent>
            <TabsContent value="fragment" className="h-full">
              {result && <FragmentPreview result={result as ExecutionResult} />}
            </TabsContent>
            <TabsContent value="files" className="h-full p-4">
              <div className="grid grid-cols-5 h-full gap-4">
                <div className="col-span-2 bg-black/40 rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-muted-foreground truncate">
                      {currentPath}
                    </div>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setShowCreateFile(true)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create File</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setShowCreateFolder(true)}
                            >
                              <FolderPlus className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create Folder</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {renderFileSystem(fileSystem)}
                  </div>
                  
                  {showCreateFile && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="Filename"
                        className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={createFile}
                        disabled={!newFileName}
                      >
                        Create
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCreateFile(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {showCreateFolder && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name"
                        className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={createFolder}
                        disabled={!newFolderName}
                      >
                        Create
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCreateFolder(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                <div className="col-span-3 bg-black/40 rounded-lg p-4 flex flex-col">
                  {selectedFile ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-muted-foreground truncate">
                          {selectedFile}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveFile}
                          disabled={!isEditing}
                        >
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                      <textarea
                        value={fileContent}
                        onChange={(e) => {
                          setFileContent(e.target.value);
                          setIsEditing(true);
                        }}
                        className="flex-1 bg-transparent font-mono text-sm p-2 rounded border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
                        spellCheck="false"
                      />
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      Select a file to view its contents
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

          </div>
        )}
      </Tabs>
    </div>
  );
}
