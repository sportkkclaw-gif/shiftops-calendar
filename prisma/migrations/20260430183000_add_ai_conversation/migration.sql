-- CreateTable: AICONversation
CREATE TABLE "AICONversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sessionId" TEXT,
    "messages" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 1,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex: AICONversation organizationId+actorUserId
CREATE INDEX "AICONversation_organizationId_actorUserId_idx" ON "AICONversation"("organizationId", "actorUserId");

-- CreateTable: AIMessage
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AICONversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);