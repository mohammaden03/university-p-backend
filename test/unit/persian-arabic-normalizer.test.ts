import test from 'node:test';
import assert from 'node:assert/strict';
import { PersianArabicNormalizer } from '../../src/search/persian-arabic-normalizer';

test('PersianArabicNormalizer: unifies Arabic and Persian Yeh variants', () => {
  // ي (Arabic Yeh U+064A) -> ی (Persian Yeh U+06CC)
  // ى (Alef Maksura U+0649) -> ی
  const arabicYeh = 'علي'; // Contains U+064A
  const maksura = 'موسى'; // Contains U+0649
  const normalizedAli = PersianArabicNormalizer.normalize(arabicYeh);
  const normalizedMusa = PersianArabicNormalizer.normalize(maksura);

  assert.equal(normalizedAli, 'علی');
  assert.equal(normalizedMusa, 'موسی');
});

test('PersianArabicNormalizer: unifies Arabic Kaf to Persian Kaf', () => {
  // ك (Arabic Kaf U+0643) -> ک (Persian Kaf U+06A9)
  const arabicKaf = 'كتاب كرمان';
  const normalized = PersianArabicNormalizer.normalize(arabicKaf);
  assert.equal(normalized, 'کتاب کرمان');
});

test('PersianArabicNormalizer: strips Arabic/Persian diacritics (Harakat / Tashkeel)', () => {
  // فَتْحَة، ضَمَّة، كَسْرَة، تَنْوِين، شَدَّة، سُكُون
  const vocalized = 'بِسمِ اللَّهِ الرَّحمٰنِ الرَّحِيمِ';
  const normalized = PersianArabicNormalizer.normalize(vocalized);
  assert.equal(normalized, 'بسم الله الرحمن الرحیم');
});

test('PersianArabicNormalizer: strips Tatweel / Kashida elongation', () => {
  const elongated = 'صـــــادق هــــدایت';
  const normalized = PersianArabicNormalizer.normalize(elongated);
  assert.equal(normalized, 'صادق هدایت');
});

test('PersianArabicNormalizer: converts Arabic and Persian numerals to ASCII digits', () => {
  const persianDigits = 'نسخه شماره ۱۲۳۴۵ مورخ ۱۰ خرداد ۱۳۲۱';
  const arabicDigits = 'المخطوطة رقم ٩٨٧٦٥';

  const normPersian = PersianArabicNormalizer.normalize(persianDigits);
  const normArabic = PersianArabicNormalizer.normalize(arabicDigits);

  assert.match(normPersian, /12345/);
  assert.match(normPersian, /10/);
  assert.match(normPersian, /1321/);
  assert.match(normArabic, /98765/);
});

test('PersianArabicNormalizer: handles Alef variants (Maddah, Hamza above/below)', () => {
  const words = 'آغاز إسلام أکرم ٱسم';
  const normalized = PersianArabicNormalizer.normalize(words);
  assert.equal(normalized, 'اغاز اسلام اکرم اسم');
});

test('PersianArabicNormalizer: snippet creation highlights query terms with mark tags', () => {
  const text = 'بشنو این نکته که خود را ز غم آزاده کنی خون خوری گر طلب روزی ننهاده کنی';
  const query = 'غم آزاده';
  const snippet = PersianArabicNormalizer.createSnippet(text, query, 30);

  assert.ok(snippet.includes('<mark>غم</mark>'));
  assert.ok(snippet.includes('<mark>آزاده</mark>'));
});
