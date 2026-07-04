import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const COLLECTION = 'settings';

export interface AcademyInfo {
  name: string;
  logo: string;
  primaryContact: string;
  secondaryContact: string;
  email: string;
  whatsapp: string;
  address: string;
}

export interface CourseFees {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
  [key: string]: number;
}

const DEFAULT_ACADEMY_INFO: AcademyInfo = {
  name: 'Sri Tech Academy',
  logo: '',
  primaryContact: '9952062229',
  secondaryContact: '9094847573',
  email: 'sritechacademy@gmail.com',
  whatsapp: '9952062229',
  address: 'No.8 Vaitheswaran Koil Street, Poondamallee, Chennai - 600056'
};

const DEFAULT_COURSE_FEES: CourseFees = {
  c1: 1500,
  c2: 1500,
  c3: 2000,
  c4: 2000,
  c5: 3000,
  c6: 4500,
  c7: 3000
};

class SettingsService {
  private academyInfo: AcademyInfo = DEFAULT_ACADEMY_INFO;
  private courseFees: CourseFees = DEFAULT_COURSE_FEES;
  private isInitialized = false;

  constructor() {
    this.initRealtimeSync();
  }

  private initRealtimeSync() {
    const colRef = collection(db, COLLECTION);
    onSnapshot(colRef, (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        if (docSnap.id === 'academy_info') {
          this.academyInfo = { ...DEFAULT_ACADEMY_INFO, ...docSnap.data() } as AcademyInfo;
        } else if (docSnap.id === 'course_fees') {
          this.courseFees = { ...DEFAULT_COURSE_FEES, ...docSnap.data() } as CourseFees;
        }
      });
      this.isInitialized = true;
    }, (err) => {
      console.error('[SettingsService] Realtime sync error:', err);
    });

    this.seedDefaultsIfNeeded();
  }

  private async seedDefaultsIfNeeded() {
    try {
      const infoRef = doc(db, COLLECTION, 'academy_info');
      const infoSnap = await getDoc(infoRef);
      if (!infoSnap.exists()) {
        await setDoc(infoRef, DEFAULT_ACADEMY_INFO);
      }

      const feesRef = doc(db, COLLECTION, 'course_fees');
      const feesSnap = await getDoc(feesRef);
      if (!feesSnap.exists()) {
        await setDoc(feesRef, DEFAULT_COURSE_FEES);
      }
    } catch (err) {
      console.warn('[SettingsService] Seeding default settings failed (might be permissions/auth issue during boot):', err);
    }
  }

  getAcademyInfo(): AcademyInfo {
    if (!this.isInitialized) {
      const saved = localStorage.getItem('sri_tech_academy_info');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return this.academyInfo;
  }

  getCourseFees(): CourseFees {
    if (!this.isInitialized) {
      const saved = localStorage.getItem('sri_tech_academy_course_fees');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return this.courseFees;
  }

  async updateAcademyInfo(info: AcademyInfo): Promise<void> {
    const infoRef = doc(db, COLLECTION, 'academy_info');
    await setDoc(infoRef, info);
    this.academyInfo = info;
    localStorage.setItem('sri_tech_academy_info', JSON.stringify(info));
  }

  async updateCourseFees(fees: CourseFees): Promise<void> {
    const feesRef = doc(db, COLLECTION, 'course_fees');
    await setDoc(feesRef, fees);
    this.courseFees = fees;
    localStorage.setItem('sri_tech_academy_course_fees', JSON.stringify(fees));
  }

  subscribe(callback: (data: { academyInfo: AcademyInfo; courseFees: CourseFees }) => void): () => void {
    const colRef = collection(db, COLLECTION);
    return onSnapshot(colRef, (snapshot) => {
      let info = { ...this.academyInfo };
      let fees = { ...this.courseFees };
      snapshot.docs.forEach((docSnap) => {
        if (docSnap.id === 'academy_info') {
          info = { ...DEFAULT_ACADEMY_INFO, ...docSnap.data() } as AcademyInfo;
        } else if (docSnap.id === 'course_fees') {
          fees = { ...DEFAULT_COURSE_FEES, ...docSnap.data() } as CourseFees;
        }
      });
      callback({ academyInfo: info, courseFees: fees });
    });
  }
}

export const settingsService = new SettingsService();
