import { Readable } from 'stream';

export interface StoredFileMetadata {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  width?: number;
  height?: number;
  createdAt: Date;
}

export interface IStorageService {
  saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    declaredMimeType: string,
  ): Promise<StoredFileMetadata>;

  getFileStream(storageKey: string): Promise<Readable>;

  getFileBuffer(storageKey: string): Promise<Buffer>;

  deleteFile(storageKey: string): Promise<boolean>;

  fileExists(storageKey: string): Promise<boolean>;

  validateImageSignature(
    buffer: Buffer,
    declaredMime: string,
  ): { isValid: boolean; detectedMime?: string; error?: string };

  calculateChecksum(buffer: Buffer): string;
}
