import * as vscode from 'vscode'

import { FixupIntent } from '@sourcegraph/cody-shared/src/chat/recipes/fixup'

import { getSmartSelection } from '../editor/utils'

export class FixupCodeAction implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix]

    public async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): Promise<vscode.CodeAction[]> {
        const diagnostics = context.diagnostics.filter(
            diagnostic =>
                diagnostic.severity === vscode.DiagnosticSeverity.Error ||
                diagnostic.severity === vscode.DiagnosticSeverity.Warning
        )
        if (diagnostics.length === 0) {
            return []
        }

        // Expand range to include the full line for better fixup quality
        const expandedRange = new vscode.Range(
            document.lineAt(range.start.line).range.start,
            document.lineAt(range.end.line).range.end
        )
        const erroneousLine = document.getText(expandedRange)
        // TODO bee check if the diagnostics are related to imports and include import ranges instead of error lines
        // const importDiagnostics = diagnostics.filter(diagnostic => diagnostic.message.includes('import'))

        // Expand range by getting the folding range contains the target (error) area
        const targetAreaRange = await getSmartSelection(document.uri, range.start.line)

        const newRange = targetAreaRange ? new vscode.Range(targetAreaRange.start, targetAreaRange.end) : expandedRange
        return [this.createCommandCodeAction(diagnostics, newRange, erroneousLine)]
    }

    private createCommandCodeAction(
        diagnostics: vscode.Diagnostic[],
        range: vscode.Range,
        erroneousLine: string
    ): vscode.CodeAction {
        const action = new vscode.CodeAction('Ask Cody to Fix', vscode.CodeActionKind.QuickFix)
        const instruction = this.getCodeActionInstruction(diagnostics, erroneousLine)
        action.command = {
            command: 'cody.fixup.new',
            arguments: [{ instruction, range }],
            title: 'Ask Cody to Fix',
        }
        action.diagnostics = diagnostics
        action.isPreferred = true
        return action
    }

    private getCodeActionInstruction = (diagnostics: vscode.Diagnostic[], erroneousLine: string): string => {
        const intent: FixupIntent = 'edit'
        const performFixup = `/${intent} Fix the following error${diagnostics.length > 1 ? 's' : ''}: ${diagnostics
            .map(({ message }) => `\`\`\`${message}\`\`\``)
            .join('\n')}`
        return `${performFixup} in the line "${erroneousLine}"`
    }
}
