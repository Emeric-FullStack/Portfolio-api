import { promises as fs } from "fs";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function processAttachments(
  files: Express.Multer.File[]
): Promise<string> {
  const textContents: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();

    try {
      switch (ext) {
        case ".txt": {
          const text = await fs.readFile(file.path, "utf-8");
          textContents.push(text);
          break;
        }

        case ".pdf": {
          const pdfBuffer = await fs.readFile(file.path);
          const pdfData = await pdf(pdfBuffer);
          textContents.push(pdfData.text);
          break;
        }

        case ".doc":
        case ".docx": {
          const docBuffer = await fs.readFile(file.path);
          const result = await mammoth.extractRawText({ buffer: docBuffer });
          textContents.push(result.value);
          break;
        }
      }
    } catch (error) {
      console.error(
        `Erreur lors du traitement du fichier ${file.originalname}:`,
        error
      );
    }
  }

  return textContents.join("\n\n");
}
