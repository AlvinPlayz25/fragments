import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { LoaderIcon, Terminal } from 'lucide-react'
import { useEffect } from 'react'

export function Chat({
  messages,
  isLoading,
  setCurrentPreview,
}: {
  messages: Message[]
  isLoading: boolean
  setCurrentPreview: (preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) => void
}) {
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, [JSON.stringify(messages)])

  return (
    <div
      id="chat-container"
      className="flex flex-col pb-12 gap-2 overflow-y-auto max-h-full"
    >
      {messages.map((message: Message, index: number) => (
        <div
          className={`flex flex-col px-4 shadow-sm whitespace-pre-wrap ${message.role !== 'user' ? 'bg-card border border-border text-card-foreground py-4 rounded-2xl gap-4 w-full' : 'bg-muted border border-border py-3 rounded-xl gap-2 w-fit ml-auto text-muted-foreground'} font-mono`}
          key={index}
        >
          {message.content.map((content, id) => {
            if (content.type === 'text') {
              return content.text
            }
            if (content.type === 'image') {
              return (
                <img
                  key={id}
                  src={content.image}
                  alt="fragment"
                  className="mr-2 inline-block w-12 h-12 object-cover rounded-lg bg-white mb-2"
                />
              )
            }
          })}
          {message.object && (
            <div
              onClick={() =>
                setCurrentPreview({
                  fragment: message.object,
                  result: message.result,
                })
              }
              className="group relative overflow-hidden bg-card border border-border rounded-xl p-4 select-none hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer max-w-md"
            >
              <div className="absolute inset-0 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative flex flex-col items-center text-center">
                <h3 className="font-bold text-sm text-card-foreground mb-2">
                  {message.object.title}
                </h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <span className="animate-pulse group-hover:animate-push-right">---&gt;</span>
                  <span className="font-medium group-hover:text-card-foreground transition-colors duration-200">
                    Click to view code & preview
                  </span>
                  <span className="animate-pulse group-hover:animate-push-left">&lt;---</span>
                </div>

                <div className="mt-2 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse group-hover:bg-card-foreground transition-colors duration-300"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse group-hover:bg-card-foreground transition-colors duration-300 delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse group-hover:bg-card-foreground transition-colors duration-300 delay-200"></div>
                </div>
              </div>

              <div className="absolute top-2 right-2 w-2 h-2 bg-card-foreground rounded-full animate-ping group-hover:animate-pulse" />
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <LoaderIcon strokeWidth={2} className="animate-spin w-4 h-4" />
          <span>Generating...</span>
        </div>
      )}
    </div>
  )
}
