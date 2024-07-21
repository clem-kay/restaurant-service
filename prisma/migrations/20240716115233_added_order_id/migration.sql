-- CreateTable
CREATE TABLE "OrderSessionId" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "sessionId" TEXT,

    CONSTRAINT "OrderSessionId_pkey" PRIMARY KEY ("id")
);
