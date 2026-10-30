-- Initial Migration for Persian & Arabic Manuscript HTR/OCR Platform
-- Database: PostgreSQL

-- CreateEnums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESEARCHER');
CREATE TYPE "Language" AS ENUM ('PERSIAN', 'ARABIC', 'MIXED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "TranscriptionSource" AS ENUM ('AI', 'HUMAN');
CREATE TYPE "DatasetSampleStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED');
CREATE TYPE "DatasetSplit" AS ENUM ('TRAIN', 'VALIDATION', 'TEST', 'UNASSIGNED');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RESEARCHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable Manuscript
CREATE TABLE "Manuscript" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "language" "Language" NOT NULL DEFAULT 'PERSIAN',
    "description" TEXT,
    "repositoryName" TEXT,
    "catalogIdentifier" TEXT,
    "historicalPeriod" TEXT,
    "scriptType" TEXT,
    "sourceReference" TEXT,
    "createdById" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manuscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManuscriptPage
CREATE TABLE "ManuscriptPage" (
    "id" TEXT NOT NULL,
    "manuscriptId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageStorageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProcessingJob
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "language" "Language" NOT NULL DEFAULT 'PERSIAN',
    "modelName" TEXT,
    "modelVersion" TEXT,
    "processingOptions" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "executionDurationMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable Transcription
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "processingJobId" TEXT,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "source" "TranscriptionSource" NOT NULL DEFAULT 'AI',
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "revisionNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "confidence" DOUBLE PRECISION,
    "lineRegions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateTable DatasetSample
CREATE TABLE "DatasetSample" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "transcriptionId" TEXT,
    "status" "DatasetSampleStatus" NOT NULL DEFAULT 'DRAFT',
    "split" "DatasetSplit" NOT NULL DEFAULT 'UNASSIGNED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable LineRegion
CREATE TABLE "LineRegion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "transcriptionId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "boundingBox" JSONB NOT NULL,
    "text" TEXT,
    "confidence" DOUBLE PRECISION,
    "readingOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Manuscript_title_idx" ON "Manuscript"("title");
CREATE INDEX "Manuscript_language_idx" ON "Manuscript"("language");
CREATE INDEX "Manuscript_scriptType_idx" ON "Manuscript"("scriptType");
CREATE INDEX "Manuscript_historicalPeriod_idx" ON "Manuscript"("historicalPeriod");
CREATE INDEX "Manuscript_catalogIdentifier_idx" ON "Manuscript"("catalogIdentifier");
CREATE INDEX "Manuscript_isArchived_idx" ON "Manuscript"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "ManuscriptPage_imageStorageKey_key" ON "ManuscriptPage"("imageStorageKey");
CREATE UNIQUE INDEX "ManuscriptPage_manuscriptId_pageNumber_key" ON "ManuscriptPage"("manuscriptId", "pageNumber");
CREATE INDEX "ManuscriptPage_manuscriptId_idx" ON "ManuscriptPage"("manuscriptId");
CREATE INDEX "ManuscriptPage_pageNumber_idx" ON "ManuscriptPage"("pageNumber");
CREATE INDEX "ManuscriptPage_isArchived_idx" ON "ManuscriptPage"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingJob_idempotencyKey_key" ON "ProcessingJob"("idempotencyKey");
CREATE INDEX "ProcessingJob_pageId_idx" ON "ProcessingJob"("pageId");
CREATE INDEX "ProcessingJob_requestedById_idx" ON "ProcessingJob"("requestedById");
CREATE INDEX "ProcessingJob_status_idx" ON "ProcessingJob"("status");
CREATE INDEX "ProcessingJob_createdAt_idx" ON "ProcessingJob"("createdAt");

-- CreateIndex
CREATE INDEX "Transcription_pageId_isCurrent_idx" ON "Transcription"("pageId", "isCurrent");
CREATE INDEX "Transcription_revisionNumber_idx" ON "Transcription"("revisionNumber");
CREATE INDEX "Transcription_source_idx" ON "Transcription"("source");

-- CreateIndex
CREATE INDEX "DatasetSample_pageId_idx" ON "DatasetSample"("pageId");
CREATE INDEX "DatasetSample_status_idx" ON "DatasetSample"("status");
CREATE INDEX "DatasetSample_split_idx" ON "DatasetSample"("split");

-- CreateIndex
CREATE INDEX "LineRegion_pageId_idx" ON "LineRegion"("pageId");
CREATE INDEX "LineRegion_transcriptionId_idx" ON "LineRegion"("transcriptionId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Manuscript" ADD CONSTRAINT "Manuscript_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManuscriptPage" ADD CONSTRAINT "ManuscriptPage_manuscriptId_fkey" FOREIGN KEY ("manuscriptId") REFERENCES "Manuscript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ManuscriptPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ManuscriptPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_processingJobId_fkey" FOREIGN KEY ("processingJobId") REFERENCES "ProcessingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ManuscriptPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LineRegion" ADD CONSTRAINT "LineRegion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ManuscriptPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LineRegion" ADD CONSTRAINT "LineRegion_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
