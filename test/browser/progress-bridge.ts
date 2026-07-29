import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/firebase';

export function seedLegacyProgress(courseId: string, progress: unknown): Promise<void> {
  return setDoc(doc(db, 'users', auth.currentUser!.uid, 'courses', courseId), progress);
}
