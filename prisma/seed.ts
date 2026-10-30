import { PrismaClient, Role, Language, TranscriptionSource, DatasetSampleStatus, DatasetSplit } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Persian & Arabic Manuscript HTR/OCR Platform...');

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@manuscript-htr.edu';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminSecurePassword123!';
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Chief Manuscript Archivist';

  const researcherEmail = 'researcher@manuscript-htr.edu';
  const researcherPassword = 'ResearcherPassword123!';

  // Hash passwords
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminPassword, adminSalt);

  const resSalt = await bcrypt.genSalt(10);
  const resHash = await bcrypt.hash(researcherPassword, resSalt);

  // 1. Seed Users
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      fullName: adminName,
      passwordHash: adminHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const researcher = await prisma.user.upsert({
    where: { email: researcherEmail },
    update: {
      passwordHash: resHash,
      role: Role.RESEARCHER,
      isActive: true,
    },
    create: {
      email: researcherEmail,
      fullName: 'Dr. Maryam Tehrani',
      passwordHash: resHash,
      role: Role.RESEARCHER,
      isActive: true,
    },
  });

  console.log(`✅ Seeded Users: ${admin.email} (ADMIN), ${researcher.email} (RESEARCHER)`);

  // Ensure storage directories exist
  const storageRoot = path.resolve(process.env.STORAGE_ROOT || './storage/manuscripts');
  const dateDir = path.join(storageRoot, '2026-10-30');
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }

  // Create a minimal 1x1 valid PNG image buffer for seeded page storage keys
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A + minimal chunk
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const key1 = `2026-10-30/page_hafez_001.png`;
  const key2 = `2026-10-30/page_sahifeh_001.png`;
  const key3 = `2026-10-30/page_golestan_001.png`;

  fs.writeFileSync(path.join(storageRoot, key1), minimalPng);
  fs.writeFileSync(path.join(storageRoot, key2), minimalPng);
  fs.writeFileSync(path.join(storageRoot, key3), minimalPng);

  // 2. Seed Manuscripts
  const ms1 = await prisma.manuscript.upsert({
    where: { id: 'a1111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'a1111111-1111-1111-1111-111111111111',
      title: 'دیوان حافظ شیرازی (نسخه خطی قاجاری)',
      author: 'خواجه شمس‌الدین محمد حافظ شیرازی',
      language: Language.PERSIAN,
      scriptType: 'نستعلیق',
      historicalPeriod: 'اوایل قرن سیزدهم هـ.ق (دوره قاجار)',
      repositoryName: 'کتابخانه و موزه ملی ملک',
      catalogIdentifier: 'MS-MAL-4821',
      description: 'نسخه خطی نفیس با تذهیب زرین، کتیبه‌های لاجوردی و خط نستعلیق جلی خوش‌آهنگ.',
      createdById: admin.id,
    },
  });

  const ms2 = await prisma.manuscript.upsert({
    where: { id: 'b2222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: 'b2222222-2222-2222-2222-222222222222',
      title: 'صحیفه سجادیه (نسخه خط کهن نسخ صفوی)',
      author: 'امام علی بن الحسین زین العابدین (ع)',
      language: Language.ARABIC,
      scriptType: 'نسخ',
      historicalPeriod: 'قرن یازدهم هـ.ق (دوره صفویه)',
      repositoryName: 'کتابخانه مرکزی آستان قدس رضوی',
      catalogIdentifier: 'MS-AQR-10492',
      description: 'نسخه کامل ادعیه صحیفه سجادیه با کتابت نسخ شیوای استادان عصر شاه عباس اول.',
      createdById: admin.id,
    },
  });

  const ms3 = await prisma.manuscript.upsert({
    where: { id: 'c3333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: 'c3333333-3333-3333-3333-333333333333',
      title: 'گلستان سعدی شیرازی با شواهد عربی',
      author: 'مصلح بن عبدالله سعدی شیرازی',
      language: Language.MIXED,
      scriptType: 'شکسته نستعلیق',
      historicalPeriod: 'قرن دوازدهم هـ.ق',
      repositoryName: 'کتابخانه مجلس شورای اسلامی',
      catalogIdentifier: 'MS-LIB-2038',
      description: 'دیباچه و حکایات گلستان آراسته به کلمات قصار و احادیث ملمع به خط نسخ در حاشیه.',
      createdById: researcher.id,
    },
  });

  console.log('✅ Seeded Manuscripts: Hafez, Sahifeh, and Golestan');

  // 3. Seed Pages
  const page1 = await prisma.manuscriptPage.upsert({
    where: { imageStorageKey: key1 },
    update: {},
    create: {
      id: 'd4444444-4444-4444-4444-444444444441',
      manuscriptId: ms1.id,
      pageNumber: 1,
      imageStorageKey: key1,
      originalFilename: 'hafez_folio_001r.png',
      mimeType: 'image/png',
      fileSize: minimalPng.length,
      checksum: crypto.createHash('sha256').update(minimalPng).digest('hex'),
      width: 1800,
      height: 2600,
    },
  });

  const page2 = await prisma.manuscriptPage.upsert({
    where: { imageStorageKey: key2 },
    update: {},
    create: {
      id: 'd4444444-4444-4444-4444-444444444442',
      manuscriptId: ms2.id,
      pageNumber: 1,
      imageStorageKey: key2,
      originalFilename: 'sahifeh_folio_001r.png',
      mimeType: 'image/png',
      fileSize: minimalPng.length,
      checksum: crypto.createHash('sha256').update(minimalPng).digest('hex'),
      width: 1750,
      height: 2500,
    },
  });

  const page3 = await prisma.manuscriptPage.upsert({
    where: { imageStorageKey: key3 },
    update: {},
    create: {
      id: 'd4444444-4444-4444-4444-444444444443',
      manuscriptId: ms3.id,
      pageNumber: 1,
      imageStorageKey: key3,
      originalFilename: 'golestan_folio_001r.png',
      mimeType: 'image/png',
      fileSize: minimalPng.length,
      checksum: crypto.createHash('sha256').update(minimalPng).digest('hex'),
      width: 1900,
      height: 2700,
    },
  });

  console.log('✅ Seeded Manuscript Pages');

  // 4. Seed Transcriptions (Initial AI + Human revision)
  const hafezAiText = 'الا یا ایها الساقی ادر کأسا و ناولها\nکه عشق اسان نمود اول ولی افتاد مشکل‌ها';
  const hafezHumanCorrected = 'أَلا یا أیّها الساقی أدِرْ کأساً وناوِلْها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها';

  // AI Revision 1
  const t1 = await prisma.transcription.create({
    data: {
      pageId: page1.id,
      text: hafezAiText,
      normalizedText: 'الا یا ایها الساقی ادر کاسا و ناولها که عشق اسان نمود اول ولی افتاد مشکل ها',
      source: TranscriptionSource.AI,
      isCurrent: false,
      revisionNumber: 1,
      confidence: 0.942,
      notes: 'Initial HTR inference from qajar-nastaliq-ctc-v2 model',
    },
  });

  // Human Revision 2 (Current)
  const t2 = await prisma.transcription.create({
    data: {
      pageId: page1.id,
      text: hafezHumanCorrected,
      normalizedText: 'الا یا ایها الساقی ادر کاسا و ناولها که عشق اسان نمود اول ولی افتاد مشکل ها',
      source: TranscriptionSource.HUMAN,
      isCurrent: true,
      revisionNumber: 2,
      createdById: researcher.id,
      notes: 'تصحیح پژوهشگر: درج اعراب مصراع اول و اصلاح حرکت همزه و مد الف',
    },
  });

  // Arabic Transcription for Sahifeh
  const sahifehText = 'الْحَمْدُ لِلَّهِ الْأَوَّلِ بِلَا أَوَّلٍ كَانَ قَبْلَهُ، وَالْآخِرِ بِلَا آخِرٍ يَكُونُ بَعْدَهُ';
  const t3 = await prisma.transcription.create({
    data: {
      pageId: page2.id,
      text: sahifehText,
      normalizedText: 'الحمد لله الاول بلا اول کان قبله و الاخر بلا اخر یکون بعده',
      source: TranscriptionSource.HUMAN,
      isCurrent: true,
      revisionNumber: 1,
      createdById: admin.id,
      notes: 'دعای اول صحیفه سجادیه - متن تصحیح‌شده نسخه خطی',
    },
  });

  console.log('✅ Seeded Transcriptions with revision history');

  // 5. Seed Dataset Samples (Train and Test partitions)
  await prisma.datasetSample.create({
    data: {
      pageId: page1.id,
      transcriptionId: t2.id,
      status: DatasetSampleStatus.APPROVED,
      split: DatasetSplit.TRAIN,
      notes: 'High-confidence Qajar Nasta\'liq calligraphy sample approved for training',
      createdById: researcher.id,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.datasetSample.create({
    data: {
      pageId: page2.id,
      transcriptionId: t3.id,
      status: DatasetSampleStatus.APPROVED,
      split: DatasetSplit.TEST,
      notes: 'Naskh liturgical calligraphy benchmark test sample',
      createdById: admin.id,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  console.log('✅ Seeded Dataset Samples with splits');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
