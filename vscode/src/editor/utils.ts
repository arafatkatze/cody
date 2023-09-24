import * as vscode from 'vscode'

/**
 * Removes folding ranges that correspond to class definitions.
 *
 * @param ranges - Array of folding ranges
 * @param classRanges - Array of class ranges
 * @returns Array containing folding ranges excluding those that correspond to class definitions
 */
export function removeClassRanges(ranges: vscode.FoldingRange[], classRanges: vscode.Range[]): vscode.FoldingRange[] {
    return ranges.filter(
        range =>
            !classRanges.some(
                cRange => Math.abs(range.start - cRange.start.line) <= 1 && Math.abs(range.end - cRange.end.line) <= 1
            )
    )
}

/**
 * Finds the largest folding range within given LOC constraints that also contains the active cursor.
 *
 * @param ranges - Array of folding ranges
 * @param classRanges - Array of class ranges
 * @param targetLOC - The target Line of Code (LOC) count
 * @param activeCursor - The active cursor position
 * @returns The largest folding range within the LOC constraints that contains the cursor, or logs an error if none found
 */
export function findLargestRangeWithinLOC(
    ranges: vscode.FoldingRange[],
    classRanges: vscode.Range[],
    targetLOC: number,
    activeCursor: number // New parameter for active cursor
): vscode.FoldingRange | undefined {
    // First, remove class-related ranges
    const filteredRanges = removeClassRanges(ranges, classRanges)

    let largestRange: vscode.FoldingRange | null = null
    let largestRange2x: vscode.FoldingRange | null = null

    for (const range of filteredRanges) {
        const rangeLOC = range.end - range.start + 1

        // Ensure active cursor is within the range
        if (range.start <= activeCursor && range.end >= activeCursor) {
            // Within target LOC
            if (rangeLOC <= targetLOC) {
                if (!largestRange || range.end - range.start > largestRange.end - largestRange.start) {
                    largestRange = range
                }
            }

            // Within 2x target LOC
            if (rangeLOC <= 2 * targetLOC) {
                if (!largestRange2x || range.end - range.start > largestRange2x.end - largestRange2x.start) {
                    largestRange2x = range
                }
            }
        }
    }

    if (largestRange) {
        return largestRange
    }
    if (largestRange2x) {
        return largestRange2x
    }
    console.error('The active cursor is not contained within any folding ranges or the folding ranges are too large')
    return undefined
}

/**
 * Gets the folding ranges for the given document URI.
 *
 * @param uri - The URI of the document to get folding ranges for
 * @param type - Optional type of folding range to filter on:
 *   - 'imports' - Only import folding ranges
 *   - 'comment' - Only comment folding ranges
 *   - 'regions' - All non-import and non-comment folding ranges
 * If no type specified, returns all folding ranges.
 *
 * @returns The array of folding ranges for the document.
 */
export async function getFoldingRange(uri: vscode.Uri, type?: string): Promise<vscode.FoldingRange[]> {
    const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
        'vscode.executeFoldingRangeProvider',
        uri
    )

    if (!ranges?.length) {
        return []
    }

    switch (type) {
        case 'imports':
            return ranges.filter(r => r.kind === vscode.FoldingRangeKind.Imports)
        case 'comment':
            return ranges.filter(r => r.kind === vscode.FoldingRangeKind.Comment)
        case 'regions':
            return ranges.filter(
                r => r.kind !== vscode.FoldingRangeKind.Imports && r.kind !== vscode.FoldingRangeKind.Comment
            )
        default:
            return ranges
    }
}

/**
 * Gets the folding range containing the active cursor position.
 *
 * @param uri - The URI of the document to get folding ranges for
 * @param activeCursor - The active cursor position
 * @returns The folding range containing the active cursor, or undefined if none found
 */
export async function getCursorFoldingRange(
    uri: vscode.Uri,
    activeCursor: number
): Promise<vscode.Selection | undefined> {
    // Get the ranges of all classes and folding ranges in parallel
    const [classes, ranges] = await Promise.all([
        getSymbols(uri)
            .then(r => r?.filter(s => s.kind === vscode.SymbolKind.Class))
            .then(s => s?.map(symbol => symbol.location.range)),
        getFoldingRange(uri).then(r => r?.filter(r => !r.kind)),
    ])
    const tragetLOC = 50

    // Apply the new find function here
    const selectedRange = findLargestRangeWithinLOC(ranges, classes, tragetLOC, activeCursor) // Added activeCursor

    if (!selectedRange) {
        return undefined
    }

    return new vscode.Selection(selectedRange.start, 0, selectedRange.end + 2, 0)
}

/**
 * NOTE (bee) The purpose of filtering to keep only folding ranges that contain other folding ranges is to find
 * the outermost folding range enclosing the cursor position.
 *
 * Folding ranges can be nested - you may have a folding range for a function that contains folding ranges for inner code blocks.
 *
 * By filtering to ranges that contain other ranges, it removes the inner nested ranges and keeps only the outermost parent ranges.
 *
 * This way when it checks for the range containing the cursor, it will return the outer range that fully encloses the cursor location,
 * rather than an inner range that may only partially cover the cursor line.
 * '
 * However, if we keep the ranges for classes, this will then only return ranges for classes that contain individual methods rather
 * than the outermost range of the methods within a class. So the first step is to remove class ranges.
 */
export function getOutermostRangesInsideClasses(
    classRanges: vscode.Range[],
    foldingRanges: vscode.FoldingRange[],
    activeCursor: number
): vscode.FoldingRange | undefined {
    if (!foldingRanges?.length) {
        return undefined
    }

    // Remove all ranges that are contained within class ranges
    if (classRanges.length) {
        for (const cRange of classRanges) {
            for (let i = 0; i < foldingRanges.length; i++) {
                const r = foldingRanges[i]
                if (Math.abs(r.start - cRange.start.line) <= 1 && Math.abs(r.end - cRange.end.line) <= 1) {
                    foldingRanges.splice(i, 1)
                    i--
                }
            }
        }
    }

    // Filter to only keep folding ranges that contained nested folding ranges (aka removes nested ranges)
    // Get the folding range containing the active cursor
    const cursorRange = findCursorRange(removeNestedFoldingRanges(foldingRanges), activeCursor)

    return cursorRange || undefined
}

/**
 * Removes nested folding ranges from the given array of folding ranges.
 *
 * This filters the input array to only contain folding ranges that do not have any nested child folding ranges within them.
 *
 * Nested folding ranges occur when you have a folding range (e.g. for a function) that contains additional nested folding ranges
 * (e.g. for inner code blocks).
 *
 * By removing the nested ranges, you are left with only the top-level outermost folding ranges.
 *
 * @param ranges - Array of folding ranges
 * @returns Array containing only folding ranges that do not contain any nested child ranges
 */
export function removeNestedFoldingRanges(ranges: vscode.FoldingRange[]): vscode.FoldingRange[] {
    return ranges.filter(
        range =>
            !ranges.some(
                otherRange => otherRange !== range && otherRange.start <= range.start && otherRange.end >= range.end
            )
    )
}

/**
 * Finds the folding range in the given array that contains the specified cursor position.
 *
 * @param ranges - Array of folding ranges to search
 * @param activeCursor - The cursor position
 * @returns The folding range containing the cursor, or undefined if none found.
 */
export function findCursorRange(ranges: vscode.FoldingRange[], activeCursor: number): vscode.FoldingRange | undefined {
    return ranges.find(range => range.start <= activeCursor && range.end >= activeCursor)
}

/**
 * Gets the symbol information ranges for the given document URI.
 *
 * @param uri - The URI of the document to get symbol ranges for
 * @returns A promise resolving to an array of SymbolInformation objects
 * representing the symbols in the document.
 */
export async function getSymbols(uri: vscode.Uri): Promise<vscode.SymbolInformation[]> {
    const symbols =
        (await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            'vscode.executeDocumentSymbolProvider',
            uri
        )) || []
    return symbols
}

/**
 * Adds the selection range to the prompt string.
 *
 * @param prompt - The original prompt string
 * @param code - The code snippet to include in the prompt
 * @returns The updated prompt string with the code snippet added
 */
export function addSelectionToPrompt(prompt: string, code: string): string {
    return prompt + '\nHere is the code: \n<Code>' + code + '</Code>'
}
