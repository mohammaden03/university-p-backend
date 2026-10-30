# Intelligent Persian & Arabic Manuscript HTR/OCR Platform Backend

Backend business layer for the academic project:
> **"Design and Development of an Intelligent HTR/OCR System for Recognition, Reading, and Advanced Search in Persian and Arabic Manuscripts with Islamic Calligraphy."**

Built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and modern REST APIs under `/api/v1`.

---

## 1. System Architecture Overview

```
                      +------------------------------------------+
                      |         Web Client / API Gateway         |
                      +------------------------------------------+
                                           |
                                    REST /api/v1
                                           v
+----------------------------------------------------------------------------------------+
|                                NestJS Application Layer                                |
|                                                                                        |
|  +----------------+  +-----------------+  +-------------------+  +-------------------+  |
|  |  Auth Module   |  | Manuscripts Mod |  |    Pages Module   |  |  Files & Storage  |  |
|  |  (JWT/Bcrypt)  |  | (Bibliographic) |  |   (Image Specs)   |  | (Safe Keys/Magic) |  |
|  +----------------+  +-----------------+  +-------------------+  +-------------------+  |
|                                                                                        |
|  +----------------+  +-----------------+  +-------------------+  +-------------------+  |
|  | Processing Mod |  | Transcriptions  |  |   Search Module   |  |  Datasets Module  |  |
|  | (HTR Workflow) |  | (Revision Hist) |  | (Persian/Arabic)  |  | (Leak Prevention) |  |
|  +----------------+  +-----------------+  +-------------------+  +-------------------+  |
|            |                                                                           |
+------------|---------------------------------------------------------------------------+
             |                                              |
             | Internal HTTP (/v1/recognize)                | Prisma ORM
             v                                              v
+-----------------------------+               +----------------------------+
|  Python FastAPI HTR Service |               |    PostgreSQL Database     |
|   (Deep Learning Models:    |               |  (Users, Manuscripts,      |
|    CRNN-CTC / TrOCR)        |               |   Jobs, Transcriptions)    |
+-----------------------------+               +----------------------------+
```

---

## 2. Key Capabilities

1. **Authentication & Authorization**:
   - Access token JWTs with configurable TTL (`15m`).
   - Secure refresh token rotation with SHA-256 database hashing and revocation.
   - Role-Based Access Control (`ADMIN` vs. `RESEARCHER`).
   - Public registration defaults to `RESEARCHER` role (escalation prevented).

2. **Manuscript & Page Management**:
   - Full bibliographic metadata (title, author, period, repository, script style).
   - Safe archival deletion policy to protect academic transcription history.
   - Page ordering with unique sequence constraints per manuscript.

3. **Secure File Storage**:
   - File signature (magic bytes) validation for `image/jpeg`, `image/png`, `image/tiff`, and `image/webp`.
   - Path traversal prevention using strict root boundary verification.
   - SHA-256 integrity checksums.
   - Secure file streaming endpoint with cache headers.

4. **Deep-Learning AI Service Integration**:
   - Asynchronous job lifecycle: `PENDING` -> `RUNNING` -> `SUCCEEDED` / `FAILED`.
   - Idempotency support to prevent duplicate inference runs.
   - Strict runtime response validation with bounded timeouts.
   - Clear failure states and `AI_SERVICE_UNAVAILABLE` error reporting.

5. **Transcription Revisions & Academic Attribution**:
   - Original AI output is permanently preserved.
   - Human corrections create new immutable revisions (`revisionNumber = max + 1`).
   - Transactional current-revision pointer switching.

6. **Advanced Persian & Arabic Normalization**:
   - Unicode NFC normalization.
   - Letter folding: Yeh (`ي`, `ى`, `ئ` -> `ی`), Kaf (`ك` -> `ک`), Teh Marbuta (`ة` -> `ه`), Alef (`إ`, `أ`, `آ` -> `ا`).
   - Diacritic/Tashkeel stripping (`فَتْحَة`, `ضَمَّة`, `كَسْرَة`, `تَنْوِين`, `شَدَّة`, `سُكُون`).
   - Tatweel/Kashida removal (`ـ`).
   - Digit normalization (Arabic/Persian `۰-۹`, `٠-٩` -> ASCII `0-9`).
   - Search result context snippets with highlighted `<mark>` tags.

7. **Dataset Management & Leak-Free Curation**:
   - Manuscript-level grouping prevents pages from the same book crossing `TRAIN`, `VALIDATION`, and `TEST` partitions.
   - One-click machine learning JSONL dataset exports for approved ground truth.

---

## 3. Directory Layout

```
src/
├── main.ts                        # Application bootstrap, Swagger setup, global filters
├── app.module.ts                  # Root dependency injection container
├── config/
│   └── configuration.ts           # Type-safe environment configuration loader
├── common/
│   ├── decorators/                # @CurrentUser, @Roles, @Public
│   ├── filters/                   # AllExceptionsFilter with standard API error envelopes
│   ├── guards/                    # JwtAuthGuard, RolesGuard
│   ├── interceptors/              # TransformInterceptor {data, meta}, LoggingInterceptor
│   └── interfaces/                # Standard API response, pagination, and JWT interfaces
├── prisma/
│   ├── prisma.service.ts          # Resilient Prisma ORM connection manager
│   └── prisma.module.ts
├── files/
│   ├── storage.interface.ts       # Storage abstraction interface
│   ├── local-storage.service.ts   # Magic bytes validation, checksums, safe path resolution
│   └── files.module.ts
├── ai-client/
│   ├── ai-client.interface.ts     # Python HTR contract definition
│   ├── ai-client.service.ts       # Axios client with timeout, retry, and schema validator
│   └── ai-client.module.ts
├── auth/                          # Register, login, token rotation, and /me
├── users/                         # Admin user list and role management
├── manuscripts/                   # Bibliographic CRUD and safe archival
├── pages/                         # Image upload, metadata, and secure streaming
├── processing/                    # HTR job state machine and orchestrator
├── transcriptions/                # Immutable revisions and set-current switcher
├── search/                        # Persian/Arabic normalizer, snippet highlighter, search API
├── datasets/                      # Sample approval, leak-free partitioner, JSONL export
└── health/                        # Healthcheck (/health) verifying DB, storage, and AI service
```

---

## 4. Local Setup & Installation

### Prerequisites
- Node.js >= 20 LTS (Node 22 recommended)
- PostgreSQL >= 15
- Docker & Docker Compose (optional for containerized deployment)

### 1. Clone & Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```
Ensure your database credentials and secret keys are configured in `.env`.

### 3. Generate Prisma Client & Run Migrations
```bash
# Generate the client
npx prisma generate

# Apply migrations to PostgreSQL
npx prisma migrate deploy

# Seed the database with initial admin, manuscripts, and pages
npx tsx prisma/seed.ts
```

### 4. Start the Application
```bash
# Development mode with hot reload
npm run dev

# Production build and run
npm run build
node dist/main.js
```

The application will be accessible at:
- **Base API**: `http://localhost:3000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:3000/api/docs`
- **System Health**: `http://localhost:3000/health`

---

## 5. Docker Compose Deployment

Run PostgreSQL, the NestJS Backend, and an integrated Python HTR service stub using Docker:

```bash
docker-compose up -d --build
```

View service logs:
```bash
docker-compose logs -f backend
```

---

## 6. Sample API cURL Commands

### 1. Register a Researcher
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "scholar@university.edu",
    "fullName": "Dr. Ahmad Tabatabaei",
    "password": "ScholarPassword123!"
  }'
```

### 2. Login & Obtain JWT Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@manuscript-htr.edu",
    "password": "AdminSecurePassword123!"
  }'
```
*Save the `accessToken` from the response to use in the `Authorization: Bearer <TOKEN>` header.*

### 3. Check Current User Profile (`/auth/me`)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Create a Manuscript
```bash
curl -X POST http://localhost:3000/api/v1/manuscripts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "دیوان صائب تبریزی",
    "author": "میرزا محمدعلی صائب تبریزی",
    "language": "PERSIAN",
    "scriptType": "نستعلیق",
    "historicalPeriod": "قرن یازدهم هـ.ق (دوره صفویه)",
    "repositoryName": "کتابخانه ملی ایران",
    "catalogIdentifier": "NLI-MS-9240",
    "description": "نسخه خطی با جلدی از تیماج قهوه‌ای و خط نستعلیق شیوا."
  }'
```

### 5. Upload a Manuscript Page Image
```bash
curl -X POST http://localhost:3000/api/v1/manuscripts/<MANUSCRIPT_ID>/pages \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/manuscript_page_001.png" \
  -F "pageNumber=1"
```

### 6. Trigger HTR AI Recognition on Page
```bash
curl -X POST http://localhost:3000/api/v1/pages/<PAGE_ID>/recognize \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "PERSIAN",
    "modelName": "qajar-nastaliq-v2",
    "processingOptions": {
      "binarizationMethod": "sauvola",
      "deskew": true
    }
  }'
```

### 7. View Job Status and Result
```bash
curl -X GET http://localhost:3000/api/v1/processing/<JOB_ID>/result \
  -H "Authorization: Bearer <TOKEN>"
```

### 8. Create a Human Edit Revision (Preserves AI History)
```bash
curl -X PATCH http://localhost:3000/api/v1/transcriptions/<TRANSCRIPTION_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "بشنو این نکته که خود را ز غم آزاده کنی\nخون خوری گر طلب روزی ننهاده کنی",
    "notes": "تصحیح پژوهشگر: اصلاح املای کلمه آزاده و اعراب‌گذاری"
  }'
```

### 9. Perform Advanced Normalized Search
```bash
curl -X GET "http://localhost:3000/api/v1/search?q=%D8%B9%D9%84%DB%8C&language=PERSIAN" \
  -H "Authorization: Bearer <TOKEN>"
```

### 10. Export Approved Samples to JSONL
```bash
curl -X GET http://localhost:3000/api/v1/datasets/export?split=TRAIN \
  -H "Authorization: Bearer <TOKEN>" \
  -o train_dataset.jsonl
```

---

## 7. Running Automated Tests

Run the deterministic logic and security unit tests:
```bash
npm test
```
Or execute directly using `tsx`:
```bash
npx --yes tsx --test test/unit/*.test.ts
```

All 18 tests cover normalizer Unicode rules, magic byte file signatures, path traversal protection, cryptography, split leakage prevention, and AI schema validation.
