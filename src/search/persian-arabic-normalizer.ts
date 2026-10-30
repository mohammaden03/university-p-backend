/**
 * Persian and Arabic Text Normalization Engine for HTR & Search
 *
 * Provides deterministic Unicode normalization, letter unification,
 * diacritic/tashkeel stripping, tatweel/kashida removal, digit unification,
 * and search snippet extraction.
 */

export interface NormalizerOptions {
  stripDiacritics?: boolean;
  stripTatweel?: boolean;
  unifyLetterVariants?: boolean;
  unifyDigits?: boolean;
  normalizeZwnj?: boolean;
  removePunctuation?: boolean;
}

export class PersianArabicNormalizer {
  // Arabic & Persian Diacritics (Harakat / Tashkeel)
  // \u064B (Tanwin Fatha), \u064C (Tanwin Damma), \u064D (Tanwin Kasra),
  // \u064E (Fatha), \u064F (Damma), \u0650 (Kasra), \u0651 (Shaddah),
  // \u0652 (Sukun), \u0653 (Maddah), \u0654 (Hamza Above), \u0655 (Hamza Below),
  // \u0670 (Superscript Alef)
  private static readonly DIACRITICS_REGEX =
    /[\u064B-\u0655\u0670\u0618-\u061A]/g;

  // Tatweel / Kashida (ـ)
  private static readonly TATWEEL_REGEX = /\u0640/g;

  // Arabic Digits (٠-٩) and Persian Digits (۰-۹)
  private static readonly ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  private static readonly PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  /**
   * Primary normalization function
   */
  public static normalize(
    text: string | null | undefined,
    options: NormalizerOptions = {},
  ): string {
    if (!text) return '';

    const opts: Required<NormalizerOptions> = {
      stripDiacritics: options.stripDiacritics ?? true,
      stripTatweel: options.stripTatweel ?? true,
      unifyLetterVariants: options.unifyLetterVariants ?? true,
      unifyDigits: options.unifyDigits ?? true,
      normalizeZwnj: options.normalizeZwnj ?? true,
      removePunctuation: options.removePunctuation ?? false,
    };

    // 1. Unicode NFC Normalization
    let result = text.normalize('NFC');

    // 2. Strip Diacritics (Tashkeel)
    if (opts.stripDiacritics) {
      result = result.replace(this.DIACRITICS_REGEX, '');
    }

    // 3. Strip Tatweel / Kashida (ـ)
    if (opts.stripTatweel) {
      result = result.replace(this.TATWEEL_REGEX, '');
    }

    // 4. Unify Letter Variants (Arabic/Persian equivalents)
    if (opts.unifyLetterVariants) {
      result = result
        // Yeh unification: ي (Arabic Yeh), ى (Alef Maksura), ئ (Yeh with Hamza) -> ی (Persian Yeh)
        .replace(/[يىئ]/g, 'ی')
        // Kaf unification: ك (Arabic Kaf) -> ک (Persian Kaf)
        .replace(/ك/g, 'ک')
        // Teh Marbuta: ة -> ه
        .replace(/ة/g, 'ه')
        // Alef unification: أ, إ, آ, ٱ -> ا
        .replace(/[أإآٱ]/g, 'ا')
        // Waw with Hamza: ؤ -> و
        .replace(/ؤ/g, 'و')
        // Isolated Hamza: ء -> '' or 'ا'
        .replace(/ء/g, '');
    }

    // 5. Unify Arabic and Persian Digits to ASCII (0-9)
    if (opts.unifyDigits) {
      for (let i = 0; i < 10; i++) {
        result = result
          .replaceAll(this.ARABIC_DIGITS[i], i.toString())
          .replaceAll(this.PERSIAN_DIGITS[i], i.toString());
      }
    }

    // 6. Handle Zero-Width Non-Joiner (ZWNJ: \u200C) and ZWJ (\u200D)
    if (opts.normalizeZwnj) {
      // Normalize consecutive ZWNJ/ZWJ or collapse to single standard space for search matching
      result = result.replace(/[\u200C\u200D]+/g, ' ');
    }

    // 7. Optional punctuation removal
    if (opts.removePunctuation) {
      result = result.replace(/[«»؛،؟!.?:;,"'()\[\]{}]/g, ' ');
    }

    // 8. Collapse whitespace and trim
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  /**
   * Generates a context snippet around query terms with <mark> tags
   */
  public static createSnippet(
    originalText: string,
    query: string,
    contextRadius: number = 60,
  ): string {
    if (!originalText) return '';
    if (!query) {
      return originalText.length > 150
        ? originalText.slice(0, 150) + '...'
        : originalText;
    }

    const normQuery = this.normalize(query).toLowerCase();
    const queryTokens = normQuery.split(' ').filter((t) => t.length > 0);

    // Find the position of the first matching token in original text
    let bestIndex = -1;
    let matchedToken = '';

    for (const token of queryTokens) {
      const idx = this.normalize(originalText).toLowerCase().indexOf(token);
      if (idx !== -1) {
        bestIndex = idx;
        matchedToken = token;
        break;
      }
    }

    if (bestIndex === -1) {
      return originalText.length > 150
        ? originalText.slice(0, 150) + '...'
        : originalText;
    }

    const start = Math.max(0, bestIndex - contextRadius);
    const end = Math.min(originalText.length, bestIndex + matchedToken.length + contextRadius);

    let snippet = originalText.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < originalText.length) snippet = snippet + '...';

    // Highlight query tokens using variant-tolerant regex
    // For instance, token 'ازاده' should match 'آزاده', 'ازاده', 'إزاده', etc.
    for (const rawToken of queryTokens) {
      const pattern = this.createVariantRegexPattern(rawToken);
      try {
        const regex = new RegExp(`(${pattern})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
      } catch {
        // Fallback to simple escape
        const fallbackRegex = new RegExp(`(${this.escapeRegExp(rawToken)})`, 'gi');
        snippet = snippet.replace(fallbackRegex, '<mark>$1</mark>');
      }
    }

    return snippet;
  }

  private static createVariantRegexPattern(token: string): string {
    let pattern = '';
    // Optional diacritics between letters
    const diacritics = '[\\u064B-\\u0655\\u0670\\u0640]*';

    for (const char of token) {
      if (char === 'ا') {
        pattern += `[اآإأٱ]${diacritics}`;
      } else if (char === 'ی') {
        pattern += `[یيىئ]${diacritics}`;
      } else if (char === 'ک') {
        pattern += `[کك]${diacritics}`;
      } else if (char === 'ه') {
        pattern += `[ههة]${diacritics}`;
      } else if (char === 'و') {
        pattern += `[ووؤ]${diacritics}`;
      } else {
        pattern += `${this.escapeRegExp(char)}${diacritics}`;
      }
    }
    return pattern;
  }

  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
