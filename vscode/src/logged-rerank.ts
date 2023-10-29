import { ChatClient } from '@sourcegraph/cody-shared/src/chat/chat'
import { LLMReranker } from '@sourcegraph/cody-shared/src/codebase-context/rerank'
import { ContextResult } from '@sourcegraph/cody-shared/src/local-context'

import { logDebug } from './log'
import { TestSupport } from './test-support'

export function getRerankWithLog(
    chatClient: ChatClient
): (query: string, results: ContextResult[]) => Promise<ContextResult[]> {
    if (TestSupport.instance) {
        const reranker = TestSupport.instance.getReranker()
        return (query: string, results: ContextResult[]): Promise<ContextResult[]> => reranker.rerank(query, results)
    }

    const reranker = new LLMReranker(chatClient)
    return async (userQuery: string, results: ContextResult[]): Promise<ContextResult[]> => {
        const msToTime = (duration: number) =>
            `${Math.floor((duration / (1000 * 60 * 60)) % 24)} hours ${Math.floor(
                (duration / (1000 * 60)) % 60
            )} minutes and ${Math.floor((duration / 1000) % 60)}.${parseInt(
                ((duration % 1000) / 100).toString()
            )} seconds.`
        console.log(
            'Time:',
            msToTime(Date.now()),
            'Function: getRerankWithLog File: vscode/src/logged-rerank.ts Status: LLMReranker start'
        )
        const start = performance.now()
        const startTime = new Date().getTime()
        const rerankedResults = await reranker.rerank(userQuery, results)
        const duration = performance.now() - start
        logDebug('Reranker:rerank', JSON.stringify({ duration }))
        const endTime = new Date().getTime()
        const elapsedTime = endTime - startTime // time in milliseconds
        console.log(
            'Time:',
            msToTime(Date.now()),
            'Function: getRerankWithLog File: vscode/src/logged-rerank.ts Status: LLMReranker Finished'
        )
        console.log('LLMReranker Time elapsed:', elapsedTime / 1000)
        return rerankedResults
    }
}

export function skipRerankWithLog(
    chatClient: ChatClient
): (query: string, results: ContextResult[]) => Promise<ContextResult[]> {
    return async (query: string, results: ContextResult[]): Promise<ContextResult[]> => {
        // Simply return the results as they are, without reranking
        return results
    }
}
