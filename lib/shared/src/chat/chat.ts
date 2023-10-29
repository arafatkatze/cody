import { ANSWER_TOKENS } from '../prompt/constants'
import { Message } from '../sourcegraph-api'
import type { SourcegraphCompletionsClient } from '../sourcegraph-api/completions/client'
import type { CompletionCallbacks, CompletionParameters } from '../sourcegraph-api/completions/types'

type ChatParameters = Omit<CompletionParameters, 'messages'>

const DEFAULT_CHAT_COMPLETION_PARAMETERS: ChatParameters = {
    temperature: 0.2,
    maxTokensToSample: ANSWER_TOKENS,
    topK: -1,
    topP: -1,
}

export class ChatClient {
    constructor(private completions: SourcegraphCompletionsClient) {}

    public chat(messages: Message[], cb: CompletionCallbacks, params?: Partial<ChatParameters>): () => void {
        const isLastMessageFromHuman = messages.length > 0 && messages.at(-1)!.speaker === 'human'
        const augmentedMessages = isLastMessageFromHuman ? messages.concat([{ speaker: 'assistant' }]) : messages
        if (augmentedMessages.length > 10) {
            const msToTime = (duration: number) =>
                `${Math.floor((duration / (1000 * 60 * 60)) % 24)} hours ${Math.floor(
                    (duration / (1000 * 60)) % 60
                )} minutes and ${Math.floor((duration / 1000) % 60)}.${parseInt(
                    ((duration % 1000) / 100).toString()
                )} seconds `

            console.log(
                'Time:',
                msToTime(Date.now()),
                'Function: ChatClient:chat File: lib/shared/src/chat/chat.ts Status: Sending the Main Prompt request to LLM'
            )
        }
        return this.completions.stream(
            {
                ...DEFAULT_CHAT_COMPLETION_PARAMETERS,
                ...params,
                messages: augmentedMessages,
            },
            cb
        )
    }
}
