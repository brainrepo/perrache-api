-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS');

-- CreateTable
CREATE TABLE "apis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_versions" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "specJson" JSONB NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "api_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endpoints" (
    "id" TEXT NOT NULL,
    "apiVersionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "domainObjectEmbedding" vector(1536),
    "fullEndpointEmbedding" vector(1536),
    "summary" TEXT,
    "description" TEXT,
    "operationId" TEXT,
    "tags" TEXT[],
    "requestSchema" JSONB,
    "responseSchema" JSONB,
    "parameters" JSONB,
    "headers" JSONB,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apis_name_idx" ON "apis"("name");

-- CreateIndex
CREATE INDEX "api_versions_apiId_environment_idx" ON "api_versions"("apiId", "environment");

-- CreateIndex
CREATE INDEX "api_versions_uploadedAt_idx" ON "api_versions"("uploadedAt");

-- CreateIndex
CREATE INDEX "endpoints_apiVersionId_idx" ON "endpoints"("apiVersionId");

-- CreateIndex
CREATE INDEX "endpoints_deprecated_idx" ON "endpoints"("deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "endpoints_apiVersionId_path_method_key" ON "endpoints"("apiVersionId", "path", "method");

-- AddForeignKey
ALTER TABLE "api_versions" ADD CONSTRAINT "api_versions_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_apiVersionId_fkey" FOREIGN KEY ("apiVersionId") REFERENCES "api_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
