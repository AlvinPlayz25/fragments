import { TemplateId } from './templates'
import { ExecutionError, Result } from '@e2b/code-interpreter'

type ExecutionResultBase = {
  sbxId: string
}

export type ExecutionResultWeb = ExecutionResultBase & {
  template: TemplateId
  url: string
  terminalOutput?: string[]
}

export type ExecutionResult = ExecutionResultWeb
