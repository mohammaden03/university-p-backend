import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageService, StoredFileMetadata } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly storageRoot: string;
  private readonly maxUploadSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const rawRoot = this.configService.get<string>(
      'storage.root',
      './storage/manuscripts',
    );
    this.storageRoot = path.resolve(rawRoot);
    this.maxUploadSize = this.configService.get<number>(
      'storage.maxUploadSizeBytes',
      20971520, // 20 MB default
    );
    this.allowedMimeTypes = this.configService.get<string[]>(
      'storage.allowedMimeTypes',
      ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'],
    );

    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
        this.logger.log(`Initialized storage root at: ${this.storageRoot}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to create storage directory: ${err.message}`);
    }
  }

  public validateImageSignature(
    buffer: Buffer,
    declaredMime: string,
  ): { isValid: boolean; detectedMime?: string; error?: string } {
    if (!buffer || buffer.length < 12) {
      return {
        isValid: false,
        error: 'File content is too small or truncated to be a valid image',
      };
    }

    let detectedMime: string | undefined = undefined;

    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      detectedMime = 'image/jpeg';
    }
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    else if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      detectedMime = 'image/png';
    }
    // TIFF Little Endian: 49 49 2A 00 ("II*")
    else if (
      buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00
    ) {
      detectedMime = 'image/tiff';
    }
    // TIFF Big Endian: 4D 4D 00 2A ("MM*")
    else if (
      buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a
    ) {
      detectedMime = 'image/tiff';
    }
    // WebP signature: "RIFF" at offset 0, and "WEBP" at offset 8
    else if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      detectedMime = 'image/webp';
    }

    if (!detectedMime) {
      return {
        isValid: false,
        error:
          'Unsupported or corrupted image file format. Supported formats: JPEG, PNG, TIFF, WebP.',
      };
    }

    // Check if detected format matches declared mime or is permitted
    if (!this.allowedMimeTypes.includes(detectedMime)) {
      return {
        isValid: false,
        error: `Detected file type '${detectedMime}' is not permitted by configuration.`,
      };
    }

    // Normalized comparison for jpeg/jpg
    const normDeclared = declaredMime.toLowerCase().replace('jpg', 'jpeg');
    const normDetected = detectedMime.toLowerCase();

    if (normDeclared !== normDetected) {
      return {
        isValid: false,
        detectedMime,
        error: `Declared MIME type '${declaredMime}' does not match actual file signature ('${detectedMime}').`,
      };
    }

    return { isValid: true, detectedMime };
  }

  public calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public async saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    declaredMimeType: string,
  ): Promise<StoredFileMetadata> {
    if (fileBuffer.length > this.maxUploadSize) {
      throw new BadRequestException(
        `File size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${(this.maxUploadSize / (1024 * 1024)).toFixed(2)} MB`,
      );
    }

    const validation = this.validateImageSignature(fileBuffer, declaredMimeType);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    const effectiveMime = validation.detectedMime || declaredMimeType;
    const extension = this.getExtensionForMime(effectiveMime);
    const checksum = this.calculateChecksum(fileBuffer);

    // Generate safe UUID-based storage key with date prefix for partition management
    const datePrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const uniqueId = crypto.randomUUID();
    const safeStorageKey = `${datePrefix}/${uniqueId}.${extension}`;

    const destinationPath = this.resolveSafePath(safeStorageKey);
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      await fs.promises.writeFile(destinationPath, fileBuffer);
    } catch (err: any) {
      this.logger.error(`Error saving file to storage: ${err.message}`);
      throw new InternalServerErrorException('Failed to persist image to storage');
    }

    // Extract dimensions if possible
    const dimensions = this.extractDimensions(fileBuffer, effectiveMime);

    return {
      storageKey: safeStorageKey,
      originalFilename: path.basename(originalFilename),
      mimeType: effectiveMime,
      fileSize: fileBuffer.length,
      checksum,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: new Date(),
    };
  }

  public async getFileStream(storageKey: string): Promise<Readable> {
    const fullPath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File for storage key '${storageKey}' not found.`);
    }
    return fs.createReadStream(fullPath);
  }

  public async getFileBuffer(storageKey: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File for storage key '${storageKey}' not found.`);
    }
    return fs.promises.readFile(fullPath);
  }

  public async deleteFile(storageKey: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  public async fileExists(storageKey: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(storageKey);
    return fs.existsSync(fullPath);
  }

  /**
   * Resolves storage key safely against storageRoot to prevent path traversal
   */
  public resolveSafePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) {
      this.logger.warn(`Potential path traversal attempt detected for key: ${storageKey}`);
      throw new BadRequestException('Invalid storage key: directory traversal detected.');
    }

    const resolvedPath = path.resolve(this.storageRoot, storageKey);

    if (!resolvedPath.startsWith(this.storageRoot)) {
      this.logger.warn(`Resolved path escapes storage root for key: ${storageKey}`);
      throw new BadRequestException('Invalid storage key: directory traversal detected.');
    }

    return resolvedPath;
  }

  private getExtensionForMime(mime: string): string {
    switch (mime.toLowerCase()) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/tiff':
        return 'tif';
      case 'image/webp':
        return 'webp';
      default:
        return 'bin';
    }
  }

  private extractDimensions(
    buffer: Buffer,
    mime: string,
  ): { width?: number; height?: number } {
    try {
      if (mime === 'image/png' && buffer.length >= 24) {
        // PNG header IHDR starts at byte 16
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      if (mime === 'image/jpeg') {
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          // SOF0, SOF1, SOF2 markers contain height and width
          if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
          ) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }
    } catch {
      // Dimension extraction is optional metadata
    }
    return {};
  }
}
