import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker source to load it from the CDN.
// This is required for the library to work correctly in a browser environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.6.0/build/pdf.worker.mjs';

/**
 * Reads the content of a file, supporting PDF, TXT, MD, and TeX formats.
 * @param file The file to read.
 * @returns A promise that resolves with the text content of the file.
 */
export const readFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'pdf':
            return readPdfFile(file);
        case 'txt':
        case 'md':
        case 'tex':
            return readTextFile(file);
        default:
            console.warn(`Unsupported file type: .${extension}. Attempting to read as text.`);
            return readTextFile(file); // Fallback for other text-like files
    }
};

/**
 * Reads a plain text file.
 * @param file The File object.
 * @returns A promise that resolves with the file's text content.
 */
const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result as string);
            } else {
                reject(new Error("Failed to read file: target result is null."));
            }
        };
        reader.onerror = () => {
            reject(new Error("Failed to read file."));
        };
        reader.readAsText(file);
    });
};

/**
 * Reads and extracts text from a PDF file.
 * @param file The PDF file.
 * @returns A promise that resolves with the extracted text content.
 */
const readPdfFile = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // The `item.str` is the text content we want to extract
            const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
            fullText += pageText + '\n\n'; // Separate pages with double newlines
        }

        return fullText;
    } catch (error) {
        console.error("Error reading PDF file:", error);
        throw new Error("Could not parse the PDF file. It may be corrupted or in an unsupported format.");
    }
};
