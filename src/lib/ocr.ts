import { createWorker } from "tesseract.js";

let workerInstance: any = null;

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker("eng");
  }
  return workerInstance;
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<string> {
  try {
    const worker = await getWorker();
    const ret = await worker.recognize(imageSource);
    const text = ret.data?.text || "";
    return text.trim();
  } catch (error) {
    console.error("OCR extraction error:", error);
    try {
      const freshWorker = await createWorker("eng");
      const ret = await freshWorker.recognize(imageSource);
      await freshWorker.terminate();
      return ret.data?.text?.trim() || "";
    } catch (e) {
      console.error("Fresh worker OCR failed:", e);
      return "";
    }
  }
}
