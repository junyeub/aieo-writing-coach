// Design Ref: §4.2 — POST /api/optimize. 서버사이드 전용. ANTHROPIC_API_KEY 클라이언트 노출 금지.
import { OPTIMIZE_SYSTEM, OPTIMIZE_USER } from '@/lib/prompts'
import { createAnthropicStream } from '@/lib/stream'

const MAX_TEXT_LENGTH = 5000

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { brandName, originalText } = body as Record<string, unknown>

  if (!brandName || typeof brandName !== 'string' || brandName.trim() === '') {
    return Response.json({ error: '브랜드명을 입력해주세요.' }, { status: 400 })
  }
  if (!originalText || typeof originalText !== 'string' || originalText.trim() === '') {
    return Response.json({ error: '원본 글을 입력해주세요.' }, { status: 400 })
  }
  // Plan SC: 입력 5,000자 제한으로 토큰 비용 통제
  if (originalText.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `원본 글은 ${MAX_TEXT_LENGTH.toLocaleString()}자를 초과할 수 없습니다.` },
      { status: 400 }
    )
  }

  const stream = createAnthropicStream({
    system: OPTIMIZE_SYSTEM,
    userMessage: OPTIMIZE_USER(brandName.trim(), originalText.trim()),
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
