import path from 'node:path'
import { ModelProvider, getDotComDefaultModels } from '@sourcegraph/cody-shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TESTING_CREDENTIALS } from '../../vscode/src/testutils/testing-credentials'
import { TestClient } from './TestClient'
import { TestWorkspace } from './TestWorkspace'

describe('Document Code', () => {
    const workspace = new TestWorkspace(path.join(__dirname, '__tests__', 'example-ts'))
    const client = TestClient.create({
        workspaceRootUri: workspace.rootUri,
        name: 'document-code',
        credentials: TESTING_CREDENTIALS.dotcom,
    })

    beforeAll(async () => {
        ModelProvider.setProviders(getDotComDefaultModels())
        await workspace.beforeAll()
        await client.beforeAll()
    })

    afterAll(async () => {
        await workspace.afterAll()
        await client.afterAll()
    })

    it('editCommands/document (basic function)', async () => {
        expect(await client.documentCode(workspace.file('src', 'sum.ts'))).toMatchSnapshot()
    })

    it('commands/document (Method as part of a class)', async () => {
        expect(await client.documentCode(workspace.file('src', 'TestClass.ts'))).toMatchSnapshot()
    })

    it('commands/document (Function within a property)', async () => {
        expect(await client.documentCode(workspace.file('src', 'TestLogger.ts'))).toMatchSnapshot()
    })

    it('commands/document (nested test case)', async () => {
        expect(await client.documentCode(workspace.file('src', 'example.test.ts'))).toMatchSnapshot()
    })
})
