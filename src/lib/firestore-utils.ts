import { auth, db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ActivityEvent } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function logActivity(activity: Omit<ActivityEvent, 'id' | 'date'>) {
  try {
    await addDoc(collection(db, 'activity'), {
      ...activity,
      date: Timestamp.now(),
      userName: auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema',
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export function generateSearchKeywords(texts: (string | undefined | null)[]): string[] {
  const keywords = new Set<string>();
  
  texts.forEach(text => {
    if (!text) return;
    
    // Normalize: lowercase, remove accents
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Split into words by any non-alphanumeric character
    const words = normalized.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
    words.forEach(word => {
      keywords.add(word);
      // Add prefixes for search (up to 15 chars)
      for (let i = 2; i <= Math.min(word.length, 15); i++) {
        keywords.add(word.substring(0, i));
      }
    });
    
    // Also add the full normalized string if it's short enough or relevant
    if (normalized.length >= 2 && normalized.length < 100) {
      keywords.add(normalized);
      // Add prefixes for the whole string too
      for (let i = 2; i <= Math.min(normalized.length, 15); i++) {
        keywords.add(normalized.substring(0, i));
      }
    }
  });
  
  // Firestore has a limit of 10 index entries per array-contains query? 
  // No, the limit is on the number of elements in the array (max 1MB per doc, but index limits apply).
  // Usually 100-200 keywords is fine.
  return Array.from(keywords).slice(0, 250);
}
