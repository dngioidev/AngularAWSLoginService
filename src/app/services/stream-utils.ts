export class StreamUtils {
  /**
   * Converts a File to ArrayBuffer to avoid ReadableStream issues
   */
  static async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Converts a File to Uint8Array for S3 upload
   */
  static async fileToUint8Array(file: File): Promise<Uint8Array> {
    const arrayBuffer = await this.fileToArrayBuffer(file);
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Check if ReadableStream is supported
   */
  static isReadableStreamSupported(): boolean {
    return typeof ReadableStream !== 'undefined' && 
           typeof ReadableStream.prototype.getReader === 'function';
  }
}
