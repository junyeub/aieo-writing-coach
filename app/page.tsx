'use client'
// Design Ref: §5.1 — 탭 전환 + 상태 관리 + 2-패널 레이아웃 조립.
// Plan SC: 글 입력 후 15초 내 결과 출력, 스트리밍으로 체감 대기시간 최소화.

import { useState } from 'react'
import OptimizeForm from '@/components/OptimizeForm'
import GenerateForm from '@/components/GenerateForm'
import ResultPanel from '@/components/ResultPanel'
import Checklist from '@/components/Checklist'

type Tab = 'optimize' | 'generate'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('optimize')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async (fetchFn: () => Promise<Response>) => {
    setResult('')
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetchFn()
      const reader = res.body?.getReader()
      if (!reader) throw new Error('스트리밍을 시작할 수 없습니다.')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) { setError(data.error); return }
            if (data.done) return
            if (data.text) setResult((prev) => prev + data.text)
          } catch {
            // 파싱 실패한 청크는 무시
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setResult('')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">AIEO 블로그 글쓰기 코치</h1>
        <p className="text-sm text-gray-500">AI 검색 상위 노출 최적화 블로그 글 작성 도구</p>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {(['optimize', 'generate'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'optimize' ? '글 최적화' : '글 생성'}
            </button>
          ))}
        </div>

        {/* 2-Panel Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: Input */}
          <div>
            {activeTab === 'optimize' ? (
              <OptimizeForm onStart={handleStart} isLoading={isLoading} />
            ) : (
              <GenerateForm onStart={handleStart} isLoading={isLoading} />
            )}
          </div>

          {/* Right: Result */}
          <div>
            <ResultPanel result={result} isLoading={isLoading} error={error} />
          </div>
        </div>

        {/* Checklist — 결과 완료 후 표시 */}
        {result && !isLoading && <Checklist />}
      </div>
    </div>
  )
}
