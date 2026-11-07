import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const webRoot = path.dirname(fileURLToPath(import.meta.url))

// 测试的导入链会经过 src/version.ts（由 app_info.py 生成、不入库），
// 与 vite.config.ts 一样在配置加载时先同步一次。
execFileSync('python', [path.join(webRoot, '..', 'packaging', 'sync_frontend_version.py')], {
  cwd: path.join(webRoot, '..'),
  stdio: 'inherit',
})

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
