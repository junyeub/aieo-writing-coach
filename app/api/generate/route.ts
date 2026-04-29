// Design Ref: §4.3 — POST /api/generate. 서버사이드 전용. ANTHROPIC_API_KEY 클라이언트 노출 금지.
import { GENERATE_SYSTEM, GENERATE_USER } from '@/lib/prompts'
import { createAnthropicStream } from '@/lib/stream'

const VALID_POST_TYPES = ['허브 페이지', '시리즈 1편', '전문 분석', '비교 가이드'] as const
type PostType = (typeof VALID_POST_TYPES)[number]

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { topic, postType, brandName } = body as Record<string, unknown>

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return Response.json({ error: '주제를 입력해주세요.' }, { status: 400 })
  }
  if (!postType || !VALID_POST_TYPES.includes(postType as PostType)) {
    return Response.json(
      { error: `글 유형은 ${VALID_POST_TYPES.join(', ')} 중 하나여야 합니다.` },
      { status: 400 }
    )
  }

  const stream = createAnthropicStream({
    system: GENERATE_SYSTEM,
    userMessage: GENERATE_USER(
      topic.trim(),
      postType as PostType,
      typeof brandName === 'string' ? brandName.trim() : undefined
    ),
    maxTokens: 6000,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
