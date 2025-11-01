import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';

export interface ProcessedMedia {
  type: 'text' | 'image' | 'audio' | 'document';
  content?: string;           // Text content for documents/audio transcription
  imageBase64?: string;        // For images: base64 encoded
  imageMimeType?: string;      // e.g., 'image/jpeg'
  originalFileName?: string;
}

/**
 * MediaProcessorService handles conversion and processing of multimedia files
 * for AI models, including:
 * - Image downloads and base64 encoding for Vision API
 * - Audio transcription using Whisper API
 * - Document text extraction (PDF, TXT, etc)
 */
@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);
  private openaiClient: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openaiClient = new OpenAI({ apiKey });
  }

  /**
   * Download file from Telegram using file_id
   * Requires Telegram bot token
   */
  async downloadFromTelegram(
    fileId: string,
    botToken: string,
  ): Promise<Buffer> {
    try {
      const fileUrl = `https://api.telegram.org/bot${botToken}/getFile`;
      const response = await axios.post(fileUrl, { file_id: fileId });

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      const filePath = response.data.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(fileResponse.data);
    } catch (error) {
      this.logger.error(`Failed to download file from Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process image file: download and convert to base64
   */
  async processImage(
    fileId: string,
    botToken: string,
    mimeType: string = 'image/jpeg',
  ): Promise<ProcessedMedia> {
    try {
      this.logger.log(`Processing image from Telegram: ${fileId}`);

      const imageBuffer = await this.downloadFromTelegram(fileId, botToken);
      const base64 = imageBuffer.toString('base64');

      return {
        type: 'image',
        imageBase64: base64,
        imageMimeType: mimeType,
      };
    } catch (error) {
      this.logger.error(`Image processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process audio file: download and transcribe using Whisper API
   */
  async processAudio(
    fileId: string,
    botToken: string,
    fileName: string = 'audio.mp3',
  ): Promise<ProcessedMedia> {
    try {
      this.logger.log(`Processing audio from Telegram: ${fileId}`);

      const audioBuffer = await this.downloadFromTelegram(fileId, botToken);

      // OpenAI SDK expects a ReadableStream or FormData
      // Create a form-data compatible structure
      const Readable = require('stream').Readable;
      const stream = Readable.from([audioBuffer]);

      // Add filename to stream object (OpenAI SDK requirement)
      (stream as any).name = fileName;
      (stream as any).type = 'audio/mpeg';

      try {
        // Transcribe using Whisper API
        const transcript = await this.openaiClient.audio.transcriptions.create({
          file: stream,
          model: 'whisper-1',
          language: 'es', // Spanish, adjust as needed
        } as any);

        this.logger.log(`Audio transcribed: "${transcript.text.substring(0, 50)}..."`);

        return {
          type: 'audio',
          content: transcript.text,
        };
      } catch (apiError) {
        this.logger.error(`Whisper API error: ${apiError.message}`);
        // Return empty transcription on error
        return {
          type: 'audio',
          content: '[Audio no pudo ser transcrito]',
        };
      }
    } catch (error) {
      this.logger.error(`Audio processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process document file: extract text content
   * Supports PDF and plain text files
   */
  async processDocument(
    fileId: string,
    botToken: string,
    fileName: string,
    mimeType: string,
  ): Promise<ProcessedMedia> {
    try {
      this.logger.log(`Processing document from Telegram: ${fileId} (${mimeType})`);

      const fileBuffer = await this.downloadFromTelegram(fileId, botToken);

      let content: string;

      if (mimeType === 'application/pdf') {
        // Extract text from PDF
        content = await this.extractTextFromPDF(fileBuffer);
      } else if (
        mimeType === 'text/plain' ||
        fileName.endsWith('.txt')
      ) {
        // Plain text file
        content = fileBuffer.toString('utf-8');
      } else {
        // Try UTF-8 conversion for unknown text formats
        content = fileBuffer.toString('utf-8');
      }

      // Limit content length (avoid exceeding token limits)
      const maxLength = 4000;
      if (content.length > maxLength) {
        this.logger.warn(
          `Document content truncated from ${content.length} to ${maxLength} characters`,
        );
        content = content.substring(0, maxLength) + '\n[...documento truncado...]';
      }

      this.logger.log(`Document extracted: ${content.length} characters`);

      return {
        type: 'document',
        content,
        originalFileName: fileName,
      };
    } catch (error) {
      this.logger.error(`Document processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text content from PDF file
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Dynamically require pdf-parse to avoid typing issues
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || data.numpages ? `[Documento PDF: ${data.numpages} página(s)]` : '';
    } catch (error) {
      this.logger.error(`PDF parsing failed: ${error.message}`);
      // Return empty string on PDF parsing failure
      return '[PDF no pudo ser procesado]';
    }
  }

  /**
   * Generic processor: determines file type and processes accordingly
   */
  async processMedia(
    fileId: string,
    botToken: string,
    mediaType: 'image' | 'video' | 'audio' | 'voice' | 'document',
    fileName?: string,
    mimeType?: string,
  ): Promise<ProcessedMedia | null> {
    try {
      switch (mediaType) {
        case 'image':
          return await this.processImage(fileId, botToken, mimeType || 'image/jpeg');

        case 'audio':
        case 'voice':
          return await this.processAudio(
            fileId,
            botToken,
            fileName || 'audio.mp3',
          );

        case 'document':
          if (!fileName) {
            this.logger.warn('Document processing skipped: no fileName provided');
            return null;
          }
          return await this.processDocument(
            fileId,
            botToken,
            fileName,
            mimeType || 'application/octet-stream',
          );

        case 'video':
          // Video support: extract audio track and transcribe
          // For now, return null (advanced feature)
          this.logger.warn('Video processing not yet implemented');
          return null;

        default:
          this.logger.warn(`Unknown media type: ${mediaType}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Media processing failed for ${mediaType}: ${error.message}`);
      return null;
    }
  }
}
