import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';


// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Respect the named database if it's provided in the config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Connection test
async function testConnection() {
  try {
    // Try to get a non-existent doc from server to test connectivity
    await getDocFromServer(doc(db, '_internal_', 'connectivity_test'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firestore is reporting offline. This usually means the Firebase configuration (Project ID or Database ID) is incorrect.");
    }
  }
}

// Run test in background
testConnection();

export default app;
