import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const adminService = {
  async getAllUsers() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => doc.data());
  },

  async getAllDevices() {
    const querySnapshot = await getDocs(collection(db, 'devices'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
