import React, { useState, useEffect, useRef, Component, ReactNode, useMemo } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  deleteDoc,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Horse, Lesson, NewsItem, ForumPost, Instructor, ClubFile, BlockedSlot, AppNotification, AppSettings, UserRole, GalleryItem } from './types';
import Markdown from 'react-markdown';
import { 
  Calendar, 
  Users, 
  Home, 
  MessageSquare, 
  Bell, 
  LogOut, 
  Magnet as Horseshoe,
  Newspaper,
  Trophy,
  Menu,
  X,
  Plus,
  Search,
  Phone,
  User as UserIcon,
  Lock,
  MessageCircle,
  ExternalLink,
  ArrowRight,
  Globe,
  Send,
  Trash2,
  Check,
  Edit,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  FileText,
  Clock,
  AlertTriangle,
  Camera,
  Share,
  HelpCircle,
  ChevronDown,
  Mail,
  Key,
  Eye,
  EyeOff,
  Power,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Error Handling ---

enum OperationType {
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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  state = { hasError: false, errorInfo: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      let isFirestoreError = false;
      let parsedError: FirestoreErrorInfo | null = null;
      try {
        // @ts-ignore
        parsedError = JSON.parse(this.state.errorInfo || '');
        if (parsedError && parsedError.operationType) isFirestoreError = true;
      } catch (e) { /* not a json error */ }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-premium border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">Ups! Coś poszło nie tak</h2>
            <div className="text-xs text-text-muted mb-8 leading-relaxed space-y-2">
              <p>Przepraszamy, wystąpił nieoczekiwany błąd aplikacji.</p>
              <p>Może to być spowodowane brakiem uprawnień w bazie danych lub chwilowymi problemami z połączeniem.</p>
            </div>
            {isFirestoreError && parsedError && (
              <div className="text-[10px] bg-bg p-4 rounded-xl mb-8 text-left font-mono overflow-auto max-h-48 border border-border">
                <p className="text-red-600 font-bold mb-2">SZCZEGÓŁY BŁĘDU:</p>
                <div className="space-y-1 opacity-70">
                  <p><span className="font-bold">Info:</span> {parsedError.error}</p>
                  <p><span className="font-bold">Operacja:</span> {parsedError.operationType}</p>
                  <p><span className="font-bold">Ścieżka:</span> {parsedError.path}</p>
                  <p><span className="font-bold">Użytkownik:</span> {parsedError.authInfo.userId || 'Nie zalogowany'}</p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:bg-primary-light transition-colors"
              >
                Odśwież aplikację
              </button>
              <button 
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  } catch (e) {}
                }}
                className="w-full bg-white border border-border text-text-muted py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-bg transition-colors"
              >
                Wyczyść pamięć i odśwież
              </button>
            </div>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return (this.props as any).children;
  }
}

// --- Components ---

const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} bg-primary-dark flex items-center justify-center rounded-2xl border border-white/20 shadow-premium overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0`}>
    <span className="text-white font-serif font-black italic text-lg tracking-tighter">KJW</span>
  </div>
);

const Sidebar = ({ profile, onLogout, activeTab, setActiveTab, unreadCount, appSettings }: { 
  profile: UserProfile | null, 
  onLogout: () => void,
  activeTab: string,
  setActiveTab: (t: string) => void,
  unreadCount: number,
  appSettings: AppSettings | null
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminOrInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

  const menuItems = [
    { id: 'dashboard', label: 'Panel Kontrolny', icon: Home, group: 'Main' },
    { id: 'lessons', label: 'Grafik Zajęć', icon: Calendar, group: 'Main' },
    { id: 'forum', label: 'Komunikaty', icon: MessageSquare, group: 'Społeczność' },
    { id: 'news', label: 'Aktualności', icon: Newspaper, group: 'Społeczność' },
    { id: 'gallery', label: 'Galeria', icon: ImageIcon, group: 'Społeczność' },
    { id: 'badges', label: 'Osiągnięcia', icon: Trophy, group: 'Społeczność' },
  ];

  if (isAdminOrInstructor) {
    menuItems.push({ id: 'availability', label: 'Moja Dostępność', icon: Clock, group: 'Zarządzanie' });
    menuItems.push({ id: 'users', label: 'Użytkownicy', icon: Users, group: 'Zarządzanie' });
    menuItems.push({ id: 'admin', label: 'Ustawienia', icon: Lock, group: 'Zarządzanie' });
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-primary-dark text-white shadow-xl">
      <div className="p-8 pb-4 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Horseshoe size={60} />
        </div>
        <div className="flex items-center gap-4 mb-6 relative z-10 transition-transform hover:scale-[1.02] cursor-default">
          {appSettings?.logoUrl ? (
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md p-2 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
              <img 
                src={appSettings.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/equestrian/200/200";
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <Logo />
          )}
          <div>
            <h1 className="text-lg font-serif font-bold italic tracking-tight text-white leading-none">{appSettings?.clubName || 'KJW'}</h1>
            <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-white/30 mt-1">Equestrian Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto custom-scrollbar-light select-none">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <p className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] text-white/20 px-4 mb-4">{group}</p>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-500 group relative ${
                  activeTab === item.id 
                    ? 'bg-white/10 text-white shadow-premium' 
                    : 'hover:bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-5 bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon size={18} className={activeTab === item.id ? 'text-accent' : 'opacity-40 group-hover:opacity-100 transition-opacity'} />
                <span className="text-xs font-medium tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        <div className="pt-6 border-t border-white/5">
           <button
            onClick={() => {
              setActiveTab('notifications');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-500 group relative ${
              activeTab === 'notifications' 
                ? 'bg-white/10 text-white shadow-premium' 
                : 'hover:bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            <div className="relative">
              <Bell size={18} className={activeTab === 'notifications' ? 'text-accent' : 'opacity-40 group-hover:opacity-100 transition-opacity'} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-primary-dark shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              )}
            </div>
            <span className="text-xs font-medium tracking-wide">Powiadomienia</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-accent text-primary-dark text-[9px] font-bold px-2 py-0.5 rounded-full leading-none shadow-sm">{unreadCount}</span>
            )}
          </button>
        </div>
      </nav>

      <div className="p-6 shrink-0 bg-primary-dark/30 border-t border-white/5">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 group hover:border-accent/30 transition-all transition-duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent text-primary-dark flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden relative group-hover:scale-105 transition-transform">
               {profile?.imageUrl ? (
                 <img src={profile.imageUrl} className="w-full h-full object-cover" />
               ) : (
                 profile?.name?.charAt(0) || '?'
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold truncate leading-tight tracking-tight">{profile?.name}</p>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1 italic">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors bg-white/5 rounded-xl border border-transparent hover:border-red-400/20"
          >
            <LogOut size={12} /> Wyloguj się
          </button>
        </div>

        <div className="pt-4 flex items-center justify-center gap-6">
           <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="text-white/20 hover:text-accent transition-colors"><Phone size={14} /></a>
           <a href={`mailto:${appSettings?.clubEmail || 'kontakt@kjwiki.pl'}`} className="text-white/20 hover:text-accent transition-colors"><Mail size={14} /></a>
           <a href={appSettings?.website || '#'} target="_blank" rel="noreferrer" className="text-white/20 hover:text-accent transition-colors"><Globe size={14} /></a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 h-full shrink-0 overflow-hidden">
        <NavContent />
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden bg-primary flex items-center justify-between px-6 sticky top-0 z-50 shadow-xl h-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          {appSettings?.logoUrl ? (
            <div className="w-10 h-10 bg-white p-1.5 rounded-lg flex items-center justify-center">
              <img src={appSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <Logo className="w-10 h-10" />
          )}
          <p className="text-xs font-serif font-bold italic tracking-tight text-white uppercase">{appSettings?.clubName || 'KJW'}</p>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-3 bg-accent text-primary rounded-xl shadow-lg active:scale-95 transition-transform"
        >
          <Menu size={20} />
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[280px] shadow-2xl bg-primary relative">
              <NavContent />
              <button onClick={() => setMobileMenuOpen(false)} className="absolute top-6 right-[-50px] p-2 bg-accent text-primary rounded-xl shadow-xl">
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
      }
    }, 8000); // 8 seconds timeout
    return () => clearTimeout(timer);
  }, [loading]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const isInitialNotificationsLoad = useRef(true);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio system not available');
    }
  };
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ 
    name: '', 
    surname: '', 
    email: '', 
    phone: '',
    password: '',
    confirmPassword: '',
    shareDataConsent: true
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showLoginHelp, setShowLoginHelp] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'app');
    const settingsUnsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setAppSettings(snap.data() as AppSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/app');
    });
    return () => settingsUnsub();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isAdminOrInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

  useEffect(() => {
    if (user?.uid) {
      // Remove orderBy from Firestore query to avoid index requirements
      // We will sort in memory
      const q = isAdminOrInstructor 
        ? query(collection(db, 'notifications'), where('userId', 'in', [user.uid, 'admin']))
        : query(collection(db, 'notifications'), where('userId', '==', user.uid));

      return onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges();
        const hasNew = changes.some(change => change.type === 'added');
        
        if (hasNew && !isInitialNotificationsLoad.current) {
          playNotificationSound();
        }
        
        if (isInitialNotificationsLoad.current) {
          isInitialNotificationsLoad.current = false;
        }

        const data = snapshot.docs.map(doc => ({ 
          ...doc.data() as AppNotification, 
          notificationId: doc.id 
        }));

        // Sort in memory: newest first
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'notifications');
      });
    }
  }, [user?.uid, isAdminOrInstructor]);

  useEffect(() => {
    // Validate Firestore connection
    const validateConn = async () => {
      try {
        await getDoc(doc(db, 'settings', 'app'));
      } catch (e: any) {
        console.error("Firestore connectivity check failed:", e);
      }
    };
    validateConn();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setProfileError(null);
        setUser(u);
        if (u) {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          
      const isAdminEmail = 
            u.email?.toLowerCase() === 'magorzata.kielek@gmail.com' || 
            u.email?.toLowerCase() === 'malgorzata.kielek@gmail.com' ||
            u.email?.toLowerCase() === 'malgosia.kielek@gmail.com';

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (isAdminEmail && data.role !== 'admin') {
              data.role = 'admin';
              await updateDoc(docRef, { role: 'admin' });
              await setDoc(doc(db, 'admins', u.uid), { email: u.email, promotedAt: new Date().toISOString() });
            }
            setProfile(data);
          } else {
            const newProfile: UserProfile = {
              userId: u.uid,
              email: u.email || '',
              name: u.displayName || 'Użytkownik',
              role: 'student',
              shareDataConsent: true,
              createdAt: new Date().toISOString(),
            };
            if (isAdminEmail) {
              newProfile.role = 'admin';
              await setDoc(doc(db, 'admins', u.uid), { email: u.email, promotedAt: new Date().toISOString() });
            }
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        setProfileError(error.message || 'Błąd inicjalizacji profilu. Sprawdź połączenie.');
        // If it's a permission error, it's likely a rule issue
        if (error?.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'auth/startup');
        } else {
          console.error("Auth Startup Error:", error);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      setAuthError('Logowanie Google nie powiodło się. Spróbuj tradycyjnego logowania e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { email, password, confirmPassword, name, surname, phone, shareDataConsent } = loginForm;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setAuthError('Proszę wpisać adres e-mail i hasło.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        if (password.length < 6) {
          throw new Error('Hasło musi mieć minimum 6 znaków.');
        }
        if (password !== confirmPassword) {
          throw new Error('Wpisane hasła nie są identyczne.');
        }
        if (!name.trim() || !surname.trim()) {
          throw new Error('Proszę podać Imię i Nazwisko.');
        }
        if (!phone || phone.trim().length < 9) {
          throw new Error('Podaj poprawny numer telefonu (minimum 9 cyfr).');
        }

        const { user: u } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const fullName = `${name.trim()} ${surname.trim()}`;
        const newProfile: UserProfile = {
          userId: u.uid,
          email: trimmedEmail,
          name: fullName,
          phoneNumber: phone.trim(),
          shareDataConsent: shareDataConsent,
          role: 'student',
          createdAt: new Date().toISOString(),
        };

        const isAdminEmail = trimmedEmail === 'magorzata.kielek@gmail.com' || trimmedEmail === 'malgorzata.kielek@gmail.com';

        if (isAdminEmail) {
          newProfile.role = 'admin';
          await setDoc(doc(db, 'admins', u.uid), { email: trimmedEmail, promotedAt: new Date().toISOString() });
        }

        await setDoc(doc(db, 'users', u.uid), newProfile);
        setProfile(newProfile);
        setUser(u);
      } else {
        try {
          const { user: u } = await signInWithEmailAndPassword(auth, trimmedEmail, password);
          setUser(u);
        } catch (err: any) {
          // If login fails because user doesn't exist, check if it's the admin and guide them
          // Note: Firebase may return invalid-credential instead of user-not-found
          const isAdminEmail = trimmedEmail === 'magorzata.kielek@gmail.com' || trimmedEmail === 'malgorzata.kielek@gmail.com';
          if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && isAdminEmail) {
             setAuthError('Twoje konto administratora nie zostało odnalezione lub hasło jest błędne. Jeśli to Twój pierwszy raz, kliknij "Zarejestruj się tutaj" poniżej.');
             setLoading(false);
             return;
          }
          throw err;
        }
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      let message = 'Wystąpił nieoczekiwany błąd logowania.';
      
      if (error.code === 'auth/admin-restricted-operation') {
        message = 'Logowanie E-mail tymczasowo niedostępne. Upewnij się, że w konsoli Firebase włączona jest metoda logowania "E-mail/Hasło".';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = 'Błędny adres e-mail lub hasło. Jeśli to Twój pierwszy raz, wybierz "Zarejestruj się".';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Konto o tym adresie e-mail już istnieje. Spróbuj się zalogować lub zresetuj hasło.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Problem z połączeniem internetowym. Sprawdź sieć.';
      } else if (error.message) {
        message = error.message;
      }
      
      setAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!loginForm.email.trim()) {
      setAuthError('Podaj e-mail, aby otrzymać link do resetu hasła.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginForm.email.trim().toLowerCase());
      setResetSent(true);
      setAuthError(null);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error: any) {
      setAuthError('Nie udało się wysłać linku. Sprawdź czy e-mail jest poprawny.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    signOut(auth);
  };

  const [globalInstructors, setGlobalInstructors] = useState<Instructor[]>([]);
  const [localHorses, setLocalHorses] = useState<Horse[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, lessonId?: string, lesson?: Lesson, userId?: string, type: 'cancel' | 'delete' | 'book' | 'confirm_participant' } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubHorses = onSnapshot(collection(db, 'horses'), (snap) => {
      setLocalHorses(snap.docs.map(doc => ({ horseId: doc.id, ...doc.data() } as Horse)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'horses'));
    return () => unsubHorses();
  }, [user]);

  const handleBookLesson = async (lesson: Lesson) => {
    if (!profile) return;
    const currentParticipants = lesson.participants || [];
    const maxParticipants = lesson.maxParticipants || (lesson.type === 'grupowa' ? 8 : 1);
    if (currentParticipants.length >= maxParticipants && !currentParticipants.some(p => p.userId === profile.userId)) {
      alert('Brak wolnych miejsc na tę lekcję.');
      return;
    }
    if (currentParticipants.some(p => p.userId === profile.userId)) {
      alert('Jesteś już zapisany/a na tę lekcję.');
      return;
    }
    try {
      const updatedParticipants = [...currentParticipants, { 
        userId: profile.userId, 
        name: profile.name, 
        status: 'pending' as const,
        shareDataConsent: profile.shareDataConsent || false
      }];
      await updateDoc(doc(db, 'lessons', lesson.lessonId), {
        participants: updatedParticipants,
        studentId: profile.userId,
        studentName: profile.name,
        status: 'pending'
      });
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Nowa prośba o rezerwację',
        message: `${profile.name} chce dołączyć do lekcji ${formatLessonTime(lesson.startTime)}.`,
        type: 'lesson',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      setFeedback({ type: 'success', msg: 'Zapisano pomyślnie!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.lessonId}`);
    }
  };

  const handleCancelLesson = async (lesson: Lesson) => {
    try {
      setConfirmModal(null);
      setFeedback(null);
      await updateDoc(doc(db, 'lessons', lesson.lessonId), { status: 'cancelled' });
      if (lesson.studentId || (lesson.participants && lesson.participants.length > 0)) {
        const notifyIds = new Set<string>();
        if (lesson.studentId) notifyIds.add(lesson.studentId);
        lesson.participants?.forEach(p => notifyIds.add(p.userId));
        for (const uid of Array.from(notifyIds)) {
          await addDoc(collection(db, 'notifications'), {
            userId: uid,
            title: 'Lekcja odwołana',
            message: `Lekcja ${formatLessonTime(lesson.startTime)} została odwołana.`,
            type: 'lesson',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
      setFeedback({ type: 'success', msg: 'Lekcja została odwołana.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.lessonId}`);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      setConfirmModal(null);
      setFeedback(null);
      await deleteDoc(doc(db, 'lessons', lessonId));
      setFeedback({ type: 'success', msg: 'Termin został usunięty.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${lessonId}`);
    }
  };

  const handleConfirmParticipant = async (lesson: Lesson, userId: string) => {
    try {
      setConfirmModal(null);
      const updatedParticipants = (lesson.participants || []).map(p => 
        p.userId === userId ? { ...p, status: 'confirmed' as const } : p
      );
      await updateDoc(doc(db, 'lessons', lesson.lessonId), {
        participants: updatedParticipants,
        status: 'scheduled'
      });
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        title: 'Rezerwacja zatwierdzona!',
        message: `Twoja rezerwacja na lekcję ${formatLessonTime(lesson.startTime)} została zatwierdzona.`,
        type: 'lesson',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      setFeedback({ type: 'success', msg: 'Zatwierdzono uczestnika.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.lessonId}`);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'instructors'), (snap) => {
      setGlobalInstructors(snap.docs.map(doc => ({ instructorId: doc.id, ...doc.data() } as Instructor)));
    });
    return () => unsub();
  }, [user]);

  const handleDeleteItem = async (collectionName: string, id: string) => {
    if (!id) {
       alert('Błąd: Brak identyfikatora elementu.');
       return;
    }
    if (collectionName === 'users' && id === profile?.userId) {
       alert('Nie możesz usunąć własnego konta z tego poziomu.');
       return;
    }
    const msg = collectionName === 'users' ? 'Czy na pewno chcesz usunąć to konto? Użytkownik straci dostęp do aplikacji.' : 'Czy na pewno chcesz usunąć ten element?';
    if (!confirm(msg)) return;
    
    try {
      if (collectionName === 'users') {
        // Cleanup related collections when deleting user
        try {
          const qInst = query(collection(db, 'instructors'), where('userId', '==', id));
          const snapInst = await getDocs(qInst);
          for (const d of snapInst.docs) {
            await deleteDoc(doc(db, 'instructors', d.id));
          }
        } catch (e) {
          console.warn("Cleanup instructors failed:", e);
        }
        
        try {
          await deleteDoc(doc(db, 'admins', id));
        } catch (e) {
          console.warn("Cleanup admins failed:", e);
        }
      }

      // Pre-deletion check for role reset
      let userIdToReset: string | null = null;
      if (collectionName === 'instructors') {
        const item = globalInstructors.find(inst => inst.instructorId === id);
        if (item?.userId) userIdToReset = item.userId;
      }

      await deleteDoc(doc(db, collectionName, id));
      
      if (userIdToReset && collectionName === 'instructors') {
         try {
           await updateDoc(doc(db, 'users', userIdToReset), { role: 'student' });
         } catch (roleErr) {
           console.warn("Nie udało się zresetować roli użytkownika:", roleErr);
         }
      }
      
      alert('Element został pomyślnie usunięty.');
    } catch (error: any) {
      console.error("Delete Error:", error);
      alert(`Błąd podczas usuwania: ${error.message || 'Brak uprawnień lub błąd połączenia'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-bg relative">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">
            {loadingTimeout ? 'System uruchamia się nietypowo długo...' : 'Ładowanie systemu...'}
          </p>
          
          {loadingTimeout && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-4">Może występować problem z połączeniem</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-accent hover:text-primary transition-all"
              >
                Odśwież stronę
              </button>
            </div>
          )}

          <button 
            onClick={() => signOut(auth).then(() => window.location.reload())}
            className="mt-8 text-[10px] font-bold uppercase tracking-widest text-accent hover:underline decoration-2 underline-offset-4"
          >
            Wyloguj i zresetuj (jeśli utkniesz)
          </button>
        </div>
      </div>
    );
  }

  // If user is authenticated but profile is being fetched/created
  if (user && !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-bg relative">
        <div className="flex flex-col items-center gap-6 px-10 text-center">
          {profileError ? (
            <>
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="text-sm font-bold text-primary uppercase tracking-tight max-w-sm">Wystąpił problem z Twoim profilem</p>
              <p className="text-[10px] text-text-muted uppercase tracking-widest leading-relaxed max-w-xs">{profileError}</p>
              <div className="flex flex-col gap-4 mt-6">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-4 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-button hover:shadow-xl transition-all"
                >
                  Spróbuj ponownie
                </button>
                <button 
                  onClick={() => signOut(auth)}
                  className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-accent decoration-2 underline-offset-4 underline"
                >
                  Wyloguj i spróbuj innego konta
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent animate-pulse">Inicjalizacja profilu: {user.email}</p>
              <button 
                onClick={() => signOut(auth)}
                className="mt-8 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:underline decoration-2 underline-offset-4"
              >
                Wyloguj (Błąd profilu)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-bg p-6 relative overflow-x-hidden overflow-y-auto">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-[420px] w-full text-center relative z-10 my-10"
        >
          <div className="w-24 h-24 bg-white/50 backdrop-blur-md p-1 rounded-2xl flex items-center justify-center shadow-premium mx-auto mb-6 border border-border overflow-hidden">
            {appSettings?.logoUrl ? (
              <img 
                src={appSettings.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/equestrian/200/200";
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Logo className="w-full h-full rounded-xl" />
            )}
          </div>
          <h1 className="text-4xl font-serif font-bold mb-1 text-primary italic tracking-tight">{appSettings?.clubName || 'Klub Jeździecki'}</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-8">System Zarządzania</p>
          
          <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-12 rounded-[3.5rem] border border-white shadow-3xl space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-serif font-bold text-primary italic">
                {isRegistering ? 'Stwórz konto' : 'Zaloguj się'}
              </h2>
              <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold opacity-60">
                {isRegistering ? 'Dołącz do społeczności KJ WIKI' : 'Podaj dane dostępowe do panelu'}
              </p>
            </div>
            
            <form onSubmit={handleCustomLogin} className="space-y-6 text-left">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold"
                >
                  <AlertTriangle className="shrink-0" size={16} />
                  <span>{authError}</span>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                <motion.div 
                  key={isRegistering ? 'register' : 'login'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {resetSent && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold mb-4 shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                        <Check size={14} />
                      </div>
                      <span>Link do przywrócenia hasła został wysłany na Twój e-mail!</span>
                    </motion.div>
                  )}

                  {isRegistering && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-accent px-1">Imię</label>
                          <input 
                            type="text" required placeholder="Imię" autoComplete="given-name"
                            className="w-full p-4 bg-bg border border-border rounded-2xl outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold"
                            value={loginForm.name}
                            onChange={e => setLoginForm({...loginForm, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-accent px-1">Nazwisko</label>
                          <input 
                            type="text" required placeholder="Nazwisko" autoComplete="family-name"
                            className="w-full p-4 bg-bg border border-border rounded-2xl outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold"
                            value={loginForm.surname}
                            onChange={e => setLoginForm({...loginForm, surname: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-accent px-1">Numer Telefonu</label>
                        <div className="relative group">
                          <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted/40 group-focus-within:text-accent transition-colors" />
                          <input 
                            type="tel" required placeholder="np. 500 600 700" autoComplete="tel"
                            className="w-full p-5 pl-14 bg-bg border border-border rounded-[1.5rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold tracking-wide"
                            value={loginForm.phone}
                            onChange={e => setLoginForm({...loginForm, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent px-1">E-mail</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted/40 group-focus-within:text-accent transition-colors" />
                      <input 
                        type="email" required placeholder="twoj@email.pl" autoComplete="email"
                        className="w-full p-5 pl-14 bg-bg border border-border rounded-[1.5rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold tracking-wide"
                        value={loginForm.email}
                        onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent">Hasło</label>
                      {!isRegistering && (
                        <button 
                          type="button"
                          onClick={handleResetPassword}
                          className="text-[10px] font-extrabold text-accent uppercase tracking-widest hover:underline cursor-pointer bg-accent/5 px-3 py-1 rounded-lg border border-accent/10 transition-all hover:bg-accent/10"
                        >
                          Nie pamiętam hasła
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted/40 group-focus-within:text-accent transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"} required placeholder="••••••••" autoComplete="current-password"
                        className="w-full p-5 pl-14 bg-bg border border-border rounded-[1.5rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold tracking-wide"
                        value={loginForm.password}
                        onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted/40 hover:text-accent transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {isRegistering && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-accent px-1">Powtórz hasło</label>
                        <input 
                          type="password" required placeholder="••••••••"
                          className="w-full p-5 bg-bg border border-border rounded-[1.5rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm font-semibold"
                          value={loginForm.confirmPassword}
                          onChange={e => setLoginForm({...loginForm, confirmPassword: e.target.value})}
                        />
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/20 rounded-2xl cursor-pointer group transition-all hover:bg-accent/10"
                           onClick={() => setLoginForm({...loginForm, shareDataConsent: !loginForm.shareDataConsent})}>
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${loginForm.shareDataConsent ? 'bg-accent border-accent text-white' : 'border-accent/30 text-transparent'}`}>
                          <Check size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Widoczność dla innych</p>
                          <p className="text-[9px] text-text-muted leading-relaxed">Wyrażam zgodę, aby inni klubowicze widzieli moje imię i nazwisko na listach uczestników zajęć.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

                  <div className="space-y-4 pt-4">
                <p className="text-[9px] text-text-muted leading-relaxed px-2 opacity-60 text-center">
                  Klikając przycisk poniżej, oświadczasz że zapoznałeś się z regulaminem klubu. Administratorem danych jest <span className="font-bold text-primary italic">{appSettings?.clubName || 'Klub Jeździecki WIKI'}</span>.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-bold hover:bg-primary-light transition-all shadow-premium flex items-center justify-center gap-3 uppercase tracking-[0.4em] text-[10px] active:scale-[0.98] disabled:opacity-50 ring-offset-4 focus:ring-2 focus:ring-primary"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full" />
                      Przetwarzanie...
                    </div>
                  ) : (
                    isRegistering ? 'Stwórz konto' : 'Zaloguj się'
                  )}
                </button>

                {!isRegistering && (
                  <>
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-40">lub</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full py-5 bg-white border border-border text-primary rounded-[1.5rem] font-bold hover:bg-bg transition-all shadow-sm flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] active:scale-[0.98] disabled:opacity-50"
                    >
                      <Globe size={16} className="text-blue-500" />
                      Zaloguj się przez Google
                    </button>
                  </>
                )}

                <button 
                  type="button" 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError(null);
                  }}
                  className="w-full text-center text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-accent transition-colors px-4 py-2"
                >
                  {isRegistering ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się tutaj'}
                </button>

                {!isRegistering && (
                  <button 
                    type="button" 
                    onClick={handleResetPassword}
                    className="w-full text-center text-[9px] font-bold text-accent/60 uppercase tracking-widest hover:text-accent transition-colors mt-2"
                  >
                    Możesz też zresetować hasło klikając tutaj
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8 space-y-4 opacity-70">
            <button 
              onClick={() => setShowLoginHelp(true)}
              className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] hover:underline underline-offset-4 decoration-accent/40"
            >
              Jak się zalogować? • Instrukcja
            </button>
            <div className="flex flex-col items-center gap-2 pt-2">
              <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="text-xs font-bold text-accent italic flex items-center gap-2">
                <Phone size={12} /> Zadzwoń: {appSettings?.mainPhone || '+48 504 270 174'}
              </a>
              <a 
                href={appSettings?.website ? (appSettings.website.startsWith('http') ? appSettings.website : `https://${appSettings.website}`) : 'https://www.jazda-konna.com'}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary/60 flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Globe size={12} /> {appSettings?.website || 'www.jazda-konna.com'}
              </a>
            </div>
          </div>
          <p className="mt-8 text-[10px] text-text-muted uppercase tracking-widest font-bold opacity-40">System Zarządzania Stajnią v2.7 • KJ WIKI</p>
        </motion.div>

        <AnimatePresence>
          {showLoginHelp && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-primary/20 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-3xl relative border border-border"
              >
                <button onClick={() => setShowLoginHelp(false)} className="absolute top-8 right-8 text-text-muted hover:text-primary transition-colors">
                  <X size={24} />
                </button>
                
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-8">
                  <HelpCircle size={32} />
                </div>
                
                <h3 className="text-2xl font-serif font-bold text-primary mb-6 italic">Jak dołączyć?</h3>
                
                <div className="space-y-6 text-left">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Jeśli nie masz konta, kliknij <strong>Zarejestruj się tutaj</strong> pod przyciskiem logowania.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Wpisz swój <strong>adres e-mail</strong> oraz ustal bezpieczne <strong>hasło</strong> (minimum 6 znaków).
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Po rejestracji masz <strong>natychmiastowy dostęp</strong> do panelu i możesz od razu wysyłać zapytania o terminy jazd.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowLoginHelp(false)}
                  className="w-full mt-10 bg-primary text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:translate-y-[-2px] transition-all"
                >
                  Wszystko jasne, wracam
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-[100dvh] bg-[#F0F2F1] font-sans flex items-center justify-center p-0 lg:p-6 xl:p-8">
      {/* Version Helper for Caching issues */}
      <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none opacity-20">
        <p className="text-[8px] font-bold uppercase tracking-widest text-primary">Build v2.8 - Calendar Fixed</p>
      </div>
      <div id="main-container" className="w-full max-w-[1850px] min-h-[100dvh] lg:min-h-[90vh] lg:max-h-[94vh] flex flex-col lg:flex-row bg-white rounded-none lg:rounded-[3rem] shadow-premium overflow-hidden border border-black/5 relative">
        <Sidebar 
          profile={profile} 
          onLogout={handleLogout} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          unreadCount={unreadCount}
          appSettings={appSettings}
        />
        
        <main id="main-content" className="flex-1 p-6 lg:p-14 overflow-y-auto overflow-x-hidden bg-[#FDFDFB]/50 custom-scrollbar scroll-smooth pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Top Info Bar - Persistent and Sticky */}
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center sm:justify-end gap-x-8 gap-y-3 mb-8 py-4 bg-white/80 backdrop-blur-md border-b border-border/40 -mx-6 lg:-mx-14 px-6 lg:px-14">
            <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="flex items-center gap-2 text-primary hover:text-accent transition-all group">
              <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                <Phone size={14} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{appSettings?.mainPhone || '+48 504 270 174'}</span>
            </a>
            <a 
              href={appSettings?.website ? (appSettings.website.startsWith('http') ? appSettings.website : `https://${appSettings.website}`) : 'https://www.jazda-konna.com'} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-2 text-primary hover:text-accent transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                <Globe size={14} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{appSettings?.website || 'www.jazda-konna.com'}</span>
            </a>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 group shadow-premium hover:shadow-xl hover:-translate-y-0.5 active:scale-95 border border-red-500"
            >
              <LogOut size={18} />
              <span className="text-xs font-bold tracking-[0.1em] uppercase">Wyloguj się</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.8 }}
              className="flex-1"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  profile={profile} 
                  onNavigate={setActiveTab} 
                  appSettings={appSettings} 
                  deferredPrompt={deferredPrompt}
                  onInstall={handleInstallApp}
                  globalInstructors={globalInstructors}
                  onBook={(lesson) => setConfirmModal({
                    show: true,
                    title: `Czy chcesz się zapisać na lekcję u ${lesson.instructorName} o ${formatLessonTime(lesson.startTime)}?`,
                    type: 'book',
                    lesson
                  })}
                />
              )}
              {activeTab === 'lessons' && (
                <LessonsSection 
                  profile={profile} 
                  onNavigate={setActiveTab} 
                  globalInstructors={globalInstructors}
                  localHorses={localHorses}
                  confirmModal={confirmModal}
                  setConfirmModal={setConfirmModal}
                  feedback={feedback}
                  setFeedback={setFeedback}
                  handleBookLesson={handleBookLesson}
                  handleCancelLesson={handleCancelLesson}
                  handleDeleteLesson={handleDeleteLesson}
                  handleConfirmParticipant={handleConfirmParticipant}
                />
              )}
              {activeTab === 'notifications' && <NotificationsSection notifications={notifications} />}
              {activeTab === 'forum' && <ForumSection profile={profile} />}
              {activeTab === 'news' && <NewsSection profile={profile} />}
              {activeTab === 'availability' && <AvailabilitySection profile={profile} />}
              {activeTab === 'gallery' && <GallerySection />}
              {activeTab === 'badges' && <BadgesSection onSignupClick={() => setActiveTab('lessons')} />}
              {activeTab === 'help' && <HelpSection />}
              {activeTab === 'users' && isAdminOrInstructor && <UsersSection profile={profile} onDeleteUser={(uid) => handleDeleteItem('users', uid)} />}
              {activeTab === 'admin' && isAdminOrInstructor && (
                <AdminSection profile={profile} appSettings={appSettings} onNavigate={setActiveTab} onDeleteItem={handleDeleteItem} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {confirmModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmModal(null)}
                className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-[320px] rounded-[2rem] p-8 shadow-2xl text-center"
              >
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${confirmModal.type === 'cancel' ? 'bg-orange-100 text-orange-600' : (confirmModal.type === 'book' || confirmModal.type === 'confirm_participant') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {confirmModal.type === 'cancel' ? <AlertTriangle size={32} /> : (confirmModal.type === 'book' || confirmModal.type === 'confirm_participant') ? <Check size={32} /> : <Trash2 size={32} />}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {confirmModal.type === 'book' ? 'Zapisać Cię na zajęcia?' : 
                   confirmModal.type === 'confirm_participant' ? 'Zatwierdzić rezerwację?' : 
                   confirmModal.type === 'cancel' ? 'Odwołać lekcję?' :
                   'Potwierdź operację'}
                </h3>
                <p className="text-xs text-text-muted mb-8 leading-relaxed">{confirmModal.title}</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (confirmModal.type === 'cancel' && confirmModal.lesson) {
                        handleCancelLesson(confirmModal.lesson);
                      } else if (confirmModal.type === 'delete' && confirmModal.lessonId) {
                        handleDeleteLesson(confirmModal.lessonId);
                      } else if (confirmModal.type === 'book' && confirmModal.lesson) {
                        handleBookLesson(confirmModal.lesson);
                        setConfirmModal(null);
                      } else if (confirmModal.type === 'confirm_participant' && confirmModal.lesson && confirmModal.userId) {
                        handleConfirmParticipant(confirmModal.lesson, confirmModal.userId);
                        setConfirmModal(null);
                      }
                    }}
                    className={`w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${
                      confirmModal.type === 'cancel' ? 'bg-orange-500 hover:bg-orange-600' : 
                      confirmModal.type === 'book' ? 'bg-primary hover:bg-primary-light' :
                      confirmModal.type === 'confirm_participant' ? 'bg-green-600 hover:bg-green-700' :
                      'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {confirmModal.type === 'cancel' ? 'Odwołaj lekcję' : 
                     confirmModal.type === 'book' ? 'Tak, zapisz mnie' :
                     confirmModal.type === 'confirm_participant' ? 'Zatwierdź' :
                     'Usuń termin'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal(null)}
                    className="w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest text-text-muted bg-bg hover:bg-border/20 transition-all active:scale-95"
                  >
                    Anuluj
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-10 left-10 z-[300]"
            >
              <div className={`px-6 py-4 rounded-2xl text-xs font-bold shadow-premium border flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500 border-green-600' : 'bg-red-500 border-red-600'} text-white`}>
                {feedback.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                {feedback.msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// --- Sub-components (Reconstructed) ---

const Dashboard = ({ profile, onNavigate, appSettings, deferredPrompt, onInstall, globalInstructors, onBook }: { 
  profile: UserProfile | null, 
  onNavigate: (tab: string) => void, 
  appSettings: AppSettings | null,
  deferredPrompt: any,
  onInstall: () => void,
  globalInstructors: Instructor[],
  onBook: (lesson: Lesson) => void
}) => {
  const [showHelper, setShowHelper] = useState(false);
  const isIframe = window.top !== window.self;
  const instructors = globalInstructors;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
  
  const [quickForm, setQuickForm] = useState({
    instructorId: '',
    type: 'indywidualna',
    date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Moved to global instructors
  }, []);

  const handleQuickEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!quickForm.instructorId || !quickForm.date) {
      alert('Wybierz instruktora i termin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const instructor = instructors.find(i => i.instructorId === quickForm.instructorId);
      const startTime = new Date(quickForm.date);
      const endTime = new Date(startTime.getTime() + 60 * 60000);

      await addDoc(collection(db, 'lessons'), {
        instructorId: quickForm.instructorId,
        instructorName: instructor?.name || '',
        studentId: profile.userId,
        studentName: profile.name,
        type: quickForm.type,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        status: 'pending',
        participants: [{
          userId: profile.userId,
          name: profile.name,
          status: 'pending',
          shareDataConsent: profile.shareDataConsent || false
        }],
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Nowa prośba o rezerwację',
        message: `${profile.name} prosi o lekcję (${quickForm.type}) u ${instructor?.name} na ${startTime.toLocaleString('pl-PL')}.`,
        type: 'lesson',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setShowSuccess(true);
      setQuickForm({ instructorId: '', type: 'indywidualna', date: '' });
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'lessons');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h2 className="text-4xl font-serif font-bold text-primary italic leading-tight tracking-tighter">
            Witaj ponownie, <span className="text-accent underline decoration-2 underline-offset-8 decoration-accent/30">{profile?.name?.split(' ')[0]}</span>
          </h2>
          <div className="flex items-center gap-3 mt-4">
            <div className="px-3 py-1 bg-primary text-white text-[9px] font-mono font-bold uppercase tracking-widest rounded-full leading-none">
              Role: {profile?.role || 'Guest'}
            </div>
            {profile?.memberId && (
              <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-[9px] font-mono font-bold uppercase tracking-widest rounded-full leading-none">
                ID: {profile.memberId}
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:block text-right">
          <h4 className="text-primary font-serif font-bold text-lg italic">{new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</h4>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Status: Połączono</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-8">
          {/* Main Dashboard Card */}
          <div className="bg-surface rounded-[2.5rem] p-8 md:p-10 border border-border shadow-premium relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <h3 className="text-3xl font-serif font-bold text-primary italic leading-tight">Twoje zajęcia</h3>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest mt-2">Zaplanowane treningi i jazdy</p>
              </div>
              <button 
                onClick={() => onNavigate('lessons')}
                className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl shadow-button text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
              >
                 Pełny Grafik <ArrowRight size={14} />
              </button>
            </div>
            <UpcomingLessons onNavigate={onNavigate} profile={profile} mode="personal" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* News Teaser */}
             <div className="bg-surface rounded-[2rem] p-8 border border-border shadow-premium flex flex-col justify-between group hover:shadow-elevated transition-all">
                <div>
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                    <Newspaper size={28} />
                  </div>
                  <h4 className="text-2xl font-serif font-bold italic text-primary mb-3">Aktualności</h4>
                  <p className="text-sm text-text-muted leading-relaxed">Sprawdź najnowsze wiadomości z życia stajni i komunikaty klubowe.</p>
                </div>
                <button 
                  onClick={() => onNavigate('news')}
                  className="mt-10 flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:text-accent transition-colors"
                >
                  Zobacz więcej <ArrowRight size={14} />
                </button>
             </div>

             {/* Gallery Teaser */}
             <div className="bg-surface rounded-[2rem] p-8 border border-border shadow-premium flex flex-col justify-between group hover:shadow-elevated transition-all">
                <div>
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                    <ImageIcon size={28} />
                  </div>
                  <h4 className="text-2xl font-serif font-bold italic text-primary mb-3">Galeria zdjęć</h4>
                  <p className="text-sm text-text-muted leading-relaxed">Ostatnie momenty uwiecznione podczas treningów i zawodów.</p>
                </div>
                <button 
                  onClick={() => onNavigate('gallery')}
                  className="mt-10 flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:text-accent transition-colors"
                >
                  Otwórz galerię <ArrowRight size={14} />
                </button>
             </div>
          </div>
        </div>

        <div className="space-y-8 sticky top-8">
          {/* Quick Enroll Form */}
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-premium relative overflow-hidden group">
            <div className="mb-8">
              <h3 className="text-xl font-serif font-bold text-primary italic mb-2">Szybki zapis</h3>
              <p className="text-[9px] text-accent font-bold uppercase tracking-[0.2em]">Wybierz instruktora i termin</p>
            </div>
            
            <AnimatePresence>
              {showSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-white">
                    <Check size={40} />
                  </div>
                  <p className="text-lg font-serif font-bold text-primary mb-2 italic">Prośba wysłana!</p>
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-[0.2em] max-w-[200px]">Czekaj na zatwierdzenie w powiadomieniach.</p>
                  <button onClick={() => setShowSuccess(false)} className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95">Zamknij</button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleQuickEnroll} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted px-1">Instruktor</label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!instructors.length) return;
                      const currentIndex = instructors.findIndex(i => i.instructorId === quickForm.instructorId);
                      const prevIndex = currentIndex <= 0 ? instructors.length - 1 : currentIndex - 1;
                      setQuickForm({...quickForm, instructorId: instructors[prevIndex].instructorId});
                    }}
                    className="p-3 bg-bg border border-border rounded-xl text-primary hover:bg-bg/80 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <select 
                    className="flex-1 p-4 bg-bg border border-border rounded-2xl text-xs font-bold outline-none focus:border-accent transition-all appearance-none cursor-pointer"
                    value={quickForm.instructorId}
                    onChange={e => setQuickForm({...quickForm, instructorId: e.target.value})}
                    required
                  >
                    <option value="">Wybierz kogoś...</option>
                    {instructors.map(i => <option key={i.instructorId} value={i.instructorId}>{i.name}</option>)}
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!instructors.length) return;
                      const currentIndex = instructors.findIndex(i => i.instructorId === quickForm.instructorId);
                      const nextIndex = (currentIndex + 1) % instructors.length;
                      setQuickForm({...quickForm, instructorId: instructors[nextIndex].instructorId});
                    }}
                    className="p-3 bg-bg border border-border rounded-xl text-primary hover:bg-bg/80 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted px-1">Wybierz termin</label>
                <input 
                  type="datetime-local"
                  className="w-full p-4 bg-bg border border-border rounded-2xl text-xs font-bold outline-none focus:border-accent transition-all cursor-pointer"
                  value={quickForm.date}
                  onChange={e => setQuickForm({...quickForm, date: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-accent hover:text-primary-dark transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mx-auto" />
                ) : (
                  'Zarezerwuj teraz'
                )}
              </button>
            </form>
          </div>

          {/* PWA Install Card */}
          {(deferredPrompt || (isIOS && !isStandalone)) && (
            <div className="bg-accent rounded-[2.5rem] p-10 text-primary-dark border-none group overflow-hidden shadow-premium relative">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                 <Globe size={80} />
               </div>
               <h4 className="text-xl font-serif font-bold italic mb-3 relative z-10">Zainstaluj aplikację</h4>
               <p className="text-xs text-primary-dark/60 leading-relaxed mb-8 relative z-10 transition-colors group-hover:text-primary-dark/80">
                 {isIframe 
                   ? 'Otwórz aplikację w nowym oknie (link zewnętrzny), aby móc ją zainstalować na swoim urządzeniu.'
                   : isIOS 
                     ? 'Kliknij ikonę udostępniania w dolnym menu Safari, a następnie wybierz "Do ekranu początkowego", aby zainstalować aplikację.' 
                     : 'Dodaj KJW do swojego ekranu głównego, aby mieć szybki dostęp do grafiku i koni.'}
               </p>
               {isIframe ? (
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 px-6 bg-primary-dark text-white hover:bg-slate-800 transition-all rounded-2xl font-bold text-[10px] uppercase tracking-widest relative z-10 shadow-button text-center block"
                  >
                    Otwórz w nowej karcie
                  </a>
               ) : deferredPrompt && (
                 <button 
                    onClick={onInstall}
                    className="w-full py-4 px-6 bg-primary-dark text-white hover:bg-slate-800 transition-all rounded-2xl font-bold text-[10px] uppercase tracking-widest relative z-10 shadow-button"
                 >
                    Zainstaluj na telefonie
                 </button>
               )}
            </div>
          )}

          {/* Quick Contact / Support */}
          <div className="bg-primary rounded-[2.5rem] p-10 text-white border-none group overflow-hidden shadow-premium relative">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
               <HelpCircle size={80} />
             </div>
             <h4 className="text-xl font-serif font-bold italic mb-3 relative z-10">Potrzebujesz pomocy?</h4>
             <p className="text-xs text-white/60 leading-relaxed mb-8 relative z-10 transition-colors group-hover:text-white/80">Sprawdź nasze centrum pomocy lub skontaktuj się z biurem klubu.</p>
             <button 
                onClick={() => onNavigate('help')}
                className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 transition-all rounded-2xl border border-white/10 font-bold text-[10px] uppercase tracking-widest relative z-10"
             >
                Centrum Pomocy
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HelpSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    {
      q: "Jak zalogować się po raz pierwszy?",
      a: "Masz dwie opcje: 1. Szybkie logowanie - wpisz imię, nazwisko i numer telefonu (system zapamięta Twój telefon jako identyfikator). 2. Konto E-mail - przełącz zakładkę na 'E-mail' i wybierz 'Zarejestruj się', aby utworzyć klasyczne konto z hasłem."
    },
    {
      q: "Jak zarezerwować jazdę?",
      a: "Przejdź do zakładki 'Grafik i Rezerwacje'. Wybierz interesujący Cię termin, kliknij w niego, a następnie wybierz 'Zapisz się'. Jeśli termin jest dostępny, zostaniesz dopisany do listy uczestników. Możesz też wybrać konia, jeśli instruktor na to pozwoli."
    },
    {
      q: "Co oznacza status 'Oczekująca'?",
      a: "Status 'Oczekująca' oznacza, że instruktor musi ręcznie zatwierdzić Twoją rezerwację (np. sprawdzić dostępność konia). Gdy to nastąpi, otrzymasz powiadomienie w aplikacji."
    },
    {
      q: "Jak odwołać rezerwację?",
      a: "W zakładce 'Panel Główny' znajdziesz sekcję 'Twoje Nadchodzące Jazdy'. Kliknij przycisk 'Zrezygnuj' przy odpowiedniej lekcji. Pamiętaj o zasadach klubu dotyczących odwoływania jazd - zbyt późne odwołanie może wiązać się z opłatą."
    },
    {
      q: "Jak zainstalować aplikację na telefonie (PWA)?",
      a: "Na iPhonie: otwórz stronę w Safari, kliknij ikonę udostępniania i wybierz 'Dodaj do ekranu początkowego'. Na Androidzie: kliknij trzy kropki w Chrome i wybierz 'Zainstaluj aplikację'. Aplikacja będzie wtedy działać jak każda inna ikona na Twoim telefonie."
    },
    {
      q: "Problem z logowaniem?",
      a: "Jeśli system nie pozwala Ci się zalogować, sprawdź czy poprawnie wpisałeś numer telefonu. Pamiętaj, aby zawsze używać tego samego numeru, z którym się zarejestrowałeś. W razie problemów użyj przycisku zadzwoń w stopce aplikacji."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-accent/20">
          <HelpCircle size={40} />
        </div>
        <h2 className="text-4xl font-serif font-bold text-primary italic leading-tight">Centrum Pomocy</h2>
        <p className="text-text-muted max-w-lg mx-auto text-sm uppercase font-bold tracking-[0.2em]">Znajdź odpowiedzi na najczęstsze pytania</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] border border-border overflow-hidden transition-all shadow-premium hover:border-accent/30">
            <button 
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-7 text-left hover:bg-bg transition-colors group"
            >
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all text-xs font-bold">{idx + 1}</div>
                 <span className="font-bold text-primary italic text-sm">{faq.q}</span>
              </div>
              <ChevronDown size={18} className={`text-accent transition-transform duration-500 ${openIndex === idx ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                >
                  <div className="p-8 pt-0 text-text-muted text-sm leading-relaxed border-t border-border/40 bg-bg/20">
                    <div className="bg-white p-6 rounded-2xl border border-border/30">
                       {faq.a}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="bg-primary rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden mt-16 shadow-premium group">
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-accent/20 rounded-full blur-[90px] group-hover:animate-pulse" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-accent shrink-0 border border-white/20 shadow-xl">
             <MessageCircle size={44} />
          </div>
          <div className="text-center lg:text-left flex-1">
            <h3 className="text-3xl font-serif font-bold italic mb-4 leading-tight">Nadal masz wątpliwości?</h3>
            <p className="text-white/70 text-sm mb-8 leading-relaxed max-w-xl">Nasi instruktorzy są do Twojej dyspozycji w godzinach pracy stajni. Możesz skontaktować się z nami bezpośrednio przez telefon lub stronę www.</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-5">
               <a href="tel:+48504270174" className="bg-accent text-primary px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3">
                 <Phone size={16} /> Zadzwoń do biura
               </a>
               <a href="https://www.jazda-konna.com" target="_blank" rel="noreferrer" className="bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all border border-white/10 flex items-center gap-3">
                 <Globe size={16} /> Strona Klubu
               </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatLessonTime = (time: any) => {
  if (!time) return '—';
  try {
    const date = time.toDate ? time.toDate() : new Date(time.seconds ? time.seconds * 1000 : time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '—';
  }
};

const formatLessonDate = (time: any) => {
  if (!time) return '—';
  try {
    const date = time.toDate ? time.toDate() : new Date(time.seconds ? time.seconds * 1000 : time);
    return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (e) {
    return '—';
  }
};

const UpcomingLessons = ({ onNavigate, profile, mode = 'global', onBook }: { 
  onNavigate: (tab: string) => void, 
  profile: UserProfile | null,
  mode?: 'global' | 'personal',
  onBook?: (lesson: Lesson) => void
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const isStaff = profile?.role === 'admin' || profile?.role === 'instructor';
  
  useEffect(() => {
    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, 'lessons'), 
      where('status', 'in', ['scheduled', 'pending'])
    );
    
    return onSnapshot(q, (snapshot) => {
      const allLessons = snapshot.docs.map(doc => ({ lessonId: doc.id, ...doc.data() } as Lesson));
      
      // Sort in-memory by startTime (robust)
      allLessons.sort((a, b) => {
        try {
          const tA = a.startTime?.toDate ? a.startTime.toDate().getTime() : (a.startTime ? new Date(a.startTime).getTime() : 0);
          const tB = b.startTime?.toDate ? b.startTime.toDate().getTime() : (b.startTime ? new Date(b.startTime).getTime() : 0);
          return tA - tB;
        } catch (e) {
          return 0;
        }
      });

      const filtered = allLessons.filter(l => {
        if (mode === 'personal') {
           return (l.participants || []).some(p => p.userId === profile?.userId);
        }
        if (isStaff) return true;
        if (l.status === 'scheduled') return true;
        if (l.status === 'pending' && l.studentId === profile?.userId) return true;
        return false;
      });

      setLessons(filtered.slice(0, 10)); // limit to 10 effectively
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lessons');
    });
  }, [profile?.userId, isStaff, mode]);

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-bg/20 rounded-[2rem] border border-dashed border-border">
        <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-border/60">
          <Calendar size={24} className="text-text-muted opacity-30" />
        </div>
        <p className="text-sm text-text-muted italic font-medium">Brak zaplanowanych lekcji na dzisiaj</p>
        <button 
          onClick={() => onNavigate('lessons')}
          className="mt-6 bg-primary text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-button hover:bg-primary-light transition-all active:scale-95"
        >
          Zarezerwuj pierwszą jazdę
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map(l => (
        <div key={l.lessonId} className="flex items-center gap-6 p-5 bg-bg/40 border border-border/60 rounded-[1.25rem] hover:bg-white hover:shadow-lg hover:border-accent/20 transition-all duration-300 group cursor-default active:scale-[0.98]">
           <div className="text-center min-w-[60px]">
              <p className="text-lg font-serif font-bold text-primary italic leading-none">{formatLessonTime(l.startTime)}</p>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">START</p>
           </div>
           <div className="w-px h-10 bg-border/60" />
           <div className="flex-1">
              <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-1">{l.type}</p>
              <p className="text-sm font-bold text-primary truncate max-w-[120px] sm:max-w-none">{l.instructorName || 'Instruktor'}</p>
           </div>
           <div className="text-right hidden sm:flex flex-col items-end gap-2 shrink-0">
              {isStaff ? (
                <>
                  <p className="text-xs font-bold text-primary/80 italic">{l.horseName || '—'}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${l.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`} />
                   <p className={`text-[9px] font-bold uppercase ${l.status === 'pending' ? 'text-orange-700' : 'text-green-800'}`}>
                     {l.status === 'pending' ? 'Do zatwierdzenia' : 'Zatwierdzona'}
                   </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center justify-end gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${l.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`} />
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${l.status === 'pending' ? 'text-orange-700' : 'text-green-800'}`}>
                      {l.status === 'pending' ? 'Oczekiwanie' : 'Twoja lekcja'}
                    </p>
                  </div>
                  {l.status === 'scheduled' && !(l.participants || []).some(p => p.userId === profile?.userId) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onBook) onBook(l);
                      }}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm hover:scale-105 transition-transform"
                    >
                      Zapisz się
                    </button>
                  )}
                </div>
              )}
           </div>
        </div>
      ))}
    </div>
  );
};

const InstructorsList = ({ globalInstructors }: { globalInstructors: Instructor[] }) => {
  const instructors = globalInstructors;

  return (
    <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-premium overflow-hidden">
       <div className="flex items-center justify-between mb-8">
         <h3 className="text-2xl font-serif font-bold text-primary italic flex items-center gap-3">
           Specjaliści KJW
         </h3>
         <Users size={20} className="text-accent opacity-50" />
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {instructors.map(i => (
            <div key={i.instructorId} className="group relative">
               <div className="aspect-[4/5] rounded-3xl overflow-hidden mb-4 border border-border shadow-md relative">
                 {i.imageUrl ? (
                   <img src={i.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full bg-bg flex items-center justify-center text-text-muted/20">
                      <UserIcon size={64} strokeWidth={1} />
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest">Pokaż profil</p>
                 </div>
               </div>
               <h4 className="font-bold text-primary tracking-tight leading-none text-lg">{i.name}</h4>
               <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mt-2 mb-4">{i.specialties?.join(' • ')}</p>
               
               <div className="flex gap-1.5">
                 {i.phoneNumber && <a href={`tel:${i.phoneNumber}`} className="p-2.5 bg-bg border border-border rounded-xl text-primary hover:bg-accent hover:text-white hover:border-accent transition-all duration-300"><Phone size={14} /></a>}
                 {i.messenger && <a href={i.messenger} target="_blank" rel="noreferrer" className="p-2.5 bg-bg border border-border rounded-xl text-primary hover:bg-[#0084FF] hover:text-white hover:border-[#0084FF] transition-all duration-300"><MessageCircle size={14} /></a>}
                 {i.whatsapp && <a href={`https://wa.me/${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2.5 bg-bg border border-border rounded-xl text-primary hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all duration-300"><Send size={14} rotate={-45} /></a>}
                 {i.workingHours && Object.values(i.workingHours).some(h => h.active) && (
                   <div className="group/hours relative">
                     <button className="p-2.5 bg-bg border border-border rounded-xl text-primary hover:bg-primary-light hover:text-white transition-all duration-300">
                       <Clock size={14} />
                     </button>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-white p-5 rounded-2xl shadow-premium border border-border opacity-0 pointer-events-none group-hover/hours:opacity-100 transition-all duration-300 scale-95 group-hover/hours:scale-100 z-50">
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-border rotate-45" />
                        <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 border-b border-border/40 pb-2 text-center">Godziny pracy</p>
                        <div className="space-y-2">
                           {Object.entries(i.workingHours)
                             .filter(([_, h]) => h.active)
                             .sort((a, b) => {
                                const order = ['1', '2', '3', '4', '5', '6', '0']; // Mon-Sun
                                return order.indexOf(a[0]) - order.indexOf(b[0]);
                             })
                             .map(([day, h]) => (
                              <div key={day} className="flex justify-between items-center text-[10px]">
                                 <span className="text-text-muted font-bold">
                                    {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][parseInt(day)]}:
                                 </span>
                                 <span className="text-primary font-bold text-right ml-2 leading-tight">
                                    {h.slots.map(s => `${s.start}-${s.end}`).join('\n')}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

const PhoneRegistration = ({ profile, setProfile }: { profile: UserProfile, setProfile: (p: UserProfile) => void }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messengerLink, setMessengerLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim().length < 9) {
      alert('Podaj prawidłowy numer telefonu (minimum 9 cyfr).');
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedProfile = { 
        ...profile, 
        phoneNumber: phoneNumber.trim(),
        messengerLink: messengerLink.trim()
      };
      await setDoc(doc(db, 'users', profile.userId), updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.userId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-premium border border-border text-center relative z-10"
      >
        <div className="w-20 h-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <Phone size={32} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-primary italic mb-3">Ostatni krok</h2>
        <p className="text-sm text-text-muted mb-10 leading-relaxed">
          Potrzebujemy Twojego numeru telefonu, aby instruktorzy mogli sprawnie kontaktować się w sprawie jazd i zmian w grafiku.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent px-1">Numer telefonu</label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                <Phone size={20} />
              </span>
              <input 
                type="tel"
                placeholder="np. 504 270 174"
                className="w-full pl-14 pr-6 py-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent focus:bg-white transition-all text-xl font-medium tracking-wider"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent px-1">Link do Messengera (opcjonalnie)</label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                <Send size={20} />
              </span>
              <input 
                type="url"
                placeholder="m.me/twojanazwa"
                className="w-full pl-14 pr-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:border-accent focus:bg-white transition-all text-xs"
                value={messengerLink}
                onChange={(e) => setMessengerLink(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-button hover:bg-primary-light hover:translate-y-[-2px] transition-all disabled:opacity-50 mt-4 active:scale-95"
          >
            {isSubmitting ? 'Przetwarzanie...' : 'Rozpocznij przygodę w KJW'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Other Sections (Placeholders for Re-construction) ---

const LessonsSection = ({ 
  profile, 
  onNavigate, 
  globalInstructors,
  localHorses,
  confirmModal,
  setConfirmModal,
  feedback,
  setFeedback,
  handleBookLesson,
  handleCancelLesson,
  handleDeleteLesson,
  handleConfirmParticipant
}: { 
  profile: UserProfile | null, 
  onNavigate?: (tab: string) => void,
  globalInstructors: Instructor[],
  localHorses: Horse[],
  confirmModal: any,
  setConfirmModal: (val: any) => void,
  feedback: any,
  setFeedback: (val: any) => void,
  handleBookLesson: (l: Lesson) => void,
  handleCancelLesson: (l: Lesson) => void,
  handleDeleteLesson: (id: string) => void,
  handleConfirmParticipant: (l: Lesson, uid: string) => void
}) => {
  const isAdminOrInstructor = profile?.role === 'admin' || profile?.role === 'instructor';
  const isAdmin = isAdminOrInstructor;
  const isOnlyAdmin = profile?.role === 'admin';
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'weekly'>('weekly');

  const instructors = globalInstructors;

  // Derived state to use in render
  const effectiveViewMode = 'weekly';
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    type: 'indywidualna',
    status: 'scheduled',
    duration: 60,
    maxParticipants: 1
  });

  useEffect(() => {
    const unsubLessons = onSnapshot(collection(db, 'lessons'), (snap) => {
      const data = snap.docs.map(doc => ({ lessonId: doc.id, ...doc.data() } as Lesson));
      data.sort((a, b) => {
        try {
          const tA = a.startTime?.toDate ? a.startTime.toDate().getTime() : (a.startTime ? new Date(a.startTime).getTime() : 0);
          const tB = b.startTime?.toDate ? b.startTime.toDate().getTime() : (b.startTime ? new Date(b.startTime).getTime() : 0);
          return tA - tB;
        } catch (e) { return 0; }
      });
      setLessons(data);
    }, err => handleFirestoreError(err, OperationType.LIST, 'lessons'));

    return () => unsubLessons();
  }, []);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.startTime || !newLesson.instructorId) {
       alert('Wypełnij wymagane pola (Data i Instruktor)');
       return;
    }

    try {
      const start = new Date(newLesson.startTime);
      const end = new Date(start.getTime() + (newLesson.duration || 60) * 60000);
      
      const instructor = instructors.find(i => i.instructorId === newLesson.instructorId);
      const isStudent = profile?.role === 'student';
      
      // Availability Validation - Skip or soften for students if needed, but here we keep it for sanity
      if (instructor && instructor.workingHours) {
        const dayOfWeek = start.getDay().toString();
        const dayConfig = instructor.workingHours[dayOfWeek];
        if (dayConfig) {
           if (!dayConfig.active && !isStudent) { // Admins can override, students get a warning maybe?
             if (!window.confirm(`Uwaga: ${instructor.name} nie pracuje w ten dzień zgodnie z grafikiem. Czy mimo to dodać ten termin?`)) return;
           } else if (dayConfig.active) {
             const lessonStartTime = start.getHours() * 60 + start.getMinutes();
             const lessonEndTime = lessonStartTime + (newLesson.duration || 60);
             const isWithin = dayConfig.slots.some(slot => {
               const [sH, sM] = slot.start.split(':').map(Number);
               const [eH, eM] = slot.end.split(':').map(Number);
               return lessonStartTime >= (sH * 60 + sM) && lessonEndTime <= (eH * 60 + eM);
             });
             if (!isWithin && !isStudent) {
               if (!window.confirm(`Uwaga: Wybrany czas wykracza poza godziny pracy instruktora (${dayConfig.slots.map(s => `${s.start}-${s.end}`).join(', ')}). Czy mimo to dodać?`)) return;
             }
           }
        }
      }

      const horse = localHorses.find(h => h.horseId === newLesson.horseId);

      if (editingLessonId) {
        await updateDoc(doc(db, 'lessons', editingLessonId), {
          ...newLesson,
          startTime: Timestamp.fromDate(start),
          endTime: Timestamp.fromDate(end),
          instructorName: instructor?.name || '',
          horseName: horse?.name || '',
          maxParticipants: Number(newLesson.maxParticipants || (newLesson.type === 'grupowa' ? 8 : 1))
        });
      } else {
        const lessonData: any = {
          ...newLesson,
          startTime: Timestamp.fromDate(start),
          endTime: Timestamp.fromDate(end),
          instructorName: instructor?.name || '',
          horseName: horse?.name || '',
          status: isStudent ? 'pending' : 'scheduled',
          maxParticipants: Number(newLesson.maxParticipants || (newLesson.type === 'grupowa' ? 8 : 1)),
          participants: isStudent ? [{
            userId: profile.userId,
            name: profile.name,
            status: 'pending',
            shareDataConsent: profile.shareDataConsent || false
          }] : []
        };
        
        if (isStudent) {
          lessonData.studentId = profile.userId;
          lessonData.studentName = profile.name;
        }

        await addDoc(collection(db, 'lessons'), lessonData);
        
        if (isStudent) {
          await addDoc(collection(db, 'notifications'), {
            userId: 'admin',
            title: 'Nowa prośba o jazdę',
            message: `${profile.name} prosi o lekcję u ${instructor?.name} na ${start.toLocaleString('pl-PL')}`,
            type: 'lesson',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
      setShowAddModal(false);
      setEditingLessonId(null);
      setNewLesson({ type: 'indywidualna', status: 'scheduled', duration: 60, maxParticipants: 1 });
      setFeedback({ type: 'success', msg: isStudent ? 'Wysłano prośbę o termin!' : 'Termin dodany pomyślnie!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingLessonId ? `lessons/${editingLessonId}` : 'lessons');
    }
  };

  const handleUpdateHorse = async (lessonId: string, horseId: string) => {
    try {
      const horse = localHorses.find(h => h.horseId === horseId);
      await updateDoc(doc(db, 'lessons', lessonId), {
        horseId,
        horseName: horse?.name || ''
      });
      setEditingLessonId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}`);
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.lessonId);
    const date = lesson.startTime?.toDate ? lesson.startTime.toDate() : new Date(lesson.startTime?.seconds ? lesson.startTime.seconds * 1000 : 0);
    const offset = date.getTimezoneOffset() * 60000;
    const localISODate = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    
    setNewLesson({
      startTime: localISODate,
      instructorId: lesson.instructorId,
      horseId: lesson.horseId,
      type: lesson.type,
      duration: lesson.duration || 60,
      status: lesson.status,
      maxParticipants: lesson.maxParticipants || (lesson.type === 'grupowa' ? 8 : 1)
    });
    setShowAddModal(true);
  };

  const groupedLessons = useMemo(() => {
    const groups: { [key: string]: Lesson[] } = {};
    const now = new Date();
    
    lessons
      .filter(lesson => {
        // Show all lessons for weekly view
        return true;
      })
      .sort((a,b) => (a.startTime?.toDate ? a.startTime.toDate().getTime() : (a.startTime?.seconds || 0) * 1000) - (b.startTime?.toDate ? b.startTime.toDate().getTime() : (b.startTime?.seconds || 0) * 1000))
      .forEach(lesson => {
        const date = lesson.startTime?.toDate ? lesson.startTime.toDate() : new Date(lesson.startTime?.seconds ? lesson.startTime.seconds * 1000 : 0);
        // Use YYYY-MM-DD key for correct chronological sorting of group entries
        const dateKey = date.toISOString().split('T')[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(lesson);
      });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [lessons, effectiveViewMode, profile?.userId]);

  return (
    <>
    <div className="space-y-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-border">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary italic leading-tight tracking-tight">Grafik Zajęć</h2>
          <p className="text-text-muted text-sm mt-2 uppercase tracking-[0.2em] font-bold">Zaplanuj swój tydzień w siodle</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white rounded-[1.5rem] border border-border h-14 p-1 shadow-premium">
            <button 
              onClick={() => {
                const d = new Date(currentWeekStart);
                d.setDate(d.getDate() - 7);
                setCurrentWeekStart(d);
              }}
              className="px-5 text-primary hover:bg-bg rounded-xl transition-all flex items-center justify-center"
              title="Poprzedni tydzień"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const start = new Date(d.setDate(diff));
                start.setHours(0,0,0,0);
                setCurrentWeekStart(start);
              }}
              className="px-6 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors border-x border-border/50"
            >
              Dzisiaj
            </button>
            <button 
              onClick={() => {
                const d = new Date(currentWeekStart);
                d.setDate(d.getDate() + 7);
                setCurrentWeekStart(d);
              }}
              className="px-5 text-primary hover:bg-bg rounded-xl transition-all flex items-center justify-center"
              title="Następny tydzień"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {isAdmin && (
            <button 
              onClick={() => {
                setEditingLessonId(null);
                const matchedInstructor = instructors.find(i => i.name === profile?.name);
                setNewLesson({ 
                  type: 'indywidualna', 
                  status: 'scheduled', 
                  duration: 60,
                  instructorId: matchedInstructor?.instructorId || ''
                });
                setShowAddModal(true);
              }}
              className="h-14 bg-primary text-white px-10 rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.2em] shadow-premium hover:shadow-elevated hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95"
            >
              <Plus size={18} /> Dodaj Termin
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(null)} className="absolute inset-0 bg-primary/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[3rem] w-full max-w-[400px] p-12 text-center shadow-elevated border border-border">
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center border border-border ${confirmModal.type === 'cancel' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600 shadow-sm'}`}>
                {confirmModal.type === 'cancel' ? <AlertTriangle size={36} /> : <Trash2 size={36} />}
              </div>
              <h3 className="text-2xl font-serif font-bold italic text-primary mb-4 leading-tight">
                {confirmModal.type === 'book' ? 'Potwierdź rezerwację' : 
                 confirmModal.type === 'confirm_participant' ? 'Zatwierdź uczestnika' : 
                 'Potwierdź działanie'}
              </h3>
              <p className="text-sm text-text-muted mb-10 leading-relaxed font-medium px-4">{confirmModal.title}</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'cancel' && confirmModal.lesson) {
                      handleCancelLesson(confirmModal.lesson);
                    } else if (confirmModal.type === 'delete' && confirmModal.lessonId) {
                      handleDeleteLesson(confirmModal.lessonId);
                    } else if (confirmModal.type === 'book' && confirmModal.lesson) {
                      handleBookLesson(confirmModal.lesson);
                      setConfirmModal(null);
                    } else if (confirmModal.type === 'confirm_participant' && confirmModal.lesson && confirmModal.userId) {
                      handleConfirmParticipant(confirmModal.lesson, confirmModal.userId);
                      setConfirmModal(null);
                    }
                  }}
                  className={`w-full py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-white shadow-button hover:translate-y-[-2px] transition-all active:scale-95 ${
                    confirmModal.type === 'cancel' ? 'bg-orange-500' : 
                    confirmModal.type === 'book' ? 'bg-primary' :
                    confirmModal.type === 'confirm_participant' ? 'bg-green-600' :
                    'bg-red-500'
                  }`}
                >
                  Tak, Potwierdzam
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="w-full py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-primary bg-bg hover:bg-border/20 transition-all active:scale-95"
                >
                  Anuluj
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden">
          <div className="flex items-center justify-center p-8 bg-slate-50/50 border-b border-border">
              <div className="text-center">
                <h3 className="text-2xl font-serif font-bold italic text-primary">
                    {weekDays[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {weekDays[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                </h3>
              </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 p-0 border-r border-border bg-white min-w-[200px]">
                    <div className="p-8 text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center justify-center min-h-[100px]">
                      Kadra
                    </div>
                  </th>
                  {weekDays.map((day) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th key={day.toISOString()} className={`p-0 border-r border-border bg-white sticky top-0 z-20`}>
                        <div className={`p-8 min-h-[100px] flex flex-col items-center justify-center transition-colors ${isToday ? 'bg-accent/5' : 'bg-white'}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${isToday ? 'text-primary' : 'text-text-muted opacity-60'}`}>
                            {day.toLocaleDateString('pl-PL', { weekday: 'short' })}
                          </span>
                          <span className={`text-2xl font-serif font-bold italic ${isToday ? 'text-primary' : 'text-primary'}`}>
                            {day.getDate()}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {instructors.map(instructor => (
                  <tr key={instructor.instructorId} className="border-t border-border group">
                    <td className="sticky left-0 z-20 p-0 border-r border-border bg-slate-50/50 group-hover:bg-white transition-colors">
                      <div className="p-8 min-w-[200px] flex flex-col items-center text-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-premium group-hover:scale-105 transition-all">
                            {instructor.imageUrl ? (
                              <img src={instructor.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon size={24} className="text-accent" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-primary uppercase tracking-tight font-serif italic">{instructor.name}</p>
                          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-text-muted opacity-60">Instruktor</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dayOfWeek = day.getDay().toString();
                      const dayConfig = instructor.workingHours?.[dayOfWeek];
                      const isNotWorking = dayConfig && !dayConfig.active;

                      const dayLessons = lessons.filter(l => {
                         if (l.instructorId !== instructor.instructorId) return false;
                         const lDate = l.startTime?.toDate ? l.startTime.toDate() : new Date(l.startTime?.seconds ? l.startTime.seconds * 1000 : l.startTime);
                         return lDate.getFullYear() === day.getFullYear() && 
                                lDate.getMonth() === day.getMonth() && 
                                lDate.getDate() === day.getDate();
                      }).sort((a,b) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0));

                      return (
                        <td 
                          key={day.toISOString()} 
                          className={`p-6 border-r border-border align-top transition-all relative min-w-[250px] ${isNotWorking ? 'bg-slate-50/40' : 'bg-white hover:bg-bg/50 cursor-pointer'}`}
                          onClick={() => {
                            if (isNotWorking || profile?.role !== 'student') return;
                            if (dayLessons.length === 0) {
                              // Pre-fill request modal
                              const requestedDate = new Date(day);
                              requestedDate.setHours(12, 0, 0, 0); // Default to noon
                              setNewLesson({
                                instructorId: instructor.instructorId,
                                instructorName: instructor.name,
                                startTime: requestedDate.toISOString().slice(0, 16),
                                type: 'indywidualna',
                                duration: 60,
                                maxParticipants: 1
                              });
                              setShowAddModal(true);
                            }
                          }}
                        >
                          <div className="space-y-6">
                            {isNotWorking && dayLessons.length === 0 ? (
                               <div className="py-10 flex flex-col items-center justify-center text-text-muted/20">
                                 <Clock size={16} className="mb-2" />
                                 <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Wolne</span>
                               </div>
                            ) : dayLessons.length === 0 ? (
                               <div className="py-10 flex flex-col items-center justify-center text-text-muted/10 group-hover:text-accent/40 transition-colors">
                                 <Calendar size={16} className="mb-2" />
                                 <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Kliknij, aby poprosić o termin</span>
                               </div>
                            ) : (
                              dayLessons.map(lesson => {
                                const isBookedByMe = (lesson.participants || []).some(p => p.userId === profile?.userId);
                                const isFull = (lesson.participants || []).length >= (lesson.maxParticipants || 1);
                                const canBook = profile?.role === 'student' && !isBookedByMe && !isFull && lesson.status === 'scheduled';

                                return (
                                  <div 
                                    key={lesson.lessonId} 
                                    onClick={(e) => {
                                      if (canBook) {
                                        e.stopPropagation();
                                        setConfirmModal({
                                          show: true,
                                          title: `Czy chcesz zarezerwować termin u instruktora ${lesson.instructorName} o godzinie ${formatLessonTime(lesson.startTime)}?`,
                                          type: 'book',
                                          lesson
                                        });
                                      }
                                    }}
                                    className={`relative bg-white border border-border p-6 rounded-2xl shadow-premium hover:shadow-elevated hover:border-accent/40 transition-all ${
                                      lesson.status === 'cancelled' ? 'opacity-40 grayscale' : 
                                      canBook ? 'cursor-pointer hover:bg-accent/5' : ''
                                    }`}
                                  >
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-widest rounded-full">
                                      {lesson.type}
                                    </div>
                                    
                                    <div className="flex justify-between items-start mb-6">
                                      <div className="flex flex-col">
                                        <p className="text-xl font-serif font-bold italic text-primary">{formatLessonTime(lesson.startTime)}</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">
                                          {isBookedByMe ? 'Twoja lekcja' : lesson.status === 'scheduled' ? 'Wolny termin' : lesson.status}
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        {lesson.participants && lesson.participants.length > 0 && (
                                          <div className="flex items-center gap-1.5 px-2 py-1 bg-bg text-[9px] font-bold text-primary uppercase rounded-md border border-border">
                                            <Users size={10} /> {lesson.participants.length}/{lesson.maxParticipants}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {(lesson.participants || []).length > 0 ? (
                                      <div className="space-y-3 pt-4 border-t border-border/50">
                                        {(lesson.participants || []).map((p, idx) => (
                                          <div key={idx} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                              <div className={`w-1.5 h-1.5 rounded-full ${p.userId === profile?.userId ? 'bg-green-500' : 'bg-accent'}`} />
                                              <p className={`text-[10px] font-bold ${p.userId === profile?.userId ? 'text-primary' : 'text-primary/70'} uppercase tracking-tight`}>
                                                {p.userId === profile?.userId ? 'Ty' : p.name}
                                              </p>
                                            </div>
                                            {isAdmin && p.status === 'pending' && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleConfirmParticipant(lesson, p.userId); }}
                                                className="p-1 px-3 bg-green-50 text-green-600 text-[8px] font-bold uppercase rounded-md hover:bg-green-600 hover:text-white transition-colors border border-green-200"
                                              >
                                                Zatwierdź
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="w-full py-4 bg-primary text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-xl text-center group-hover:bg-slate-800 transition-all shadow-button">
                                        Rezerwuj
                                      </div>
                                    )}
                                    
                                    {isAdmin && (
                                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
                                        <button onClick={(e) => { e.stopPropagation(); handleEditLesson(lesson); }} className="p-2.5 rounded-xl border border-border hover:bg-bg text-text-muted hover:text-primary transition-all shadow-sm"><Edit size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, title: 'Czy na pewno chcesz usunąć ten termin?', lessonId: lesson.lessonId, type: 'delete' }); }} className="p-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all shadow-sm"><Trash2 size={14} /></button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 sm:p-10 shadow-premium relative overflow-hidden z-20 my-auto"
              >
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="absolute top-6 right-6 sm:top-8 sm:right-8 text-text-muted hover:text-primary transition-all duration-300 hover:rotate-90 z-30"
                >
                  <X size={24} />
                </button>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-primary italic mb-6 sm:mb-8">
                  {editingLessonId ? 'Edytuj termin jazdy' : (profile?.role === 'student' ? 'Poproś o termin jazdy' : 'Dodaj nowy termin jazdy')}
                </h3>
            <form onSubmit={handleCreateLesson} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Data i godzina</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm"
                    value={newLesson.startTime || ''}
                    onChange={e => setNewLesson({...newLesson, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className={profile?.role === 'student' ? 'sm:col-span-2' : ''}>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Instruktor</label>
                  <select 
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-xs font-bold"
                    onChange={e => setNewLesson({...newLesson, instructorId: e.target.value})}
                    required
                    value={newLesson.instructorId}
                    disabled={profile?.role === 'student' && !!newLesson.instructorId}
                  >
                    <option value="">Wybierz...</option>
                    {instructors.map(i => <option key={i.instructorId} value={i.instructorId}>{i.name}</option>)}
                  </select>
                </div>
                {isAdmin && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Koń (Widoczne tylko dla kadry)</label>
                      <select 
                        className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-xs font-bold"
                        onChange={e => setNewLesson({...newLesson, horseId: e.target.value})}
                        value={newLesson.horseId}
                      >
                        <option value="">Wybierz...</option>
                        {localHorses.map(h => <option key={h.horseId} value={h.horseId}>{h.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Limit osób</label>
                      <input 
                        type="number" 
                        min="1"
                        max="8"
                        className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm font-bold"
                        value={newLesson.maxParticipants || (newLesson.type === 'grupowa' ? 8 : 1)}
                        onChange={e => setNewLesson({...newLesson, maxParticipants: parseInt(e.target.value)})}
                      />
                      <p className="text-[8px] text-text-muted mt-1 uppercase font-bold opacity-60">Dla grup domyślnie 8</p>
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Rodzaj treningu</label>
                <div className="grid grid-cols-2 gap-2">
                  {['indywidualna', 'grupowa', 'początkujący', 'sportowa'].map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setNewLesson({...newLesson, type: type as any})}
                      className={`py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${newLesson.type === type ? 'bg-accent text-white shadow-lg scale-105' : 'bg-bg text-text-muted border border-border hover:border-accent'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] shadow-button mt-4 hover:shadow-xl hover:translate-y-[-2px] transition-all active:scale-95">
                {profile?.role === 'student' ? 'Wyślij prośbę' : 'Opublikuj termin'}
              </button>
              {(isAdmin || profile?.role === 'instructor') && (
                <button 
                  type="button"
                  onClick={() => { setShowAddModal(false); onNavigate?.('availability'); }}
                  className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest text-accent hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Clock size={14} /> Przejdź do zarządzania dostępnością
                </button>
              )}
            </form>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
    </>
  );
};

const UsersSection = ({ profile, onDeleteUser }: { profile: UserProfile | null, onDeleteUser?: (uid: string) => void }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() } as UserProfile));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (userId === profile?.userId) {
      alert('Nie możesz zmienić własnej roli.');
      return;
    }
    setUpdatingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      if (newRole === 'admin') {
        const user = users.find(u => u.userId === userId);
        await setDoc(doc(db, 'admins', userId), { email: user?.email || '', promotedAt: new Date().toISOString() });
      } else {
        await deleteDoc(doc(db, 'admins', userId));
      }
    } catch (error) {
      console.error("Update Role Error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdatingId(editingUser.userId);
    try {
      await updateDoc(doc(db, 'users', editingUser.userId), { 
        name: editingUser.name,
        phoneNumber: editingUser.phoneNumber,
        messengerLink: editingUser.messengerLink || ''
      });
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.userId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.phoneNumber && u.phoneNumber.includes(search))
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-border">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest font-bold mb-3 opacity-60">Zarządzanie kontami</p>
          <h2 className="text-4xl font-serif font-bold text-primary italic leading-tight tracking-tight">Baza Użytkowników</h2>
        </div>
        <div className="relative max-w-sm w-full">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-30" />
          <input 
            type="text"
            placeholder="Szukaj ID lub nazwy..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-border rounded-2xl text-sm font-bold outline-none focus:border-accent focus:shadow-premium transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Użytkownik</th>
                <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Rola / Uprawnienia</th>
                <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Kontakt</th>
                <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Data rejestracji</th>
                <th className="px-10 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-primary text-right">Zarządzaj</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
               {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-40">Nie znaleziono użytkowników spełniających kryteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.userId} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-serif font-bold text-xl shadow-sm">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-serif font-bold text-lg text-primary italic leading-tight">{user.name}</p>
                          <p className="text-xs text-text-muted mt-1 opacity-70">{user.email || 'Brak adresu e-mail'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      {profile?.role === 'admin' ? (
                        <select 
                          className={`px-4 py-2.5 border border-border rounded-xl text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-all focus:border-accent outline-none shadow-sm ${
                            user.role === 'admin' ? 'bg-primary text-white border-primary' : 
                            user.role === 'instructor' ? 'bg-accent/10 text-accent border-accent/20' : 
                            'bg-surface text-text-muted'
                          }`}
                          value={user.role}
                          disabled={updatingId === user.userId}
                          onChange={(e) => handleUpdateRole(user.userId, e.target.value as UserRole)}
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instruktor</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                          user.role === 'admin' ? 'bg-primary/5 border-primary/20 text-primary' : 
                          user.role === 'instructor' ? 'bg-accent/5 border-accent/20 text-accent' : 
                          'bg-bg border-border text-text-muted'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-8">
                      {user.phoneNumber ? (
                        <a href={`tel:${user.phoneNumber}`} className="text-sm font-bold text-primary flex items-center gap-2 group-hover:text-accent transition-colors">
                          <Phone size={14} /> {user.phoneNumber}
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-text-muted opacity-30 italic">Brak numeru</span>
                      )}
                    </td>
                    <td className="px-10 py-8 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pl-PL') : 'Nieznana'}
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => setEditingUser(user)} 
                          className="p-3 bg-white text-text-muted hover:text-primary rounded-xl border border-border shadow-sm hover:shadow-premium transition-all"
                          title="Edytuj profil"
                        >
                          <Edit size={14} />
                        </button>
                        {onDeleteUser && user.userId !== profile?.userId && (
                          <button 
                            onClick={() => onDeleteUser(user.userId)} 
                            className="p-3 bg-white text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl border border-red-100 shadow-sm hover:shadow-premium transition-all"
                            title="Usuń użytkownika"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-premium relative border border-border"
            >
              <button 
                onClick={() => setEditingUser(null)} 
                className="absolute top-8 right-8 text-text-muted hover:text-primary transition-all duration-300 hover:rotate-90"
              >
                <X size={24} />
              </button>
              
              <h3 className="text-2xl font-serif font-bold text-primary italic mb-8">Edytuj dane kontaktu</h3>
              
              <form onSubmit={handleEditUser} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Imię i Nazwisko</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm"
                    value={editingUser.name}
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Numer telefonu</label>
                  <input 
                    type="tel"
                    required
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm"
                    value={editingUser.phoneNumber || ''}
                    onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Link Messenger (opcjonalnie)</label>
                  <input 
                    type="text"
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm"
                    value={editingUser.messengerLink || ''}
                    onChange={e => setEditingUser({...editingUser, messengerLink: e.target.value})}
                    placeholder="https://m.me/twoj.profil"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={updatingId === editingUser.userId}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] shadow-button mt-4 hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50"
                >
                  {updatingId === editingUser.userId ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ForumSection = ({ profile }: { profile: UserProfile | null }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState('');
  
  useEffect(() => {
    const q = query(collection(db, 'forum'), limit(100)); // limit but no specific order to avoid index
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ postId: doc.id, ...doc.data() } as ForumPost));
      data.sort((a, b) => {
        try {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tB - tA;
        } catch (e) { return 0; }
      });
      setPosts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'forum'));
  }, []);

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !profile) return;
    try {
      await addDoc(collection(db, 'forum'), {
        content: newPost,
        authorId: profile.userId,
        authorName: profile.name,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Nowy wpis na forum',
        message: `${profile.name} dodał nową wiadomość na forum.`,
        type: 'forum',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setNewPost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forum');
    }
  };

  return (
    <div className="space-y-10">
      <header className="pb-8 border-b border-primary/10">
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Miejsce wymiany doświadczeń</p>
        <h2 className="text-4xl font-serif font-black text-primary italic leading-tight tracking-tighter">Forum Społeczności</h2>
      </header>

      <form onSubmit={handleAddPost} className="bg-white rounded-[2rem] p-3 border border-border shadow-premium flex gap-4">
        <input 
          type="text" 
          placeholder="Podziel się czymś z innymi..." 
          className="flex-1 bg-transparent px-8 py-5 text-sm outline-none font-medium"
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
        />
        <button type="submit" className="bg-primary text-white px-10 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-button">
          <Send size={18} /> Wyślij wiadomość
        </button>
      </form>

      <div className="space-y-6 pb-20">
        {posts.map(post => (
          <div key={post.postId} className="bg-white rounded-3xl p-8 border border-border shadow-premium hover:shadow-elevated transition-all relative group">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-serif font-bold text-xl shadow-sm">
                {post.authorName?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-lg font-serif font-bold text-primary italic leading-tight">{post.authorName}</p>
                <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest opacity-60">{new Date(post.createdAt).toLocaleString('pl-PL')}</p>
              </div>
            </div>
            <p className="text-sm text-primary/80 leading-relaxed pl-4 border-l-2 border-accent/30">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AvailabilitySection = ({ profile }: { profile: UserProfile | null }) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<Instructor['workingHours']>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastLoadedId, setLastLoadedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'instructors'), (snap) => {
      const data = snap.docs.map(doc => ({ instructorId: doc.id, ...doc.data() } as Instructor));
      setInstructors(data);
      
      // If we haven't selected anyone yet, try to find current user
      if (!selectedInstructorId && data.length > 0) {
        const current = data.find(i => i.userId === profile?.userId);
        if (current) {
          setSelectedInstructorId(current.instructorId);
        } else if (profile?.role === 'admin') {
          // If admin but not instructor, default to first instructor
          setSelectedInstructorId(data[0].instructorId);
        }
      }
    });
    return () => unsub();
  }, [profile?.userId, selectedInstructorId]);

  useEffect(() => {
    if (selectedInstructorId && selectedInstructorId !== lastLoadedId) {
      const current = instructors.find(i => i.instructorId === selectedInstructorId);
      if (current) {
        setWorkingHours(current.workingHours || {});
        setLastLoadedId(selectedInstructorId);
      }
    }
  }, [selectedInstructorId, instructors, lastLoadedId]);

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) return <div className="p-10 text-center font-bold text-red-500 bg-red-50 rounded-2xl border border-red-100">Brak dostępu lub uprawnień.</div>;

  const instructor = instructors.find(i => i.instructorId === selectedInstructorId);

  if (!instructor && instructors.length > 0 && profile.role === 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        <p className="text-sm font-bold text-accent uppercase tracking-widest">Wczytywanie profilu...</p>
      </div>
    );
  }

  if (!instructor) return (
    <div className="bg-surface p-10 rounded-[2.5rem] border border-border text-center">
      <div className="w-20 h-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
        <Clock size={40} />
      </div>
      <h2 className="text-2xl font-serif font-bold text-primary italic mb-4">Profil nieodnaleziony</h2>
      <p className="text-text-muted text-sm max-w-sm mx-auto leading-relaxed">
        Twoje konto nie jest powiązane z profilem instruktora. 
        {profile.role === 'admin' ? 
          ' Jako administrator musisz najpierw dodać instruktorów w sekcji "Zarządzanie".' : 
          ' Skontaktuj się z administratorem, aby powiązać Twój profil.'}
      </p>
    </div>
  );

  const days = [
    { id: '1', name: 'Poniedziałek' },
    { id: '2', name: 'Wtorek' },
    { id: '3', name: 'Środa' },
    { id: '4', name: 'Czwartek' },
    { id: '5', name: 'Piątek' },
    { id: '6', name: 'Sobota' },
    { id: '0', name: 'Niedziela' },
  ];

  const handleToggleDay = (dayId: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: {
        active: !prev?.[dayId]?.active,
        slots: prev?.[dayId]?.slots || [{ start: '08:00', end: '16:00' }]
      }
    }));
  };

  const handleAddSlot = (dayId: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: {
        ...prev![dayId],
        slots: [...prev![dayId].slots, { start: '08:00', end: '16:00' }]
      }
    }));
  };

  const handleRemoveSlot = (dayId: string, index: number) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: {
        ...prev![dayId],
        slots: prev![dayId].slots.filter((_, i) => i !== index)
      }
    }));
  };

  const handleUpdateSlot = (dayId: string, index: number, field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: {
        ...prev![dayId],
        slots: prev![dayId].slots.map((s, i) => i === index ? { ...s, [field]: value } : s)
      }
    }));
  };

  const saveAvailability = async () => {
    if (!instructor) return;
    setIsSaving(true);
    try {
      const instructorRef = doc(db, 'instructors', instructor.instructorId);
      await updateDoc(instructorRef, { 
        workingHours,
        updatedAt: new Date().toISOString()
      });
      alert('Godziny pracy dla instruktora ' + instructor.name + ' zostały pomyślnie zapisane.');
      // Prevent immediate reload from snapshot sync
      setLastLoadedId(selectedInstructorId);
    } catch (err) {
      console.error("Save Error:", err);
      handleFirestoreError(err, OperationType.WRITE, `instructors/${instructor.instructorId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-primary/10">
        <div>
          <p className="micro-label mb-2">Resource Matrix</p>
          <h2 className="text-4xl font-serif font-black text-primary italic leading-tight tracking-tighter">
            {profile?.role === 'admin' ? `Grafik: ${instructor?.name}` : 'Zarządzanie Dostępnością'}
          </h2>
        </div>
        {profile?.role === 'admin' && instructors.length > 1 && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-60 ml-2">Instruktor:</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const currentIndex = instructors.findIndex(i => i.instructorId === selectedInstructorId);
                  const prevIndex = (currentIndex - 1 + instructors.length) % instructors.length;
                  setSelectedInstructorId(instructors[prevIndex].instructorId);
                }}
                className="p-2 hover:bg-bg rounded-lg text-primary transition-colors"
                title="Poprzedni"
              >
                <ChevronLeft size={16} />
              </button>
              <select 
                value={selectedInstructorId || ''} 
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                className="bg-transparent text-xs font-bold text-primary px-2 py-1 outline-none appearance-none cursor-pointer border-x border-border/50 mx-2"
              >
                {instructors.map(i => (
                  <option key={i.instructorId} value={i.instructorId}>{i.name}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  const currentIndex = instructors.findIndex(i => i.instructorId === selectedInstructorId);
                  const nextIndex = (currentIndex + 1) % instructors.length;
                  setSelectedInstructorId(instructors[nextIndex].instructorId);
                }}
                className="p-2 hover:bg-bg rounded-lg text-primary transition-colors"
                title="Następny"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="space-y-6">
        {days.map(day => {
          const dayData = workingHours?.[day.id];
          const isActive = dayData?.active;
          return (
            <div key={day.id} className={`bg-white rounded-[2rem] p-8 border border-border transition-all duration-300 shadow-premium ${isActive ? 'opacity-100' : 'opacity-60 bg-bg'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-6 min-w-[240px]">
                  <button 
                    onClick={() => handleToggleDay(day.id)}
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-accent border-accent text-white shadow-button' : 'bg-bg border-border text-text-muted'}`}
                  >
                    <Power size={24} />
                  </button>
                  <div>
                    <h3 className="text-xl font-serif font-bold italic text-primary tracking-tight">{day.name}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isActive ? 'text-accent' : 'text-text-muted'}`}>
                      {isActive ? 'Dzień aktywny' : 'Dzień wolny'}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="flex-1 space-y-4">
                    {dayData.slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex-1 flex bg-bg rounded-2xl border border-border h-16 p-1 max-w-lg overflow-hidden">
                          <div className="w-full relative flex items-center border-r border-border">
                            <span className="absolute left-4 text-[9px] font-bold text-text-muted uppercase">Od</span>
                            <input 
                              type="time" 
                              value={slot.start}
                              onChange={e => handleUpdateSlot(day.id, index, 'start', e.target.value)}
                              className="w-full pl-14 pr-4 bg-transparent font-bold text-sm outline-none text-center text-primary"
                            />
                          </div>
                          <div className="w-full relative flex items-center">
                            <span className="absolute left-4 text-[9px] font-bold text-text-muted uppercase">Do</span>
                            <input 
                              type="time" 
                              value={slot.end}
                              onChange={e => handleUpdateSlot(day.id, index, 'end', e.target.value)}
                              className="w-full pl-14 pr-4 bg-transparent font-bold text-sm outline-none text-center text-primary"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveSlot(day.id, index)}
                          className="w-14 h-14 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-red-100 shadow-sm"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => handleAddSlot(day.id)}
                      className="w-full h-14 border-2 border-dashed border-border rounded-2xl text-accent hover:border-accent hover:bg-accent/5 flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                      <Plus size={16} /> Dodaj przedział czasowy
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-6 z-50 pt-10">
        <button 
          onClick={saveAvailability}
          disabled={isSaving}
          className="w-full py-8 bg-primary text-white rounded-[2rem] font-bold text-[12px] uppercase tracking-[0.5em] shadow-button hover:bg-slate-800 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Clock className="animate-spin" size={20} /> : <Check size={20} />}
          {isSaving ? 'Zapisywanie...' : 'Zaktualizuj dostępność'}
        </button>
      </div>
    </div>
  );
};

const NewsSection = ({ profile }: { profile: UserProfile | null }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'news'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ newsId: doc.id, ...doc.data() } as NewsItem));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setNews(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'news');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse">Ładowanie aktualności...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary italic leading-tight">Aktualności</h2>
          <p className="text-[10px] text-text-muted mt-2 uppercase font-bold tracking-[0.2em] opacity-60">Najważniejsze wydarzenia z życia klubu</p>
        </div>
        <Newspaper size={24} className="text-accent hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {news.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center bg-white border border-dashed border-border rounded-[2rem]">
            <p className="text-sm text-text-muted italic">Brak aktualności w tej chwili</p>
          </div>
        ) : (
          news.map(item => (
            <motion.article 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.newsId} 
              className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="aspect-video relative overflow-hidden bg-bg">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted/20">
                    <Newspaper size={64} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute top-6 left-6">
                  <span className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-accent border border-white/50 shadow-sm">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('pl-PL')}</span>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[10px] text-accent font-bold uppercase tracking-widest">KJW Admin</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-primary italic mb-4 leading-tight group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed line-clamp-3">{item.content}</p>
                <button 
                  onClick={() => setSelectedNews(item)}
                  className="mt-6 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 group/btn"
                >
                  Czytaj więcej <div className="h-px w-6 bg-primary group-hover/btn:w-10 transition-all" />
                </button>
              </div>
            </motion.article>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-premium relative flex flex-col"
            >
              <button 
                onClick={() => setSelectedNews(null)} 
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-border flex items-center justify-center text-text-muted hover:text-primary transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto custom-scrollbar flex-1">
                {selectedNews.imageUrl && (
                  <div className="aspect-[21/9] w-full relative">
                    <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                  </div>
                )}
                
                <div className="p-8 sm:p-12 -mt-12 relative bg-white rounded-t-[3rem]">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="bg-accent/10 text-accent px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">
                      {selectedNews.category}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                      {new Date(selectedNews.createdAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-serif font-bold text-primary italic mb-8 leading-tight">
                    {selectedNews.title}
                  </h3>

                  <div className="prose prose-sm max-w-none text-text-muted leading-relaxed markdown-content">
                    <Markdown>{selectedNews.content}</Markdown>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GallerySection = () => {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gallery'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ photoId: doc.id, ...doc.data() } as GalleryItem));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setPhotos(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse">Ładowanie galerii...</div>;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-primary/10">
        <div>
          <p className="micro-label mb-2">Visual Repository</p>
          <h2 className="text-4xl font-serif font-black text-primary italic leading-tight tracking-tighter uppercase">Galeria</h2>
        </div>
        <div className="text-[10px] font-mono font-black uppercase text-accent border-2 border-primary px-4 py-2">
          MEDIA_ARCHIVE
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {photos.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-bg rounded-[2.5rem] border border-border">
            <ImageIcon size={64} className="mx-auto mb-6 text-accent/20" />
            <p className="font-serif font-bold italic text-text-muted text-lg">W tej chwili brak zdjęć w galerii</p>
          </div>
        ) : (
          photos.map(photo => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={photo.photoId} 
              className="aspect-square rounded-[2rem] overflow-hidden border border-border group relative cursor-zoom-in shadow-premium hover:shadow-elevated transition-all duration-500"
            >
              <img src={photo.url} alt={photo.description} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" referrerPolicy="no-referrer" />
              <div className="absolute inset-x-0 bottom-0 bg-primary/90 backdrop-blur-md translate-y-full group-hover:translate-y-0 transition-transform duration-500 p-6">
                <p className="text-white text-xs font-serif font-bold italic leading-tight mb-2">{photo.description || 'Moment z życia stajni'}</p>
                <div className="flex items-center justify-between border-t border-white/20 pt-3">
                  <span className="text-accent text-[9px] font-bold uppercase tracking-[0.2em]">{photo.category || 'Galeria'}</span>
                  <Camera size={14} className="text-white/40" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const BadgesSection = ({ onSignupClick }: { onSignupClick: () => void }) => (
  <div className="bg-white rounded-[3rem] p-12 border border-border shadow-premium relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-5 bg-slate-50 border-l border-b border-border text-[9px] font-bold uppercase tracking-widest text-accent">
       CERTYFIKAT PZJ
    </div>
    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
      <div className="w-40 h-40 rounded-[2.5rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-sm group-hover:rotate-12 transition-transform duration-700">
        <Trophy size={80} />
      </div>
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-3xl font-serif font-bold text-primary italic leading-tight mb-3">Odznaki Jeździeckie</h3>
        <p className="text-text-muted leading-relaxed max-w-xl mb-10">Zdobywaj ogólnopolskie certyfikaty polskiego związku jeździeckiego pod okiem naszej profesjonalnej kadry instruktorskiej.</p>
        
        <div className="flex flex-col sm:flex-row gap-5">
          <button 
            onClick={() => window.open('https://pzj.pl/odznaki-jezdzieckie/', '_blank')}
            className="flex-1 bg-white border border-border py-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:border-accent transition-all flex items-center justify-center gap-4 text-primary shadow-sm active:scale-95"
          >
            <ExternalLink size={16} /> Dokumentacja PZJ
          </button>
          <button 
            onClick={onSignupClick}
            className="flex-1 bg-primary text-white py-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-button active:scale-95"
          >
            <Check size={16} /> Zapisz się na egzamin
          </button>
        </div>
      </div>
    </div>
  </div>
);

const NotificationsSection = ({ notifications }: { notifications: AppNotification[] }) => {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary italic leading-tight">Powiadomienia</h2>
          <p className="text-[10px] text-text-muted mt-2 uppercase font-bold tracking-[0.2em] opacity-60">Bądź na bieżąco z życiem klubu</p>
        </div>
        <Bell size={24} className="text-accent" />
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-border rounded-[2rem] shadow-premium">
            <Bell size={48} className="mx-auto mb-4 text-accent/20" />
            <p className="text-sm text-text-muted italic">Brak nowych powiadomień</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.notificationId} 
              className={`p-6 rounded-2xl border transition-all ${n.isRead ? 'bg-white border-border/50 opacity-70' : 'bg-white border-accent/20 shadow-md ring-1 ring-accent/5'}`}
              onClick={() => !n.isRead && markAsRead(n.notificationId)}
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'lesson' ? 'bg-accent text-white' : 'bg-primary text-white'}`}>
                  {n.type === 'lesson' ? <Calendar size={18} /> : <MessageSquare size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-primary text-sm">{n.title}</h4>
                      {n.userId === 'admin' && (
                        <span className="text-[7px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">Ruch w aplikacji</span>
                      )}
                    </div>
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-accent rounded-full mt-2 animate-pulse" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AdminSection = ({ profile, appSettings, onNavigate, onDeleteItem }: { 
  profile: UserProfile | null, 
  appSettings: AppSettings | null,
  onNavigate: (tab: string) => void,
  onDeleteItem: (col: string, id: string) => void
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddHorse, setShowAddHorse] = useState(false);
  const [showAddNews, setShowAddNews] = useState(false);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [settingsForm, setSettingsForm] = useState<AppSettings>(appSettings || {
    logoUrl: '',
    clubName: 'Klub Jeździecki WIKI',
    mainPhone: '+48 504 270 174',
    website: 'www.jazda-konna.com'
  });

  const [newHorse, setNewHorse] = useState({ name: '', stableNumber: '', description: '', status: 'Dostępny' });
  const [newNews, setNewNews] = useState({ title: '', content: '', category: 'Ogłoszenie', imageUrl: '' });
  const [newGallery, setNewGallery] = useState({ url: '', description: '', category: 'Wydarzenia' });
  const [newInstructor, setNewInstructor] = useState({ 
    name: '', 
    bio: '', 
    specialties: '', 
    imageUrl: '', 
    phoneNumber: '', 
    whatsapp: '', 
    messenger: '',
    email: '',
    appRole: 'instructor' as UserRole
  });

  const [horses, setHorses] = useState<Horse[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  
  const [editingHorseId, setEditingHorseId] = useState<string | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editingInstructorId, setEditingInstructorId] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = snap.docs.map(doc => ({ userId: doc.id, ...doc.data() } as UserProfile));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setUsers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubHorses = onSnapshot(collection(db, 'horses'), (snap) => {
      setHorses(snap.docs.map(doc => ({ horseId: doc.id, ...doc.data() } as Horse)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'horses'));

    const unsubNews = onSnapshot(collection(db, 'news'), (snap) => {
      const data = snap.docs.map(doc => ({ newsId: doc.id, ...doc.data() } as NewsItem));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setNews(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'news'));

    const unsubGallery = onSnapshot(collection(db, 'gallery'), (snap) => {
      const data = snap.docs.map(doc => ({ photoId: doc.id, ...doc.data() } as GalleryItem));
      data.sort((a, b) => {
        const getT = (val: any) => {
          if (!val) return 0;
          if (val.toDate) return val.toDate().getTime();
          return new Date(val).getTime();
        };
        return getT(b.createdAt) - getT(a.createdAt);
      });
      setGallery(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'gallery'));

    return () => {
      unsubUsers();
      unsubHorses();
      unsubNews();
      unsubGallery();
    };
  }, []);

  const handleDeleteItemProxy = (collectionName: string, id: string) => {
    onDeleteItem(collectionName, id);
  };

  const handleUpdateHorseId = (h: Horse) => {
    setNewHorse({ name: h.name, stableNumber: h.stableNumber || '', description: h.description || '', status: h.status || 'Dostępny' });
    setEditingHorseId(h.horseId);
    setShowAddHorse(true);
  };

  const handleUpdateInstructorId = (i: Instructor) => {
    setNewInstructor({
      name: i.name,
      bio: i.bio || '',
      specialties: Array.isArray(i.specialties) ? i.specialties.join(', ') : (i.specialties || ''),
      imageUrl: i.imageUrl || '',
      phoneNumber: i.phoneNumber || '',
      whatsapp: i.whatsapp || '',
      messenger: i.messenger || '',
      email: (i as any).email || '',
      appRole: 'instructor'
    });
    setEditingInstructorId(i.instructorId);
    setShowAddInstructor(true);
  };

  const handleUpdateNewsId = (n: NewsItem) => {
    setNewNews({ title: n.title, content: n.content, category: n.category, imageUrl: n.imageUrl || '' });
    setEditingNewsId(n.newsId);
    setShowAddNews(true);
  };

  const handleUpdateGalleryId = (g: GalleryItem) => {
    setNewGallery({ url: g.url, description: g.description || '', category: g.category || 'Wydarzenia' });
    setEditingGalleryId(g.photoId);
    setShowAddGallery(true);
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) { 
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`); 
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'app'), settingsForm);
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app');
    }
  };

  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHorseId) {
        await updateDoc(doc(db, 'horses', editingHorseId), newHorse);
      } else {
        await addDoc(collection(db, 'horses'), { ...newHorse, createdAt: serverTimestamp() });
      }
      setNewHorse({ name: '', stableNumber: '', description: '', status: 'Dostępny' });
      setShowAddHorse(false);
      setEditingHorseId(null);
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, editingHorseId ? `horses/${editingHorseId}` : 'horses'); 
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNewsId) {
        await updateDoc(doc(db, 'news', editingNewsId), newNews);
      } else {
        await addDoc(collection(db, 'news'), { 
          ...newNews, 
          authorId: profile?.userId, 
          createdAt: new Date().toISOString() 
        });
      }
      
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: editingNewsId ? 'Zaktualizowano news' : 'Nowy news',
        message: `${profile?.name} ${editingNewsId ? 'wyedytował' : 'dodał'} aktualność: ${newNews.title}`,
        type: 'news',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setNewNews({ title: '', content: '', category: 'Ogłoszenie', imageUrl: '' });
      setShowAddNews(false);
      setEditingNewsId(null);
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, editingNewsId ? `news/${editingNewsId}` : 'news'); 
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGallery.url) return;
    try {
      if (editingGalleryId) {
        await updateDoc(doc(db, 'gallery', editingGalleryId), newGallery);
      } else {
        await addDoc(collection(db, 'gallery'), { 
          ...newGallery, 
          authorId: profile?.userId, 
          createdAt: new Date().toISOString() 
        });
      }

      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Nowa fotografia',
        message: `${profile?.name} dodał zdjęcie do galerii.`,
        type: 'news',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      setNewGallery({ url: '', description: '', category: 'Wydarzenia' });
      setShowAddGallery(false);
      setEditingGalleryId(null);
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, editingGalleryId ? `gallery/${editingGalleryId}` : 'gallery'); 
    }
  };

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const specialtiesArray = typeof newInstructor.specialties === 'string' 
        ? newInstructor.specialties.split(',').map(s => s.trim()).filter(s => s !== '') 
        : newInstructor.specialties;

      let instructorData: any = {
        name: newInstructor.name,
        bio: newInstructor.bio,
        specialties: specialtiesArray,
        imageUrl: newInstructor.imageUrl,
        phoneNumber: newInstructor.phoneNumber,
        whatsapp: newInstructor.whatsapp,
        messenger: newInstructor.messenger,
        email: newInstructor.email
      };

      if (newInstructor.email) {
        const userToLink = users.find(u => u.email === newInstructor.email);
        if (userToLink) {
          instructorData.userId = userToLink.userId;
          if (profile?.role === 'admin') {
            await updateDoc(doc(db, 'users', userToLink.userId), { role: newInstructor.appRole });
          }
        }
      }

      if (editingInstructorId) {
        await updateDoc(doc(db, 'instructors', editingInstructorId), instructorData);
      } else {
        const docRef = await addDoc(collection(db, 'instructors'), {
          ...instructorData,
          createdAt: serverTimestamp()
        });
        await updateDoc(docRef, { instructorId: docRef.id });
      }

      setNewInstructor({ name: '', bio: '', specialties: '', imageUrl: '', phoneNumber: '', whatsapp: '', messenger: '', email: '', appRole: 'instructor' });
      setShowAddInstructor(false);
      setEditingInstructorId(null);
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, editingInstructorId ? `instructors/${editingInstructorId}` : 'instructors'); 
    }
  };

  return (
    <div className="space-y-12 pb-24">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-border">
          <div>
            <h2 className="text-4xl font-serif font-bold text-primary italic leading-tight tracking-tight">Panel Administracyjny</h2>
            <p className="text-text-muted text-sm mt-2 uppercase tracking-[0.2em] font-bold">Zarządzaj swoją stajnią i kadrą</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('availability')} className="px-6 py-3.5 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-button hover:shadow-xl transition-all flex items-center gap-3 active:scale-95">
              <Clock size={16} /> Grafik pracy
            </button>
            <button onClick={() => { setEditingHorseId(null); setShowAddHorse(true); }} className="px-6 py-3.5 bg-white border border-border text-primary font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-premium transition-all flex items-center gap-3 active:scale-95">
              <Plus size={16} /> Dodaj konia
            </button>
            <button onClick={() => { setEditingInstructorId(null); setShowAddInstructor(true); }} className="px-6 py-3.5 bg-white border border-border text-primary font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-premium transition-all flex items-center gap-3 active:scale-95">
              <Plus size={16} /> Dodaj instruktora
            </button>
            <button onClick={() => { setEditingNewsId(null); setShowAddNews(true); }} className="px-6 py-3.5 bg-white border border-border text-primary font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-premium transition-all flex items-center gap-3 active:scale-95">
              <Plus size={16} /> Dodaj wpis
            </button>
            <button onClick={() => { setEditingGalleryId(null); setShowAddGallery(true); }} className="px-6 py-3.5 bg-white border border-border text-primary font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-premium transition-all flex items-center gap-3 active:scale-95">
              <Plus size={16} /> Dodaj zdjęcie
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="px-6 py-3.5 bg-primary/5 text-primary border border-border font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
            >
              Ustawienia
            </button>
          </div>
       </div>

       {showAddInstructor && (
         <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-12 bg-white rounded-[3rem] border border-border shadow-elevated max-w-5xl mx-auto">
            <header className="mb-12 pb-6 border-b border-border flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-serif font-bold text-primary italic leading-tight">{editingInstructorId ? 'Edytuj profil kadry' : 'Nowy członek zespołu'}</h3>
                <p className="text-text-muted text-xs uppercase tracking-widest font-bold mt-2">Uzupełnij informacje o instruktorze</p>
              </div>
            </header>

            <form onSubmit={handleAddInstructor} className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Imię i Nazwisko</label>
                      <input type="text" placeholder="np. Adrian Nowak" className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold transition-all" value={newInstructor.name} onChange={e => setNewInstructor({...newInstructor, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Specjalizacja</label>
                      <input type="text" placeholder="np. Skoki, Ujeżdżenie" className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold transition-all" value={newInstructor.specialties} onChange={e => setNewInstructor({...newInstructor, specialties: e.target.value})} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">O instruktorze (Bio)</label>
                      <textarea className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent h-40 text-sm leading-relaxed" value={newInstructor.bio} onChange={e => setNewInstructor({...newInstructor, bio: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Adres E-mail (do logowania)</label>
                      <input type="email" placeholder="np. instruktor@stajnia.pl" className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold italic transition-all" value={newInstructor.email} onChange={e => setNewInstructor({...newInstructor, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Poziom uprawnień</label>
                      <select 
                        className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold appearance-none transition-all"
                        value={newInstructor.appRole}
                        onChange={e => setNewInstructor({...newInstructor, appRole: e.target.value as UserRole})}
                      >
                        <option value="student">Użytkownik (Uczeń)</option>
                        <option value="instructor">Instruktor (Dostęp do grafiku)</option>
                        <option value="admin">Administrator (Pełna kontrola)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                       <div>
                         <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-3 block opacity-60">Numer Telefonu</label>
                         <input type="text" className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent font-bold text-primary text-xs transition-all" value={newInstructor.phoneNumber} onChange={e => setNewInstructor({...newInstructor, phoneNumber: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-3 block opacity-60">Messenger/WWW</label>
                         <input type="text" className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent font-bold text-primary text-xs transition-all" value={newInstructor.messenger} onChange={e => setNewInstructor({...newInstructor, messenger: e.target.value})} />
                       </div>
                    </div>
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-border/50">
                 <button type="submit" className="flex-1 bg-primary text-white py-6 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] shadow-button hover:shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                   {editingInstructorId ? 'Zapisz profil' : 'Zakończ rejestrację'}
                 </button>
                 <button type="button" onClick={() => { setEditingInstructorId(null); setShowAddInstructor(false); }} className="px-12 py-6 border border-border rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] text-text-muted hover:text-primary hover:bg-bg transition-all">
                   Anuluj
                 </button>
               </div>
            </form>
         </motion.div>
       )}



        {showAddNews && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-white border border-border rounded-3xl shadow-2xl max-w-3xl">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-serif font-bold text-primary italic">
                 {editingNewsId ? 'Edytuj artykuł' : 'Nowy wpis w aktualnościach'}
               </h3>
               <button onClick={() => setShowAddNews(false)} className="text-text-muted hover:text-accent transition-colors"><X size={20} /></button>
             </div>
             <form onSubmit={handleAddNews} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Tytuł artykułu</label>
                     <input type="text" className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-1 focus:ring-accent outline-none font-bold" value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} required />
                   </div>
                   <div>
                     <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Kategoria</label>
                     <select className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-1 focus:ring-accent outline-none text-xs font-bold" value={newNews.category} onChange={e => setNewNews({...newNews, category: e.target.value})}>
                       <option value="Ogłoszenie">Ogłoszenie</option>
                       <option value="Wydarzenie">Wydarzenie</option>
                       <option value="Sukcesy">Sukcesy</option>
                       <option value="Techniczne">Techniczne</option>
                     </select>
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Treść (Markdown wspierany)</label>
                   <textarea className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-1 focus:ring-accent outline-none h-40 text-sm leading-relaxed" value={newNews.content} onChange={e => setNewNews({...newNews, content: e.target.value})} required />
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Zdjęcie nagłówkowe (URL)</label>
                   <input type="text" placeholder="https://..." className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-1 focus:ring-accent outline-none text-xs" value={newNews.imageUrl} onChange={e => setNewNews({...newNews, imageUrl: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] shadow-button hover:shadow-xl transition-all">
                  {editingNewsId ? 'Zapisz zmiany' : 'Opublikuj Artykuł'}
                </button>
                {editingNewsId && <button type="button" onClick={() => { setEditingNewsId(null); setShowAddNews(false); }} className="w-full py-2 text-[10px] font-bold uppercase opacity-60 mt-2">Anuluj</button>}
             </form>
          </motion.div>
        )}

       {showAddGallery && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-10 hardware-grid bg-white max-w-2xl w-full">
            <header className="mb-8 pb-4 border-b-2 border-primary/10 flex justify-between items-end">
              <div>
                <p className="micro-label mb-1">Asset Ingestion</p>
                <h3 className="text-3xl font-serif font-black text-primary italic tracking-tighter uppercase">{editingGalleryId ? 'Modify Visual Asset' : 'Inject New Data'}</h3>
              </div>
              <div className="text-[10px] font-mono font-black text-primary/40 uppercase">STATUS: BUFFERING</div>
            </header>

            <form onSubmit={handleAddGallery} className="space-y-8">
               <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-mono font-black uppercase tracking-widest text-primary/40 block mb-2">Visual Core [DRAG_DROP / PASTE]</label>
                   <div 
                     onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent'); }}
                     onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent'); }}
                     onDrop={(e) => {
                       e.preventDefault();
                       const file = e.dataTransfer.files[0];
                       if (file && file.type.includes('image')) {
                         const reader = new FileReader();
                         reader.onload = (event) => setNewGallery(prev => ({ ...prev, url: event.target?.result as string }));
                         reader.readAsDataURL(file);
                       }
                     }}
                     onPaste={(e) => {
                        const item = e.clipboardData.items[0];
                        if (item?.type.includes('image')) {
                          const reader = new FileReader();
                          reader.onload = (event) => setNewGallery(prev => ({ ...prev, url: event.target?.result as string }));
                          reader.readAsDataURL(item.getAsFile()!);
                        }
                     }}
                     className="w-full h-64 border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center bg-slate-50 group relative overflow-hidden transition-all hover:bg-slate-100"
                   >
                     {newGallery.url ? (
                       <img src={newGallery.url} className="w-full h-full object-cover grayscale" />
                     ) : (
                       <div className="text-center">
                         <Camera size={32} className="mx-auto mb-4 text-primary/20" />
                         <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-primary/40 leading-relaxed max-w-[200px] mx-auto">DEPLOY_VISUAL_PAYLOAD_HERE</p>
                       </div>
                     )}
                   </div>
                   <div className="mt-4">
                     <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest mb-2 block">Direct Asset Endpoint (URL)</label>
                     <input type="text" placeholder="https://external-host.xyz/asset.png" className="w-full p-4 bg-slate-50 border-2 border-primary/10 focus:border-accent outline-none font-mono text-[10px] uppercase font-black" value={newGallery.url} onChange={e => setNewGallery({...newGallery, url: e.target.value})} />
                   </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Opis zdjęcia / Tytuł</label>
                    <input type="text" placeholder="np. Trening skokowy - Helios" className="w-full p-5 bg-bg border border-border rounded-2xl focus:border-accent outline-none text-sm font-bold" value={newGallery.description} onChange={e => setNewGallery({...newGallery, description: e.target.value})} />
                 </div>
               </div>

               <div className="flex flex-col md:flex-row gap-5 pt-6 border-t border-border/50">
                 <button type="submit" className="flex-1 bg-primary text-white py-6 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] shadow-button hover:bg-slate-800 transition-all">
                   {editingGalleryId ? 'Zapisz zmiany' : 'Dodaj zdjęcie'}
                 </button>
                 <button type="button" onClick={() => { setEditingGalleryId(null); setShowAddGallery(false); }} className="px-12 py-6 font-bold text-[10px] uppercase tracking-widest text-text-muted hover:text-primary transition-all">
                   Anuluj
                 </button>
               </div>
            </form>
         </motion.div>
       )}

       {showSettings && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-10 bg-white rounded-[2.5rem] border border-border shadow-premium max-w-4xl w-full">
            <header className="mb-8 pb-4 border-b-2 border-primary/10 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1 opacity-60">Konfiguracja globalna</p>
                <h3 className="text-3xl font-serif font-bold text-primary italic tracking-tight">Parametry Systemu</h3>
              </div>
              <div className="text-[10px] font-bold uppercase text-primary/40 bg-bg px-4 py-2 rounded-xl border border-border">WERSJA 1.0</div>
            </header>

            <form onSubmit={handleUpdateSettings} className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-4 italic">Logo Ośrodka</label>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent', 'bg-accent/5'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-accent', 'bg-accent/5');
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.includes('image')) {
                          const reader = new FileReader();
                          reader.onload = (event) => setSettingsForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
                          reader.readAsDataURL(file);
                        }
                      }}
                      onPaste={(e) => {
                        const item = e.clipboardData.items[0];
                        if (item?.type.includes('image')) {
                          const reader = new FileReader();
                          reader.onload = (event) => setSettingsForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
                          reader.readAsDataURL(item.getAsFile()!);
                        }
                      }}
                      className="w-full aspect-square border-2 border-dashed border-primary/10 rounded-xl flex items-center justify-center bg-slate-50 group hover:bg-slate-100 transition-all cursor-crosshair overflow-hidden"
                    >
                      {settingsForm.logoUrl ? (
                        <div className="relative w-full h-full group p-8">
                          <img src={settingsForm.logoUrl} className="w-full h-full object-contain grayscale opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all" />
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-black/60 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-all font-mono text-[8px] text-white flex justify-between items-center">
                            <span>REPLACE_ASSET</span>
                            <span>{settingsForm.logoUrl.slice(0, 20)}...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center font-mono space-y-4">
                          <Plus size={24} className="mx-auto text-primary/20" />
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">DROP_SVG_OR_PNG</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Oficjalna Nazwa Ośrodka</label>
                    <input type="text" className="w-full p-5 bg-bg border border-border rounded-2xl focus:border-accent outline-none text-sm font-bold" value={settingsForm.clubName} onChange={e => setSettingsForm({...settingsForm, clubName: e.target.value})} required />
                 </div>
                 
                 <div className="pt-6 border-t-2 border-primary/5 space-y-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4 italic opacity-60">Parametry transmisji</p>
                    <div className="space-y-4">
                      <div className="relative group">
                        <input type="text" placeholder="Main Contact Number" className="w-full p-4 pl-12 bg-slate-50 border-2 border-primary/10 focus:border-accent outline-none font-mono text-[10px] uppercase font-black" value={settingsForm.mainPhone || settingsForm.contactPhone || ''} onChange={e => setSettingsForm({...settingsForm, mainPhone: e.target.value})} />
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" />
                      </div>
                      <div className="relative group">
                        <input type="email" placeholder="Official E-mail" className="w-full p-4 pl-12 bg-slate-50 border-2 border-primary/10 focus:border-accent outline-none font-mono text-[10px] font-black" value={settingsForm.contactEmail} onChange={e => setSettingsForm({...settingsForm, contactEmail: e.target.value})} />
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" />
                      </div>
                      <div className="relative group">
                        <input type="text" placeholder="Physical Address" className="w-full p-4 pl-12 bg-slate-50 border-2 border-primary/10 focus:border-accent outline-none font-mono text-[10px] uppercase font-black" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} />
                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" />
                      </div>
                    </div>
                 </div>

                 <div className="pt-8">
                    <button type="submit" className="w-full bg-primary text-white py-6 font-mono font-black uppercase text-[10px] tracking-[0.6em] shadow-hardware active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                      COMMIT_CHANGES <ChevronRight size={14} />
                    </button>
                    <button type="button" onClick={() => setShowSettings(false)} className="w-full mt-4 py-3 font-mono font-black text-[9px] uppercase tracking-[0.4em] text-slate-400 hover:text-primary transition-all">
                      ABORT_CHANGES
                    </button>
                 </div>
               </div>
            </form>
          </motion.div>
        )}

        {showAddHorse && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-10 bg-white rounded-[2.5rem] border border-border shadow-premium max-w-2xl w-full">
            <form onSubmit={handleAddHorse} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Imię konia</label>
                    <input type="text" placeholder="np. Helios" className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold transition-all" value={newHorse.name} onChange={e => setNewHorse({...newHorse, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Numer boksu / stajnia</label>
                    <input type="text" placeholder="np. B-23 / Stajnia B" className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent text-primary font-bold transition-all" value={newHorse.stableNumber} onChange={e => setNewHorse({...newHorse, stableNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-3">Opis i uwagi</label>
                    <textarea placeholder="Informacje o koniu, predyspozycjach lub aktualnym statusie..." className="w-full p-5 bg-bg border border-border rounded-2xl outline-none focus:border-accent h-40 text-sm leading-relaxed" value={newHorse.description} onChange={e => setNewHorse({...newHorse, description: e.target.value})} />
                  </div>
                </div>
                <div className="flex flex-col gap-4 pt-6 border-t border-border/50">
                  <button type="submit" className="w-full bg-primary text-white py-6 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] shadow-button hover:bg-slate-800 transition-all active:scale-95">
                    {editingHorseId ? 'Zapisz zmiany (Aktualizuj)' : 'Dodaj do bazy'}
                  </button>
                  <button type="button" onClick={() => { setEditingHorseId(null); setShowAddHorse(false); }} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-primary transition-colors">
                    Anuluj
                  </button>
                </div>
             </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-16">
           {/* Konie Management */}
           <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden flex flex-col">
             <div className="p-10 border-b border-border bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="font-serif font-bold text-2xl text-primary italic tracking-tight">Konie w stajni</h3>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">Rejestr zwierząt</p>
               </div>
               <div className="text-[10px] font-bold uppercase text-primary bg-bg border border-border px-4 py-2 rounded-xl">Łącznie: {horses.length}</div>
             </div>
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-8 space-y-4">
                 {horses.map(h => (
                   <div key={h.horseId} className="flex items-center justify-between p-6 bg-white border border-border rounded-3xl hover:border-accent/40 shadow-sm hover:shadow-premium group transition-all">
                     <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-bg border border-border flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform">
                         <Horseshoe size={28} />
                       </div>
                       <div>
                         <div className="text-lg font-serif font-bold text-primary italic">{h.name}</div>
                         <div className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest opacity-60">Boks: {h.stableNumber || 'Brak danych'}</div>
                       </div>
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUpdateHorseId(h)} className="p-3 bg-bg text-text-muted hover:text-primary rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteItemProxy('horses', h.horseId)} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100"><Trash2 size={16} /></button>
                     </div>
                   </div>
                 ))}
             </div>
           </div>

           {/* Instruktorzy Management */}
           <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden flex flex-col">
             <div className="p-10 border-b border-border bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="font-serif font-bold text-2xl text-primary italic tracking-tight">Nasza Kadra</h3>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">Zarządzanie instruktorami</p>
               </div>
               <div className="text-[10px] font-bold uppercase text-primary bg-bg border border-border px-4 py-2 rounded-xl">Zespół: {instructors.length}</div>
             </div>
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-8 space-y-4">
                 {instructors.map(i => (
                   <div key={i.instructorId} className="flex items-center justify-between p-6 bg-white border border-border rounded-3xl hover:border-accent/40 shadow-sm hover:shadow-premium group transition-all">
                     <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-bg border border-border overflow-hidden shadow-sm">
                         <img src={i.imageUrl || `https://picsum.photos/seed/${i.name}/150/150`} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" referrerPolicy="no-referrer" />
                       </div>
                       <div>
                         <div className="text-lg font-serif font-bold text-primary italic">{i.name}</div>
                         <div className="text-[10px] font-bold text-accent mt-1 uppercase tracking-widest">
                            {Array.isArray(i.specialties) ? (i.specialties[0] || 'Instruktor') : (String(i.specialties || 'Instruktor'))}
                         </div>
                       </div>
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUpdateInstructorId(i)} className="p-3 bg-bg text-text-muted hover:text-primary rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteItemProxy('instructors', i.instructorId)} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100"><Trash2 size={16} /></button>
                     </div>
                   </div>
                 ))}
             </div>
           </div>

           {/* Aktualności Management */}
           <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden flex flex-col">
             <div className="p-10 border-b border-border bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="font-serif font-bold text-2xl text-primary italic tracking-tight">Aktualności</h3>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">Zarządzanie treścią</p>
               </div>
               <div className="text-[10px] font-bold uppercase text-primary bg-bg border border-border px-4 py-2 rounded-xl">Postów: {news.length}</div>
             </div>
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-8 space-y-4">
                 {news.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(n => (
                   <div key={n.newsId} className="flex items-center justify-between p-6 bg-white border border-border rounded-3xl hover:border-accent/40 shadow-sm hover:shadow-premium group transition-all">
                     <div className="flex-1 min-w-0 pr-6">
                        <div className="text-lg font-serif font-bold text-primary italic truncate">{n.title}</div>
                        <div className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-widest opacity-60">{new Date(n.createdAt).toLocaleDateString('pl-PL')}</div>
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUpdateNewsId(n)} className="p-3 bg-bg text-text-muted hover:text-primary rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteItemProxy('news', n.newsId)} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100"><Trash2 size={16} /></button>
                     </div>
                   </div>
                 ))}
             </div>
           </div>
           
           {/* Galeria Management */}
           <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden flex flex-col">
             <div className="p-10 border-b border-border bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="font-serif font-bold text-2xl text-primary italic tracking-tight">Nasza Galeria</h3>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">Zasoby wizualne</p>
               </div>
               <div className="text-[10px] font-bold uppercase text-primary bg-bg border border-border px-4 py-2 rounded-xl">Mediów: {gallery.length}</div>
             </div>
             <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-8">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 {gallery.map(g => (
                   <div key={g.photoId} className="aspect-square rounded-[1.5rem] overflow-hidden border border-border relative group shadow-sm transition-all">
                     <img src={g.url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                     <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => handleUpdateGalleryId(g)} className="p-4 bg-white/90 text-primary hover:bg-white rounded-2xl transition-all shadow-lg active:scale-95"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteItemProxy('gallery', g.photoId)} className="p-4 bg-red-500/90 text-white rounded-2xl transition-all shadow-lg active:scale-95"><Trash2 size={18} /></button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
        </div>

        <div className="space-y-8 mt-24">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-border">
            <div>
              <h2 className="text-4xl font-serif font-bold text-primary italic leading-tight tracking-tight">Baza Użytkowników</h2>
              <p className="text-text-muted text-sm mt-2 uppercase tracking-[0.2em] font-bold">Zarządzaj dostępem do aplikacji</p>
            </div>
            <div className="text-[10px] font-bold uppercase text-primary bg-bg border border-border px-5 py-3 rounded-2xl">
              Zarejestrowanych: {users.length}
            </div>
          </header>

          <div className="bg-white rounded-[2.5rem] border border-border shadow-premium overflow-hidden overflow-x-auto">
             <table className="w-full text-left text-xs border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-border">
                      <th className="px-10 py-8 font-bold uppercase tracking-[0.2em] text-[10px] text-primary">Użytkownik</th>
                      <th className="px-10 py-8 font-bold uppercase tracking-[0.2em] text-[10px] text-primary">Kontakt</th>
                      <th className="px-10 py-8 font-bold uppercase tracking-[0.2em] text-[10px] text-primary">Rola / Uprawnienia</th>
                      <th className="px-10 py-8 font-bold uppercase tracking-[0.2em] text-[10px] text-primary text-right">Zarządzaj</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   {users.map(u => (
                      <tr key={u.userId} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-10 py-8">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-serif font-bold text-xl shadow-sm">
                                  {u.name?.charAt(0) || '?'}
                               </div>
                               <div>
                                  <div className="font-serif font-bold text-lg text-primary italic">{u.name}</div>
                                  <div className="text-xs text-text-muted mt-1 opacity-70">{u.email}</div>
                                </div>
                            </div>
                         </td>
                         <td className="px-10 py-8">
                            <div className="font-bold text-primary text-sm opacity-80">{u.phoneNumber || 'Brak numeru'}</div>
                         </td>
                         <td className="px-10 py-8">
                            <span className={`px-5 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm ${
                                u.role === 'admin' ? 'bg-primary text-white' : 
                                u.role === 'instructor' ? 'bg-accent text-white' : 
                                'bg-bg text-text-muted border border-border'
                            }`}>
                               {u.role === 'admin' ? 'Administrator' : u.role === 'instructor' ? 'Instruktor' : 'Uczeń'}
                            </span>
                         </td>
                         <td className="px-10 py-8 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                               <button 
                                 onClick={() => handleUpdateUserRole(u.userId, 'instructor')}
                                 className="px-5 py-2.5 bg-accent/10 text-accent rounded-xl font-bold text-[9px] uppercase hover:bg-accent hover:text-white transition-all shadow-sm"
                               >
                                 Mianuj Instruktorem
                               </button>
                               <button 
                                 onClick={() => handleUpdateUserRole(u.userId, 'admin')}
                                 className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-[9px] uppercase hover:bg-slate-800 transition-all shadow-sm"
                               >
                                 Przyznaj Admina
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
    </div>
  );
};
