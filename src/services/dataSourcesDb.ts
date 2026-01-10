// IndexedDB service for storing data sources (files and links)

const DB_NAME = 'DPIADataSources';
const DB_VERSION = 1;
const STORE_NAME = 'dataSources';

export interface DataSource {
  id: string;
  type: 'file' | 'link';
  name: string;
  content: string; // For files: base64 or text content, for links: URL
  extractedText?: string; // Extracted text content for LLM context
  mimeType?: string;
  size?: number;
  createdAt: number;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function addDataSource(dataSource: Omit<DataSource, 'id' | 'createdAt'>): Promise<DataSource> {
  const database = await openDB();

  const newDataSource: DataSource = {
    ...dataSource,
    id: `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(newDataSource);

    request.onsuccess = () => {
      resolve(newDataSource);
    };

    request.onerror = () => {
      reject(new Error('Failed to add data source'));
    };
  });
}

export async function getAllDataSources(): Promise<DataSource[]> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const sources = request.result as DataSource[];
      // Sort by createdAt descending (newest first)
      sources.sort((a, b) => b.createdAt - a.createdAt);
      resolve(sources);
    };

    request.onerror = () => {
      reject(new Error('Failed to get data sources'));
    };
  });
}

export async function getDataSource(id: string): Promise<DataSource | undefined> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as DataSource | undefined);
    };

    request.onerror = () => {
      reject(new Error('Failed to get data source'));
    };
  });
}

export async function deleteDataSource(id: string): Promise<void> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete data source'));
    };
  });
}

export async function updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
  const database = await openDB();
  const existing = await getDataSource(id);

  if (!existing) {
    throw new Error('Data source not found');
  }

  const updated: DataSource = { ...existing, ...updates, id: existing.id };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => {
      resolve(updated);
    };

    request.onerror = () => {
      reject(new Error('Failed to update data source'));
    };
  });
}

export async function clearAllDataSources(): Promise<void> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear data sources'));
    };
  });
}

// Helper function to extract text from files
export async function extractTextFromFile(file: File): Promise<string> {
  const mimeType = file.type;

  // Plain text files
  if (mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml') {
    return await file.text();
  }

  // PDF files - basic extraction (you might want to use pdf.js for better extraction)
  if (mimeType === 'application/pdf') {
    // For PDFs, we'll store the file and let the user know extraction is limited
    return `[PDF Document: ${file.name}] - Content extraction for PDFs requires additional processing. The file has been stored for reference.`;
  }

  // Word documents
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
    return `[Word Document: ${file.name}] - Content extraction for Word documents requires additional processing. The file has been stored for reference.`;
  }

  // Default: try to read as text
  try {
    return await file.text();
  } catch {
    return `[Binary File: ${file.name}] - Unable to extract text content from this file type.`;
  }
}

// Helper function to convert file to base64 for storage
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
