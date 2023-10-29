import * as vscode from 'vscode'

import { getSingleLineRange } from '../services/InlineAssist'

import { FixupTask } from './FixupTask'
import { CodyTaskState } from './utils'

// Create Lenses based on state
export function getLensesForTask(task: FixupTask): vscode.CodeLens[] {
    const msToTime = (duration: number) =>
        `${Math.floor((duration / (1000 * 60 * 60)) % 24)} hours ${Math.floor(
            (duration / (1000 * 60)) % 60
        )} minutes and ${Math.floor((duration / 1000) % 60)}.${parseInt(((duration % 1000) / 100).toString())} seconds.`
    const codeLensRange = getSingleLineRange(task.selectionRange.start.line)
    switch (task.state) {
        case CodyTaskState.working: {
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.working start'
            )
            const title = getWorkingLens(codeLensRange)
            const cancel = getCancelLens(codeLensRange, task.id)
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.working End'
            )
            return [title, cancel]
        }
        case CodyTaskState.ready: {
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.ready start'
            )
            const apply = getApplyLens(codeLensRange, task.id)
            const diff = getDiffLens(codeLensRange, task.id)
            const discard = getDiscardLens(codeLensRange, task.id)
            const regenerate = getRegenerateLens(codeLensRange, task.id)
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.ready end'
            )
            return [apply, diff, regenerate, discard]
        }
        case CodyTaskState.applying: {
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.applying start'
            )
            const title = getApplyingLens(codeLensRange)
            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: getLensesForTask File: vscode/src/non-stop/codelenses.ts Status: CodyTaskState.applying end'
            )
            return [title]
        }
        case CodyTaskState.error: {
            const title = getErrorLens(codeLensRange)
            const discard = getDiscardLens(codeLensRange, task.id)
            return [title, discard]
        }
        default:
            return []
    }
}

// List of lenses
// TODO: Replace cody.focus with appropriate tasks
// TODO (bea) send error messages to the chat UI so that they can see the task progress in the chat and chat history
function getErrorLens(codeLensRange: vscode.Range): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: '$(warning) Applying edits failed',
        command: 'cody.focus',
    }
    return lens
}

function getWorkingLens(codeLensRange: vscode.Range): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: '$(sync~spin) Cody is working...',
        command: 'cody.focus',
    }
    return lens
}

function getApplyingLens(codeLensRange: vscode.Range): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: '$(sync~spin) Applying...',
        command: 'cody.focus',
    }
    return lens
}

function getCancelLens(codeLensRange: vscode.Range, id: string): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: 'Cancel',
        command: 'cody.fixup.codelens.cancel',
        arguments: [id],
    }
    return lens
}

function getDiscardLens(codeLensRange: vscode.Range, id: string): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: 'Discard',
        command: 'cody.fixup.codelens.cancel',
        arguments: [id],
    }
    return lens
}

function getDiffLens(codeLensRange: vscode.Range, id: string): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: 'Show Diff',
        command: 'cody.fixup.codelens.diff',
        arguments: [id],
    }
    return lens
}

function getApplyLens(codeLensRange: vscode.Range, id: string): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: '$(pencil) Apply Edits',
        command: 'cody.fixup.codelens.apply',
        arguments: [id],
    }
    return lens
}

function getRegenerateLens(codeLensRange: vscode.Range, id: string): vscode.CodeLens {
    const lens = new vscode.CodeLens(codeLensRange)
    lens.command = {
        title: 'Regenerate',
        command: 'cody.fixup.codelens.regenerate',
        arguments: [id],
    }
    return lens
}
