import { beforeAll, afterEach, afterAll, expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import { server } from './src/mocks/server'

expect.extend(matchers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
