/**
 * AICONversation persistence helpers.
 * Persists AI conversation history for audit and user history.
 * Used by AI routes to record conversation threads.
 *
 * Guard: if the prisma client does not expose aICONversation / aIMessage models
 * (e.g. test schemas that have not been migrated yet), all functions no-op
 * silently so that API routes never throw at runtime.
 */

import { prisma } from '@/lib/prisma'

const AI_CONV_AVAILABLE =
  'aICONversation' in prisma && 'aIMessage' in prisma

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface AIMessageMeta {
  intent?: string
  tokens?: number
  model?: string
  [key: string]: unknown
}

/**
 * Start a new conversation thread or continue an existing one (within 30 min).
 * Returns the conversation id and the new message id.
 */
export async function upsertConversation({
  organizationId,
  actorUserId,
  role,
  sessionId,
  message,
  metadata,
}: {
  organizationId: string
  actorUserId: string
  role: string
  sessionId?: string
  message: ConversationMessage
  metadata?: AIMessageMeta
}): Promise<{ conversationId: string; messageId: string }> {
  if (!AI_CONV_AVAILABLE) {
    // Schema not migrated — silently skip persistence.
    return { conversationId: 'mock-conv-id', messageId: 'mock-msg-id' }
  }

  // Find existing open conversation for this user (within last 30 min) to continue
  const recentCutoff = new Date(Date.now() - 30 * 60 * 1000)
  const existing = await prisma.aICONversation.findFirst({
    where: {
      actorUserId,
      organizationId,
      lastMessageAt: { gte: recentCutoff },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  let conversationId: string

  if (existing) {
    conversationId = existing.id
    // Append message to existing conversation
    const messages: ConversationMessage[] = JSON.parse(existing.messages)
    messages.push(message)
    await prisma.aICONversation.update({
      where: { id: existing.id },
      data: {
        messages: JSON.stringify(messages),
        messageCount: existing.messageCount + 1,
        lastMessageAt: new Date(),
      },
    })
  } else {
    // Create new conversation
    const conv = await prisma.aICONversation.create({
      data: {
        organizationId,
        actorUserId,
        role,
        sessionId: sessionId ?? null,
        messages: JSON.stringify([message]),
        messageCount: 1,
      },
    })
    conversationId = conv.id
  }

  // Write individual message row
  const msg = await prisma.aIMessage.create({
    data: {
      conversationId,
      role: message.role,
      content: message.content,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  return { conversationId, messageId: msg.id }
}

/**
 * Get conversation history for a user.
 */
export async function getConversationHistory(
  organizationId: string,
  actorUserId: string,
  limit = 20
): Promise<{ id: string; messages: ConversationMessage[]; lastMessageAt: Date }[]> {
  if (!AI_CONV_AVAILABLE) {
    return []
  }

  const convs = await prisma.aICONversation.findMany({
    where: { organizationId, actorUserId },
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    select: { id: true, messages: true, lastMessageAt: true },
  })
  return convs.map(c => ({
    id: c.id,
    messages: JSON.parse(c.messages) as ConversationMessage[],
    lastMessageAt: c.lastMessageAt,
  }))
}