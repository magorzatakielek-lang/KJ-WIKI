import React, { useState, useEffect, useRef, Component, ReactNode, useMemo } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
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
  Globe,
  Send,
  Trash2,
  Check,
  Edit,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Camera,
  Share
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
            <p className="text-sm text-text-muted mb-8 leading-relaxed">
              Przepraszamy, wystąpił nieoczekiwany błąd. {isFirestoreError ? 'Wystąpił problem z dostępem do bazy danych.' : 'Spróbuj odświeżyć stronę.'}
            </p>
            {isFirestoreError && parsedError && (
              <div className="text-[10px] bg-bg p-4 rounded-xl mb-8 text-left font-mono overflow-auto max-h-40 border border-border">
                <p className="text-red-600 font-bold mb-1">Błąd: {parsedError.error}</p>
                <p>Operacja: {parsedError.operationType}</p>
                <p>Ścieżka: {parsedError.path}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg"
            >
              Odśwież aplikację
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return (this.props as any).children;
  }
}

// --- Components ---

const Sidebar = ({ profile, onLogout, activeTab, setActiveTab, unreadCount, appSettings }: { 
  profile: UserProfile | null, 
  onLogout: () => void,
  activeTab: string,
  setActiveTab: (t: string) => void,
  unreadCount: number,
  appSettings: AppSettings | null
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Panel Główny', icon: Home },
    { id: 'lessons', label: 'Grafik i Rezerwacje', icon: Calendar },
    { id: 'news', label: 'Aktualności', icon: Newspaper },
    { id: 'forum', label: 'Forum Klubu', icon: MessageSquare },
    { id: 'gallery', label: 'Galeria', icon: ImageIcon },
    { id: 'badges', label: 'Odznaki Jeździeckie', icon: Trophy },
  ];

  if (profile?.role === 'admin' || profile?.role === 'instructor') {
    menuItems.push({ id: 'admin', label: 'Zarządzanie', icon: Lock });
  }

  const NavContent = () => (
    <div className="flex flex-col min-h-full bg-primary text-white p-8">
      <div className="mb-8 text-center shrink-0">
        <div className="w-20 h-20 bg-white p-3 rounded-2xl flex items-center justify-center shadow-premium mx-auto mb-4 overflow-hidden border-4 border-accent/20">
          <img 
            src={appSettings?.logoUrl || "/logo.png"} 
            alt="Logo" 
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://picsum.photos/seed/equestrian/200/200";
            }}
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-xl font-bold italic tracking-tight text-white leading-none">{appSettings?.clubName || 'KJW'}</h1>
        <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-accent mt-2">Klub Jeździecki</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-visible">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 group ${
              activeTab === item.id 
                ? 'bg-accent text-white shadow-lg' 
                : 'hover:bg-white/10 text-white/90 hover:text-white'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />
            <span className="text-xs font-semibold uppercase tracking-[0.15em]">{item.label}</span>
          </button>
        ))}
        <div className="pt-4 h-px bg-white/10 mx-2 my-2" />
        <button
          onClick={() => {
            setActiveTab('notifications');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 group ${
            activeTab === 'notifications' 
              ? 'bg-accent text-white shadow-lg' 
              : 'hover:bg-white/10 text-white/90 hover:text-white'
          }`}
        >
          <div className="relative">
            <Bell size={18} className={activeTab === 'notifications' ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 transition-opacity'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-primary" />
            )}
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em]">Powiadomienia</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </button>
      </nav>

      <div className="mt-8 pt-8 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-4 mb-6 p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-serif font-bold italic text-lg shadow-lg border-2 border-white/20 overflow-hidden">
            {profile?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate leading-tight">{profile?.name}</p>
            <p className="text-[9px] text-accent font-bold uppercase tracking-widest mt-0.5">{profile?.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 group"
        >
          <LogOut size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Wyloguj się</span>
        </button>

        <div className="mt-8 space-y-4 px-2">
          <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="flex items-center gap-3 text-white/40 hover:text-accent transition-colors">
            <Phone size={14} />
            <span className="text-[10px] font-bold tracking-widest uppercase">{appSettings?.mainPhone || '+48 504 270 174'}</span>
          </a>
          <a 
            href={appSettings?.website ? (appSettings.website.startsWith('http') ? appSettings.website : `https://${appSettings.website}`) : 'https://www.jazda-konna.com'} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-3 text-white/40 hover:text-accent transition-colors"
          >
            <Globe size={14} />
            <span className="text-[10px] font-bold tracking-widest uppercase">{appSettings?.website || 'www.jazda-konna.com'}</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Pinned within the main container shell */}
      <aside className="hidden lg:block w-80 h-full shrink-0 overflow-y-auto custom-scrollbar-light">
        <NavContent />
      </aside>

      {/* Mobile Nav Header */}
      <div className="lg:hidden h-16 bg-primary flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <img 
             src={appSettings?.logoUrl || "/logo.png"} 
             className="h-8 object-contain" 
             onError={(e) => {
               (e.target as HTMLImageElement).src = "https://picsum.photos/seed/equestrian/200/200";
             }}
             referrerPolicy="no-referrer"
           />
           <span className="text-white font-bold italic text-sm">{appSettings?.clubName || 'KJW'}</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="text-white/80 hover:text-accent transition-colors">
            <Phone size={20} />
          </a>
          <button onClick={() => setMobileMenuOpen(true)} className="text-white">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed inset-0 z-[100] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs shadow-2xl bg-primary overflow-y-auto custom-scrollbar-light">
              <NavContent />
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-6 right-6 text-white/50 z-[110]"
              >
                <X size={24} />
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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

  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => doc.data() as AppNotification));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'notifications');
      });
    }
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const path = `users/${u.uid}`;
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              userId: u.uid,
              email: u.email || '',
              name: u.displayName || 'Użytkownik',
              role: 'student',
              createdAt: new Date().toISOString(),
            };
            if (u.email === 'magorzata.kielek@gmail.com') {
              newProfile.role = 'admin';
            }
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Błąd logowania:', error);
      alert('Błąd logowania: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && profile && !profile.phoneNumber) {
    return <PhoneRegistration profile={profile} setProfile={setProfile} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-primary/5 rounded-full blur-[100px]" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-[400px] w-full text-center relative z-10"
        >
          <div className="w-32 h-32 bg-white p-3 rounded-[2.5rem] flex items-center justify-center shadow-premium mx-auto mb-10 border border-border overflow-hidden">
            <img 
              src={appSettings?.logoUrl || "/logo.png"} 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/equestrian/200/200";
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-5xl font-serif font-bold mb-2 text-primary italic tracking-tight">{appSettings?.clubName || 'KJW'}</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-accent mb-10 translate-x-1">Klub Jeździecki</p>
          
          <div className="mb-12 space-y-3 bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-white shadow-sm">
            <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="text-sm font-bold text-primary flex items-center justify-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                <Phone size={14} /> 
              </div>
              {appSettings?.mainPhone || '+48 504 270 174'}
            </a>
            <p className="text-xs text-text-muted font-medium italic">{appSettings?.website || 'www.jazda-konna.com'}</p>
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-border/40">
              {appSettings?.messengerLink && (
                <a href={appSettings.messengerLink} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#0084FF] shadow-sm border border-border hover:border-accent transition-all">
                  <Send size={18} />
                </a>
              )}
              {appSettings?.whatsappLink && (
                <a href={`https://wa.me/${appSettings.whatsappLink.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#25D366] shadow-sm border border-border hover:border-accent transition-all">
                  <MessageCircle size={18} />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-5 bg-primary text-white rounded-2xl font-bold hover:bg-primary-light transition-all shadow-button flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
          >
            <div className="p-1 bg-white rounded-md">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
            </div>
            Zaloguj się przez Google
          </button>
          
          <p className="mt-8 text-[10px] text-text-muted uppercase tracking-widest font-bold opacity-40">System Zarządzania Stajnią v2.0</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#F0F2F1] font-sans flex items-center justify-center p-0 lg:p-6 xl:p-8">
      <div id="main-container" className="w-full max-w-[1850px] min-h-screen lg:min-h-[90vh] lg:max-h-[94vh] flex flex-col lg:flex-row bg-white rounded-none lg:rounded-[3rem] shadow-premium overflow-hidden border border-black/5 relative">
        <Sidebar 
          profile={profile} 
          onLogout={handleLogout} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          unreadCount={unreadCount}
          appSettings={appSettings}
        />
        
        <main id="main-content" className="flex-1 p-6 lg:p-14 overflow-y-auto overflow-x-hidden bg-[#FDFDFB]/50 custom-scrollbar scroll-smooth">
          {/* Top Info Bar - Persistent across tabs */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-8 gap-y-3 mb-10 pb-4 border-b border-border/40">
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
                />
              )}
              {activeTab === 'lessons' && <LessonsSection profile={profile} />}
              {activeTab === 'notifications' && <NotificationsSection notifications={notifications} />}
              {activeTab === 'forum' && <ForumSection profile={profile} />}
              {activeTab === 'news' && <NewsSection profile={profile} />}
              {activeTab === 'gallery' && <GallerySection />}
              {activeTab === 'badges' && <BadgesSection onSignupClick={() => setActiveTab('lessons')} />}
              {activeTab === 'admin' && (profile?.role === 'admin' || profile?.role === 'instructor') && (
                <AdminSection profile={profile} appSettings={appSettings} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Sub-components (Reconstructed) ---

const Dashboard = ({ profile, onNavigate, appSettings, deferredPrompt, onInstall }: { 
  profile: UserProfile | null, 
  onNavigate: (tab: string) => void, 
  appSettings: AppSettings | null,
  deferredPrompt: any,
  onInstall: () => void
}) => {
  const [showHelper, setShowHelper] = useState(false);
  const isIframe = window.top !== window.self;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary italic leading-tight">Witaj ponownie, {profile?.name.split(' ')[0]}</h2>
          <p className="text-text-muted text-sm mt-3 uppercase font-bold tracking-[0.2em]">Sprawdź co słychać w Twoim klubie dzisiaj</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-8">
        <div className="space-y-8">
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
               <Horseshoe size={120} />
            </div>
            <div className="relative z-10 flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-primary italic">Dzisiejszy Grafik</h3>
              <button 
                onClick={() => onNavigate('lessons')}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary-light transition-all shadow-md active:scale-95"
              >
                <Calendar size={14} /> Zobacz pełny kalendarz
              </button>
            </div>
            <UpcomingLessons onNavigate={onNavigate} profile={profile} />
          </div>

          <InstructorsList />
        </div>

        <div className="space-y-8">
          <div className="bg-primary text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[300px] border border-white/5">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <a href={`tel:${appSettings?.mainPhone || '+48504270174'}`} className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm group-hover:bg-accent group-hover:text-white transition-all cursor-pointer block">
                  <Phone size={24} className="text-accent group-hover:text-white transition-colors" />
                </a>
                <h3 className="text-2xl font-serif font-bold italic">Mobile App</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-8 max-w-[240px]">
                Zainstaluj interaktywny panel KJW na swoim telefonie, aby zarządzać jazdami w dowolnym miejscu.
              </p>
              <div className="space-y-3">
                <a 
                  href={appSettings?.website ? (appSettings.website.startsWith('http') ? appSettings.website : `https://${appSettings.website}`) : '#'} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer block text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-primary shrink-0 shadow-sm">1</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-0.5">Przeglądarka</p>
                    <p className="text-[10px] text-white/70 leading-tight">Uruchom stronę w Safari (iOS) lub Chrome (Android)</p>
                  </div>
                </a>
                
                {deferredPrompt ? (
                  <button 
                    onClick={onInstall}
                    className="w-full flex items-start gap-3 bg-white text-primary p-4 rounded-2xl border border-white shadow-lg hover:translate-y-[-2px] transition-all cursor-pointer text-left active:scale-95 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-primary shrink-0 shadow-sm group-hover:scale-110 transition-transform">2</div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5">Zainstaluj teraz</p>
                      <p className="text-[10px] text-primary/70 leading-tight italic font-medium">Kliknij, aby dodać do ekranu głównego</p>
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowHelper(true)}
                    className="w-full flex items-start gap-3 bg-accent/10 p-4 rounded-2xl border border-accent/20 hover:bg-accent/20 transition-all cursor-pointer text-left active:scale-95 group"
                  >
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-primary shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <Share size={12} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-0.5">Instrukcja instalacji</p>
                      <p className="text-[10px] text-white/70 leading-tight">Kliknij tutaj, aby zobaczyć jak dodać aplikację do ekranu</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showHelper && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowHelper(false)}
                  className="fixed inset-0 bg-primary/60 backdrop-blur-md"
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 30 }}
                  className="relative bg-white w-full max-w-[400px] rounded-[2.5rem] p-6 sm:p-10 shadow-3xl my-auto transition-all max-h-[90vh] overflow-y-auto scrollbar-hide"
                >
                  <div className="sticky top-0 right-0 flex justify-end z-20 -mr-2 -mt-2 sm:-mr-4 sm:-mt-4">
                    <button onClick={() => setShowHelper(false)} className="p-2 transition-colors">
                      <X size={24} className="text-text-muted hover:text-primary transition-colors" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent/10 rounded-3xl flex items-center justify-center text-accent mb-6 sm:mb-8 shadow-inner ring-4 ring-bg shrink-0">
                      <ExternalLink size={28} className="sm:hidden" />
                      <ExternalLink size={36} className="hidden sm:block" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-4 italic">Dodaj do ekranu</h3>
                    
                    <div className="space-y-4 sm:space-y-6 text-left w-full">
                      {isIframe && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mb-2">
                          <div className="flex gap-3">
                            <AlertTriangle className="text-orange-500 shrink-0" size={18} />
                            <div>
                              <p className="text-[10px] sm:text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-1">Uwaga: Tryb Podglądu</p>
                              <p className="text-[9px] sm:text-[10px] text-orange-600 leading-relaxed">Instalacja PWA nie działa wewnątrz tego okna. Kliknij ikonę <strong>"Otwórz w nowej karcie"</strong> <ExternalLink size={10} className="inline mx-0.5" /> w prawym górnym rogu ekranu.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 p-3 sm:p-4 hover:bg-bg rounded-2xl transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                        <div>
                          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-widest">Krok dla iOS (Safari)</p>
                          <p className="text-[10px] sm:text-[11px] text-text-muted leading-relaxed">Kliknij przycisk <Share size={12} className="inline text-accent mx-1" /> na dole ekranu, przewiń w dół i wybierz <strong>"Dodaj do ekranu początkowego"</strong>.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-3 sm:p-4 hover:bg-bg rounded-2xl transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                        <div>
                          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-widest">Krok dla Android (Chrome)</p>
                          <p className="text-[10px] sm:text-[11px] text-text-muted leading-relaxed">Kliknij ikonę trzech kropek <span className="font-bold">:</span> w prawym górnym rogu i wybierz <strong>"Zainstaluj aplikację"</strong> lub "Dodaj do ekranu".</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowHelper(false)}
                      className="w-full mt-8 sm:mt-10 bg-primary text-white py-4 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.2em] shadow-button hover:translate-y-[-2px] transition-all"
                    >
                      Rozumiem, dziękuję
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-premium group">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-primary italic">Twoje Postępy</h3>
              <Trophy size={20} className="text-accent" />
            </div>
            <div className="flex items-center gap-5 p-4 bg-bg rounded-2xl border border-border/50 group-hover:border-accent/30 transition-all cursor-pointer" onClick={() => onNavigate('lessons')}>
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-accent shadow-premium border border-border">
                  <Horseshoe size={28} />
               </div>
               <div>
                  <p className="text-sm font-bold text-primary">Poziom Podstawowy</p>
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">Zapisz się na egzamin</p>
               </div>
            </div>
          </div>

          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-premium">
            <h3 className="text-xl font-serif font-bold text-primary italic mb-6">Szybka Rezerwacja</h3>
            <div className="space-y-4">
              <div onClick={() => onNavigate('lessons')} className="p-4 bg-bg border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-text-muted hover:border-accent transition-all cursor-pointer">Wybierz Instruktora</div>
              <div onClick={() => onNavigate('lessons')} className="p-4 bg-bg border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-text-muted hover:border-accent transition-all cursor-pointer">Rodzaj treningu</div>
              <button 
                onClick={() => onNavigate('lessons')}
                className="w-full bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-accent-light transition-all"
              >
                Szukaj terminów
              </button>
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

const UpcomingLessons = ({ onNavigate, profile }: { onNavigate: (tab: string) => void, profile: UserProfile | null }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const isStaff = profile?.role === 'admin' || profile?.role === 'instructor';
  
  useEffect(() => {
    // Fetch both scheduled and pending lessons
    const q = query(
      collection(db, 'lessons'), 
      where('status', 'in', ['scheduled', 'pending']), 
      orderBy('startTime', 'asc'), 
      limit(10)
    );
    
    return onSnapshot(q, (snapshot) => {
      const allLessons = snapshot.docs.map(doc => ({ lessonId: doc.id, ...doc.data() } as Lesson));
      // For students, show only their pending lessons or any scheduled lessons
      // actually, just filter in the render or here
      setLessons(allLessons.filter(l => {
        if (isStaff) return true;
        if (l.status === 'scheduled') return true;
        if (l.status === 'pending' && l.studentId === profile?.userId) return true;
        return false;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lessons');
    });
  }, [profile?.userId, isStaff]);

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
           <div className="text-right hidden sm:block">
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
                <div className="flex items-center justify-end gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${l.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`} />
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${l.status === 'pending' ? 'text-orange-700' : 'text-green-800'}`}>
                    {l.status === 'pending' ? 'Oczekiwanie' : 'Twoja lekcja'}
                  </p>
                </div>
              )}
           </div>
        </div>
      ))}
    </div>
  );
};

const InstructorsList = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  useEffect(() => {
    return onSnapshot(collection(db, 'instructors'), (snapshot) => {
      setInstructors(snapshot.docs.map(doc => doc.data() as Instructor));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'instructors');
    });
  }, []);

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

const LessonsSection = ({ profile }: { profile: UserProfile | null }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, lessonId?: string, lesson?: Lesson, type: 'cancel' | 'delete' } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'weekly'>('list');
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
    duration: 60
  });

  useEffect(() => {
    const unsubLessons = onSnapshot(collection(db, 'lessons'), (snap) => {
      setLessons(snap.docs.map(doc => ({ lessonId: doc.id, ...doc.data() } as Lesson)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'lessons'));

    const unsubInstructors = onSnapshot(collection(db, 'instructors'), (snap) => {
      setInstructors(snap.docs.map(doc => ({ instructorId: doc.id, ...doc.data() } as Instructor)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'instructors'));

    const unsubHorses = onSnapshot(collection(db, 'horses'), (snap) => {
      setHorses(snap.docs.map(doc => ({ horseId: doc.id, ...doc.data() } as Horse)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'horses'));

    return () => {
      unsubLessons();
      unsubInstructors();
      unsubHorses();
    };
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
      const horse = horses.find(h => h.horseId === newLesson.horseId);

      if (editingLessonId) {
        await updateDoc(doc(db, 'lessons', editingLessonId), {
          ...newLesson,
          startTime: Timestamp.fromDate(start),
          endTime: Timestamp.fromDate(end),
          instructorName: instructor?.name || '',
          horseName: horse?.name || '',
        });
      } else {
        await addDoc(collection(db, 'lessons'), {
          ...newLesson,
          startTime: Timestamp.fromDate(start),
          endTime: Timestamp.fromDate(end),
          instructorName: instructor?.name || '',
          horseName: horse?.name || '',
          status: 'scheduled'
        });
      }
      setShowAddModal(false);
      setEditingLessonId(null);
      setNewLesson({ type: 'indywidualna', status: 'scheduled', duration: 60 });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingLessonId ? `lessons/${editingLessonId}` : 'lessons');
    }
  };

  const handleBookLesson = async (lessonId: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        studentId: profile.userId,
        studentName: profile.name,
        status: 'pending' // Changed to pending for instructor confirmation
      });
      
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Nowa prośba o rezerwację',
        message: `${profile.name} chce zarezerwować lekcję.`,
        type: 'lesson',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}`);
    }
  };

  const handleConfirmLesson = async (lesson: Lesson) => {
    if (!lesson.studentId) return;
    try {
      await updateDoc(doc(db, 'lessons', lesson.lessonId), {
        status: 'scheduled'
      });

      await addDoc(collection(db, 'notifications'), {
        userId: lesson.studentId,
        title: 'Rezerwacja zatwierdzona!',
        message: `Twoja rezerwacja na lekcję ${formatLessonTime(lesson.startTime)} została zatwierdzona przez instruktora.`,
        type: 'lesson',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.lessonId}`);
    }
  };

  const handleUpdateHorse = async (lessonId: string, horseId: string) => {
    try {
      const horse = horses.find(h => h.horseId === horseId);
      await updateDoc(doc(db, 'lessons', lessonId), {
        horseId,
        horseName: horse?.name || ''
      });
      setEditingLessonId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}`);
    }
  };

  const handleCancelLesson = async (lesson: Lesson) => {
    try {
      setConfirmModal(null);
      setFeedback(null);
      await updateDoc(doc(db, 'lessons', lesson.lessonId), { status: 'cancelled' });
      
      if (lesson.studentId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: lesson.studentId,
            title: 'Lekcja odwołana',
            message: `Twoja lekcja ${formatLessonTime(lesson.startTime)} została odwołana przez klub.`,
            type: 'lesson',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        } catch (nErr) {
          console.error('Notification failed:', nErr);
        }
      }
      setFeedback({ type: 'success', msg: 'Lekcja została odwołana.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Cancel lesson error:', err);
      setFeedback({ type: 'error', msg: 'Błąd podczas odwoływania lekcji. Sprawdź uprawnienia.' });
      setTimeout(() => setFeedback(null), 5000);
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
      console.error('Delete lesson error:', err);
      setFeedback({ type: 'error', msg: 'Błąd podczas usuwania. Tylko administrator może usuwać.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'instructor';
  
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
      status: lesson.status
    });
    setShowAddModal(true);
  };

  const groupedLessons = useMemo(() => {
    const groups: { [key: string]: Lesson[] } = {};
    lessons.sort((a,b) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0)).forEach(lesson => {
      const date = lesson.startTime?.toDate ? lesson.startTime.toDate() : new Date(lesson.startTime?.seconds ? lesson.startTime.seconds * 1000 : 0);
      const dateKey = date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(lesson);
    });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [lessons]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary italic leading-tight">Grafik i Rezerwacje</h2>
          <p className="text-[10px] text-text-muted mt-2 uppercase font-bold tracking-[0.2em] opacity-60">Przeglądaj kalendarz i planuj treningi</p>
        </div>
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold shadow-lg ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
            >
              {feedback.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${confirmModal.type === 'cancel' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                  {confirmModal.type === 'cancel' ? <AlertTriangle size={32} /> : <Trash2 size={32} />}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">Potwierdź operację</h3>
                <p className="text-xs text-text-muted mb-8 leading-relaxed">{confirmModal.title}</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (confirmModal.type === 'cancel' && confirmModal.lesson) {
                        handleCancelLesson(confirmModal.lesson);
                      } else if (confirmModal.type === 'delete' && confirmModal.lessonId) {
                        handleDeleteLesson(confirmModal.lessonId);
                      }
                    }}
                    className={`w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${confirmModal.type === 'cancel' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {confirmModal.type === 'cancel' ? 'Odwołaj lekcję' : 'Usuń termin'}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {isAdmin && (
            <div className="flex bg-surface p-1 rounded-xl border border-border shadow-sm">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-bg'}`}
              >
                Lista
              </button>
              <button 
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'weekly' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-bg'}`}
              >
                Tygodniowy
              </button>
            </div>
          )}
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
              className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-primary-light transition-all active:scale-95"
            >
              <Plus size={16} /> Dodaj termin
            </button>
          )}
        </div>
      </div>

      {viewMode === 'weekly' ? (
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-border shadow-premium">
             <button 
               onClick={() => {
                 const d = new Date(currentWeekStart);
                 d.setDate(d.getDate() - 7);
                 setCurrentWeekStart(d);
               }}
               className="p-3 bg-bg border border-border rounded-xl text-primary hover:bg-accent hover:text-white hover:border-accent transition-all shadow-sm"
             >
               <ChevronLeft size={20} />
             </button>
             <div className="text-center">
                <h3 className="text-xl font-serif font-bold text-primary italic">
                   {weekDays[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {weekDays[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-1">Przegląd tygodniowy wszystkich instruktorów</p>
             </div>
             <button 
               onClick={() => {
                 const d = new Date(currentWeekStart);
                 d.setDate(d.getDate() + 7);
                 setCurrentWeekStart(d);
               }}
               className="p-3 bg-bg border border-border rounded-xl text-primary hover:bg-accent hover:text-white hover:border-accent transition-all shadow-sm"
             >
               <ChevronRight size={20} />
             </button>
          </div>

          <div className="overflow-x-auto pb-4 custom-scrollbar lg:max-h-[70vh]">
            <table className="w-full border-separate border-spacing-2 min-w-[1200px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 p-4 bg-surface rounded-2xl text-[10px] font-bold uppercase tracking-widest text-accent shadow-sm">Instruktor</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="p-4 bg-surface rounded-2xl text-[10px] font-bold uppercase tracking-widest text-accent shadow-sm">
                      {day.toLocaleDateString('pl-PL', { weekday: 'long' })}<br/>
                      <span className="text-primary opacity-60 font-serif italic text-sm normal-case whitespace-nowrap">{day.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instructors.map(instructor => (
                  <tr key={instructor.instructorId}>
                    <td className="sticky left-0 z-10 p-4 bg-white border border-border rounded-2xl align-top shadow-md min-w-[160px]">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden">
                          {instructor.imageUrl ? (
                            <img src={instructor.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <p className="text-xs font-bold text-primary leading-tight">{instructor.name}</p>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dayLessons = lessons.filter(l => {
                         if (l.instructorId !== instructor.instructorId) return false;
                         const lDate = l.startTime?.toDate ? l.startTime.toDate() : new Date(l.startTime?.seconds ? l.startTime.seconds * 1000 : l.startTime);
                         return lDate.getFullYear() === day.getFullYear() && 
                                lDate.getMonth() === day.getMonth() && 
                                lDate.getDate() === day.getDate();
                      }).sort((a,b) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0));

                      return (
                        <td key={day.toISOString()} className="p-2 bg-bg/20 rounded-2xl align-top min-w-[180px] border border-dashed border-border/40 group/cell hover:bg-bg/40 transition-colors">
                          <div className="space-y-3">
                            {dayLessons.length === 0 ? (
                              <div className="py-8 flex flex-col items-center justify-center opacity-20 group-hover/cell:opacity-40 transition-opacity">
                                <Calendar size={20} />
                                <span className="text-[8px] font-bold uppercase mt-2">Brak zajęć</span>
                              </div>
                            ) : (
                              dayLessons.map(lesson => (
                                <div 
                                  key={lesson.lessonId} 
                                  className={`p-4 rounded-2xl border text-left transition-all ${
                                    lesson.studentId 
                                      ? 'bg-white border-accent shadow-premium ring-1 ring-accent/10' 
                                      : 'bg-white/60 border-border hover:bg-white hover:border-accent/40'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <p className="text-[11px] font-bold text-primary bg-bg px-2 py-0.5 rounded-lg border border-border/50">{formatLessonTime(lesson.startTime)}</p>
                                    {lesson.studentId && (
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter ${
                                        lesson.status === 'cancelled' ? 'bg-gray-400 text-white' : 
                                        lesson.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                                      }`}>
                                        {lesson.status === 'cancelled' ? 'ODW' : lesson.status === 'pending' ? 'OCZ' : 'ZAK'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-text-muted leading-tight mb-2 uppercase tracking-wide">{lesson.type}</p>
                                  
                                  {lesson.studentId ? (
                                    <div className="mt-3 pt-3 border-t border-border/60">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded flex items-center justify-center text-accent bg-accent/10">
                                          <UserIcon size={10} />
                                        </div>
                                        <p className="text-[10px] font-bold text-primary truncate">{lesson.studentName}</p>
                                      </div>
                                      {lesson.horseName && (
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded flex items-center justify-center text-accent bg-bg border border-border">
                                            <Horseshoe size={10} />
                                          </div>
                                          <p className="text-[9px] text-text-muted italic truncate">{lesson.horseName}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-accent font-bold uppercase tracking-widest flex items-center gap-1 opacity-60">
                                      <Plus size={10} /> Wolne
                                    </div>
                                  )}
                                  
                                  {isAdmin && (
                                    <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditLesson(lesson)} title="Edytuj" className="text-primary hover:text-accent p-1"><Edit size={12} /></button>
                                      {(lesson.status === 'scheduled' || lesson.status === 'pending') && (
                                        <button onClick={() => setConfirmModal({ show: true, title: 'Czy na pewno chcesz odwołać ten termin?', lesson, type: 'cancel' })} title="Odwołaj" className="text-orange-400 hover:text-orange-600 p-1"><X size={12} /></button>
                                      )}
                                      <button onClick={() => setConfirmModal({ show: true, title: 'Czy na pewno chcesz trwale usunąć ten termin?', lessonId: lesson.lessonId, type: 'delete' })} title="Usuń" className="text-red-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                    </div>
                                  )}
                                </div>
                              ))
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
      ) : (
        <div className="space-y-12">
        {groupedLessons.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-border rounded-[2rem] shadow-premium">
            <Calendar size={48} className="mx-auto mb-4 text-accent/20" />
            <p className="text-sm text-text-muted italic">Brak dostępnych terminów w grafiku</p>
          </div>
        ) : (
          groupedLessons.map(([dateKey, dayLessons]) => (
            <div key={dateKey} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border/40" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-accent bg-bg px-4 py-1.5 rounded-full border border-border/60">
                  {formatLessonDate(dayLessons[0].startTime)}
                </h3>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dayLessons.map(lesson => (
                  <div key={lesson.lessonId} className="bg-white border border-border rounded-[2rem] p-6 shadow-premium hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 transition-transform group-hover:scale-110 ${lesson.studentId ? 'bg-red-500' : 'bg-green-500'}`} />
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{lesson.type}</p>
                        <p className="text-xl font-serif font-bold text-primary italic leading-none">{formatLessonTime(lesson.startTime)}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        lesson.status === 'cancelled' ? 'bg-gray-400 text-white' :
                        lesson.studentId ? (lesson.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white') : 'bg-primary text-white'
                      }`}>
                        {lesson.status === 'cancelled' ? 'Odwołano' : 
                         lesson.studentId ? (lesson.status === 'pending' ? 'Oczekiwanie' : (lesson.studentId === profile?.userId ? 'Twoja' : 'Zajęte')) : 'Wolne'}
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 text-sm text-primary/80">
                        <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-accent shadow-sm">
                          <UserIcon size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest opacity-60">Instruktor</p>
                          <p className="font-bold text-xs">{lesson.instructorName}</p>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-3 text-sm text-primary/80">
                          <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-accent shadow-sm">
                            <Horseshoe size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest opacity-60">Koń (Kadra)</p>
                            {editingLessonId === lesson.lessonId ? (
                               <div className="flex gap-2 mt-1">
                                  <select 
                                    className="text-[10px] p-1 bg-white border border-border rounded flex-1 outline-none"
                                    defaultValue={lesson.horseId}
                                    onChange={(e) => handleUpdateHorse(lesson.lessonId, e.target.value)}
                                  >
                                     <option value="">Wybierz...</option>
                                     {horses.map(h => <option key={h.horseId} value={h.horseId}>{h.name}</option>)}
                                  </select>
                                  <button onClick={() => setEditingLessonId(null)} className="text-[8px] font-bold uppercase text-text-muted">X</button>
                               </div>
                            ) : (
                              <div className="flex items-center justify-between group/horse">
                                <p className="font-bold text-xs">{lesson.horseName || '—'}</p>
                                <button onClick={() => setEditingLessonId(lesson.lessonId)} className="text-[8px] font-bold uppercase text-accent opacity-0 group-hover/horse:opacity-100 transition-opacity">Edytuj</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {lesson.studentId && (
                        <div className="flex items-center gap-3 text-sm text-primary/80 pt-2 border-t border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-sm">
                            <Users size={14} />
                          </div>
                          <div>
                            <p className="text-[9px] text-accent uppercase font-bold tracking-widest opacity-80">Jeździec</p>
                            <p className="font-bold text-xs">{lesson.studentName === profile?.name ? 'Ty' : lesson.studentName}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!lesson.studentId && profile?.role === 'student' && (
                      <button 
                        onClick={() => handleBookLesson(lesson.lessonId)}
                        className="w-full py-4 bg-accent text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-accent-light transition-all active:scale-95"
                      >
                        Zarezerwuj teraz
                      </button>
                    )}

                    {isAdmin && lesson.status === 'pending' && lesson.studentId && (
                      <button 
                        onClick={() => handleConfirmLesson(lesson)}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-green-500 transition-all active:scale-95 mb-2"
                      >
                        Zatwierdź rezerwację
                      </button>
                    )}

                    {isAdmin && (
                      <div className="flex flex-col gap-2 mt-4">
                        <button 
                          onClick={() => handleEditLesson(lesson)}
                          className="w-full py-2 bg-bg text-primary border border-border rounded-xl font-bold text-[8px] uppercase tracking-[0.3em] hover:border-accent transition-all"
                        >
                          Edytuj termin
                        </button>
                        {(lesson.status === 'scheduled' || lesson.status === 'pending') && (
                          <button 
                            onClick={() => setConfirmModal({ show: true, title: 'Czy na pewno chcesz odwołać ten termin?', lesson, type: 'cancel' })}
                            className="w-full py-2 text-[8px] font-bold uppercase tracking-[0.3em] text-orange-400 hover:text-orange-600 transition-colors"
                          >
                            Odwołaj lekcję
                          </button>
                        )}
                        <button 
                          onClick={() => setConfirmModal({ show: true, title: 'Czy na pewno chcesz trwale usunąć ten termin?', lessonId: lesson.lessonId, type: 'delete' })}
                          className="w-full py-2 text-[8px] font-bold uppercase tracking-[0.3em] text-red-300 hover:text-red-500 transition-colors"
                        >
                          Usuń termin
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    )}

    {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-premium relative overflow-hidden">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-text-muted hover:text-primary transition-colors hover:rotate-90 duration-300">
              <X size={24} />
            </button>
            <h3 className="text-3xl font-serif font-bold text-primary italic mb-8">
              {editingLessonId ? 'Edytuj termin jazdy' : 'Dodaj nowy termin jazdy'}
            </h3>
            <form onSubmit={handleCreateLesson} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Data i godzina</label>
                  <input 
                    type="datetime-local" 
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-sm"
                    onChange={e => setNewLesson({...newLesson, startTime: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Instruktor</label>
                  <select 
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-xs font-bold"
                    onChange={e => setNewLesson({...newLesson, instructorId: e.target.value})}
                    required
                    value={newLesson.instructorId}
                  >
                    <option value="">Wybierz...</option>
                    {instructors.map(i => <option key={i.instructorId} value={i.instructorId}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">Koń (Widoczne tylko dla kadry)</label>
                  <select 
                    className="w-full p-4 bg-bg border border-border rounded-xl outline-none focus:border-accent text-xs font-bold"
                    onChange={e => setNewLesson({...newLesson, horseId: e.target.value})}
                    value={newLesson.horseId}
                  >
                    <option value="">Wybierz...</option>
                    {horses.map(h => <option key={h.horseId} value={h.horseId}>{h.name}</option>)}
                  </select>
                </div>
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
                Opublikuj termin
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const ForumSection = ({ profile }: { profile: UserProfile | null }) => (
  <div className="card bg-surface p-10 rounded-2xl border border-border text-center shadow-sm">
    <MessageSquare size={48} className="mx-auto mb-4 text-accent" />
    <h2 className="text-2xl font-serif font-bold text-primary mb-2">Forum Klubu</h2>
    <p className="text-sm text-text-muted">Forum klubu zostanie przywrócone wkrótce...</p>
  </div>
);

const NewsSection = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNews(snap.docs.map(doc => ({ newsId: doc.id, ...doc.data() } as NewsItem)));
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
                <button className="mt-6 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 group/btn">
                  Czytaj więcej <div className="h-px w-6 bg-primary group-hover/btn:w-10 transition-all" />
                </button>
              </div>
            </motion.article>
          ))
        )}
      </div>
    </div>
  );
};

const GallerySection = () => {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPhotos(snap.docs.map(doc => ({ photoId: doc.id, ...doc.data() } as GalleryItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse">Ładowanie galerii...</div>;

  return (
    <div className="space-y-8 text-center sm:text-left">
      <div>
        <h2 className="text-3xl font-serif font-bold text-primary italic leading-tight">Galeria</h2>
        <p className="text-[10px] text-text-muted mt-2 uppercase font-bold tracking-[0.2em] opacity-60">Nasze wspólne chwile w obiektywie</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-border rounded-[2rem]">
            <ImageIcon size={48} className="mx-auto mb-4 text-accent/20" />
            <p className="text-sm text-text-muted italic">Galeria jest obecnie pusta</p>
          </div>
        ) : (
          photos.map(photo => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={photo.photoId} 
              className="aspect-square rounded-2xl overflow-hidden border border-border shadow-sm group relative cursor-zoom-in"
            >
              <img src={photo.url} alt={photo.description} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-left">
                {photo.description && <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">{photo.description}</p>}
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest mt-1">{photo.category || 'Ogólne'}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const BadgesSection = ({ onSignupClick }: { onSignupClick: () => void }) => (
  <div className="card bg-surface p-10 rounded-2xl border border-border text-center shadow-sm">
    <Trophy size={48} className="mx-auto mb-4 text-accent" />
    <h2 className="text-2xl font-serif font-bold text-primary mb-4">Odznaki Jeździeckie</h2>
    <div className="max-w-md mx-auto space-y-4">
      <p className="text-sm text-text-muted">Zdobywaj ogólnopolskie certyfikaty PZJ pod okiem naszej profesjonalnej kadry.</p>
      <div className="flex flex-col gap-2">
        <button 
          onClick={() => window.open('https://pzj.pl/odznaki-jezdzieckie/', '_blank')}
          className="bg-accent text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-accent-light transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink size={16} /> Arkusze ocen (PZJ)
        </button>
        <button 
          onClick={onSignupClick}
          className="bg-primary text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md hover:opacity-90 transition-all font-serif"
        >
          Zapisz się na przygotowania
        </button>
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
                    <h4 className="font-bold text-primary text-sm">{n.title}</h4>
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

const AdminSection = ({ profile, appSettings }: { profile: UserProfile | null, appSettings: AppSettings | null }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddHorse, setShowAddHorse] = useState(false);
  const [showAddNews, setShowAddNews] = useState(false);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [settingsForm, setSettingsForm] = useState<AppSettings>(appSettings || {
    logoUrl: '',
    clubName: 'KJW',
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
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubHorses = onSnapshot(collection(db, 'horses'), (snap) => {
      setHorses(snap.docs.map(doc => ({ horseId: doc.id, ...doc.data() } as Horse)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'horses'));

    const unsubInstructors = onSnapshot(collection(db, 'instructors'), (snap) => {
      setInstructors(snap.docs.map(doc => ({ instructorId: doc.id, ...doc.data() } as Instructor)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'instructors'));

    const unsubNews = onSnapshot(collection(db, 'news'), (snap) => {
      setNews(snap.docs.map(doc => ({ newsId: doc.id, ...doc.data() } as NewsItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'news'));

    const unsubGallery = onSnapshot(collection(db, 'gallery'), (snap) => {
      setGallery(snap.docs.map(doc => ({ photoId: doc.id, ...doc.data() } as GalleryItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'gallery'));

    return () => {
      unsubUsers();
      unsubHorses();
      unsubInstructors();
      unsubNews();
      unsubGallery();
    };
  }, []);

  const handleDeleteItem = async (collectionName: string, id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten element?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
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

      const instructorData = {
        name: newInstructor.name,
        bio: newInstructor.bio,
        specialties: specialtiesArray,
        imageUrl: newInstructor.imageUrl,
        phoneNumber: newInstructor.phoneNumber,
        whatsapp: newInstructor.whatsapp,
        messenger: newInstructor.messenger,
        email: newInstructor.email
      };

      if (editingInstructorId) {
        await updateDoc(doc(db, 'instructors', editingInstructorId), instructorData);
      } else {
        const docRef = await addDoc(collection(db, 'instructors'), {
          ...instructorData,
          createdAt: serverTimestamp()
        });
        await updateDoc(docRef, { instructorId: docRef.id });
      }

      if (newInstructor.email && profile?.role === 'admin') {
        const userToUpdate = users.find(u => u.email === newInstructor.email);
        if (userToUpdate) {
          await updateDoc(doc(db, 'users', userToUpdate.userId), { role: newInstructor.appRole });
        }
      }

      setNewInstructor({ name: '', bio: '', specialties: '', imageUrl: '', phoneNumber: '', whatsapp: '', messenger: '', email: '', appRole: 'instructor' });
      setShowAddInstructor(false);
      setEditingInstructorId(null);
    } catch (error) { 
      handleFirestoreError(error, OperationType.WRITE, editingInstructorId ? `instructors/${editingInstructorId}` : 'instructors'); 
    }
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-3xl font-serif font-bold text-primary italic">Zarządzanie Klubem</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setEditingHorseId(null); setShowAddHorse(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Koń
            </button>
            <button onClick={() => { setEditingInstructorId(null); setShowAddInstructor(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Instruktor
            </button>
            <button onClick={() => { setEditingNewsId(null); setShowAddNews(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> News
            </button>
            <button onClick={() => { setEditingGalleryId(null); setShowAddGallery(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Fotografia
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold uppercase tracking-widest"
            >
              Ustawienia
            </button>
          </div>
       </div>

       {showAddInstructor && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white border border-border rounded-2xl shadow-xl max-w-2xl">
            <h3 className="text-xl font-serif font-bold text-primary mb-6">{editingInstructorId ? 'Edytuj Instruktora' : 'Nowy Instruktor'}</h3>
<form onSubmit={handleAddInstructor} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Imię i Nazwisko</label>
                    <input type="text" className="w-full p-3 bg-surface border rounded-lg" value={newInstructor.name} onChange={e => setNewInstructor({...newInstructor, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Specjalizacje (po przecinku)</label>
                    <input type="text" placeholder="Skoki, Ujeżdżenie" className="w-full p-3 bg-surface border rounded-lg" value={newInstructor.specialties} onChange={e => setNewInstructor({...newInstructor, specialties: e.target.value})} />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">URL Zdjęcia</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="https://..." className="flex-1 p-3 bg-surface border rounded-lg" value={newInstructor.imageUrl} onChange={e => setNewInstructor({...newInstructor, imageUrl: e.target.value})} />
                    {newInstructor.imageUrl && (
                      <div className="w-12 h-12 rounded-lg border border-border overflow-hidden shrink-0">
                        <img src={newInstructor.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
               </div>

               <div>
                 <label className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Bio / Opis</label>
                 <textarea className="w-full p-3 bg-surface border rounded-lg h-24" value={newInstructor.bio} onChange={e => setNewInstructor({...newInstructor, bio: e.target.value})} />
               </div>

               <div className="p-4 bg-accent/5 rounded-xl border border-accent/20 space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">Uprawnienia i Kontakt (Opcjonalne)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted mb-1 block">E-mail (do nadania dostępu)</label>
                      <input type="email" placeholder="email@uzytkownika.pl" className="w-full p-3 bg-white border rounded-lg text-sm" value={newInstructor.email} onChange={e => setNewInstructor({...newInstructor, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted mb-1 block">Rola w aplikacji</label>
                      <select 
                        className="w-full p-3 bg-white border rounded-lg text-sm"
                        value={newInstructor.appRole}
                        onChange={e => setNewInstructor({...newInstructor, appRole: e.target.value as UserRole})}
                      >
                        <option value="student">Brak (Student)</option>
                        <option value="instructor">Instruktor (Grafik)</option>
                        <option value="admin">Administrator (Pełny)</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2">
                 <input type="text" placeholder="Telefon" className="p-3 bg-surface border rounded-lg text-xs" value={newInstructor.phoneNumber} onChange={e => setNewInstructor({...newInstructor, phoneNumber: e.target.value})} />
                 <input type="text" placeholder="WhatsApp" className="p-3 bg-surface border rounded-lg text-xs" value={newInstructor.whatsapp} onChange={e => setNewInstructor({...newInstructor, whatsapp: e.target.value})} />
                 <input type="text" placeholder="Messenger" className="p-3 bg-surface border rounded-lg text-xs" value={newInstructor.messenger} onChange={e => setNewInstructor({...newInstructor, messenger: e.target.value})} />
               </div>

               <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase text-[10px]">{editingInstructorId ? 'Zapisz zmiany' : 'Dodaj Instruktora'}</button>
                {editingInstructorId && <button type="button" onClick={() => { setEditingInstructorId(null); setShowAddInstructor(false); }} className="w-full py-2 text-[10px] font-bold uppercase opacity-60 mt-4">Anuluj</button>}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-white border border-border rounded-3xl shadow-2xl max-w-xl">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-serif font-bold text-primary italic">
                 {editingGalleryId ? 'Edytuj zdjęcie' : 'Dodaj zdjęcie do galerii'}
               </h3>
               <button onClick={() => setShowAddGallery(false)} className="text-text-muted hover:text-accent transition-colors"><X size={20} /></button>
             </div>
             <form onSubmit={handleAddGallery} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Zdjęcie (URL lub wklej)</label>
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
                    className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-bg group relative overflow-hidden"
                  >
                    {newGallery.url ? (
                      <img src={newGallery.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera size={32} className="mx-auto mb-2 text-text-muted opacity-40" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-60">Przeciągnij lub wklej zdjęcie</p>
                      </div>
                    )}
                  </div>
                  <input type="text" placeholder="Lub podaj URL zdjęcia" className="w-full p-4 mt-4 bg-surface rounded-xl border border-border text-xs" value={newGallery.url} onChange={e => setNewGallery({...newGallery, url: e.target.value})} />
                </div>

                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Opis zdjęcia (Opcjonalnie)</label>
                   <input type="text" className="w-full p-4 bg-surface rounded-xl border border-border" value={newGallery.description} onChange={e => setNewGallery({...newGallery, description: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-5 bg-accent text-white rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] shadow-button hover:bg-accent-light transition-all">
                  {editingGalleryId ? 'Zapisz zmiany' : 'Dodaj do Galerii'}
                </button>
                {editingGalleryId && <button type="button" onClick={() => { setEditingGalleryId(null); setShowAddGallery(false); }} className="w-full py-2 text-[10px] font-bold uppercase opacity-60 mt-2">Anuluj</button>}
             </form>
          </motion.div>
        )}

       {showSettings && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white border border-border rounded-2xl shadow-xl max-w-2xl">
            <h3 className="text-xl font-serif font-bold text-primary mb-6 italic">Konfiguracja KJW</h3>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-2">Logo Klubu (Przeciągnij lub Wklej)</label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent', 'bg-accent/5'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-accent', 'bg-accent/5');
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.includes('image')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setSettingsForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    onPaste={(e) => {
                      const item = e.clipboardData.items[0];
                      if (item?.type.includes('image')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setSettingsForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
                        };
                        reader.readAsDataURL(item.getAsFile()!);
                      }
                    }}
                    className="w-full h-40 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center bg-[#F9F9F9] hover:border-accent transition-all cursor-pointer relative overflow-hidden group mb-4"
                  >
                    {settingsForm.logoUrl ? (
                      <>
                        <img src={settingsForm.logoUrl} alt="Logo Preview" className="h-32 object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">
                          Zmień logo
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Horseshoe size={32} className="mx-auto mb-2 text-text-muted" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Przeciągnij obraz tutaj</p>
                      </div>
                    )}
                  </div>
                  <input 
                     type="text" 
                     placeholder="Lub podaj URL logo" 
                     className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-1 focus:ring-accent outline-none text-xs"
                     value={settingsForm.logoUrl}
                     onChange={e => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-1">Nazwa Klubu</label>
                    <input 
                       type="text" 
                       value={settingsForm.clubName}
                       onChange={e => setSettingsForm({...settingsForm, clubName: e.target.value})}
                       className="w-full p-3 bg-surface rounded-lg border border-border focus:ring-1 focus:ring-accent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-1">Główny Telefon</label>
                    <input 
                       type="text" 
                       value={settingsForm.mainPhone}
                       onChange={e => setSettingsForm({...settingsForm, mainPhone: e.target.value})}
                       className="w-full p-3 bg-surface rounded-lg border border-border focus:ring-1 focus:ring-accent outline-none text-sm"
                    />
                  </div>
               </div>

               <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg">
                  Zapisz ustawienia
               </button>
            </form>
         </motion.div>
       )}

       {showAddHorse && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white border border-border rounded-2xl shadow-xl max-w-md">
            <h3 className="text-xl font-serif font-bold text-primary mb-6">{editingHorseId ? 'Edytuj Konia' : 'Nowy Koń'}</h3>
<form onSubmit={handleAddHorse} className="space-y-4">
               <input type="text" placeholder="Imię konia" className="w-full p-3 bg-surface border rounded-lg" value={newHorse.name} onChange={e => setNewHorse({...newHorse, name: e.target.value})} required />
               <input type="text" placeholder="Numer boksu" className="w-full p-3 bg-surface border rounded-lg" value={newHorse.stableNumber} onChange={e => setNewHorse({...newHorse, stableNumber: e.target.value})} />
               <textarea placeholder="Opis" className="w-full p-3 bg-surface border rounded-lg h-24" value={newHorse.description} onChange={e => setNewHorse({...newHorse, description: e.target.value})} />
               <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold uppercase text-[10px]">{editingHorseId ? 'Zapisz zmiany' : 'Dodaj konia'}</button>
                {editingHorseId && <button type="button" onClick={() => { setEditingHorseId(null); setShowAddHorse(false); }} className="w-full py-2 text-[10px] font-bold uppercase opacity-60">Anuluj</button>}
            </form>
         </motion.div>
       )}

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Konie Management */}
          <div className="bg-white border border-border rounded-[2rem] shadow-premium overflow-hidden">
            <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-center">
              <h3 className="font-serif font-bold text-primary italic">Zarządzaj Końmi</h3>
              <div className="text-[10px] font-bold uppercase text-text-muted opacity-60">Suma: {horses.length}</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4">
              <div className="space-y-3">
                {horses.map(h => (
                  <div key={h.horseId} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border hover:border-accent/40 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-border bg-white flex items-center justify-center text-accent">
                        <Horseshoe size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-primary">{h.name}</div>
                        <div className="text-[10px] text-text-muted italic">Boks: {h.stableNumber || '—'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleUpdateHorseId(h)} className="p-2 text-primary hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                       <button onClick={() => handleDeleteItem('horses', h.horseId)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instruktorzy Management */}
          <div className="bg-white border border-border rounded-[2rem] shadow-premium overflow-hidden">
            <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-center">
              <h3 className="font-serif font-bold text-primary italic">Zarządzaj Instruktorami</h3>
              <div className="text-[10px] font-bold uppercase text-text-muted opacity-60">Suma: {instructors.length}</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4">
              <div className="space-y-3">
                {instructors.map(i => (
                  <div key={i.instructorId} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border hover:border-accent/40 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-border bg-white overflow-hidden shadow-sm">
                        <img src={i.imageUrl || `https://picsum.photos/seed/${i.name}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-primary">{i.name}</div>
                        <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold opacity-60">
                           {Array.isArray(i.specialties) ? i.specialties[0] : (i.specialties as string)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleUpdateInstructorId(i)} className="p-2 text-primary hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                       <button onClick={() => handleDeleteItem('instructors', i.instructorId)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aktualności Management */}
          <div className="bg-white border border-border rounded-[2rem] shadow-premium overflow-hidden">
            <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-center">
              <h3 className="font-serif font-bold text-primary italic">Zarządzaj Aktualnościami</h3>
              <div className="text-[10px] font-bold uppercase text-text-muted opacity-60">Suma: {news.length}</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4">
              <div className="space-y-3">
                {news.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(n => (
                  <div key={n.newsId} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border hover:border-accent/40 transition-all group">
                    <div className="flex-1 min-w-0 pr-4">
                       <div className="font-bold text-sm text-primary truncate">{n.title}</div>
                       <div className="text-[10px] text-text-muted italic">{new Date(n.createdAt).toLocaleDateString('pl-PL')}</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleUpdateNewsId(n)} className="p-2 text-primary hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                       <button onClick={() => handleDeleteItem('news', n.newsId)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Galeria Management */}
          <div className="bg-white border border-border rounded-[2rem] shadow-premium overflow-hidden font-serif">
            <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-center font-sans">
              <h3 className="font-serif font-bold text-primary italic">Zarządzaj Galerią</h3>
              <div className="text-[10px] font-bold uppercase text-text-muted opacity-60">Suma: {gallery.length}</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {gallery.map(g => (
                  <div key={g.photoId} className="aspect-square rounded-xl overflow-hidden border border-border bg-surface relative group">
                    <img src={g.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                       <button onClick={() => handleUpdateGalleryId(g)} className="p-2 bg-white rounded-lg text-primary shadow-lg"><Edit size={14} /></button>
                       <button onClick={() => handleDeleteItem('gallery', g.photoId)} className="p-2 bg-white rounded-lg text-red-500 shadow-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif font-bold text-primary italic">Zarejestrowani Użytkownicy</h3>
            <div className="px-4 py-1.5 bg-bg border border-border rounded-full text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Użytkownicy: {users.length}
            </div>
          </div>
          <div className="bg-white border border-border rounded-[2rem] shadow-premium overflow-hidden overflow-x-auto">
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="bg-primary border-b border-primary">
                      <th className="px-8 py-5 font-bold uppercase tracking-widest text-white text-[10px]">Użytkownik</th>
                      <th className="px-8 py-5 font-bold uppercase tracking-widest text-white text-[10px]">Kontakt</th>
                      <th className="px-8 py-5 font-bold uppercase tracking-widest text-white text-[10px]">Rola / Uprawnienia</th>
                      <th className="px-8 py-5 font-bold uppercase tracking-widest text-white text-[10px] text-right">Zarządzaj</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                   {users.map(u => (
                      <tr key={u.userId} className="hover:bg-bg/80 transition-colors group">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-xl bg-bg border border-border flex items-center justify-center text-primary font-bold shadow-sm">
                                  {u.name.charAt(0)}
                               </div>
                               <div>
                                  <div className="font-bold text-sm text-primary group-hover:text-accent transition-colors">{u.name}</div>
                                  <div className="text-[10px] text-text-muted italic opacity-70 group-hover:opacity-100">{u.email}</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="text-[11px] font-medium text-primary/80">{u.phoneNumber || '—'}</div>
                            {u.messengerLink && (
                               <div className="flex items-center gap-1 mt-1 text-blue-500 font-bold uppercase text-[8px] tracking-tighter">
                                  <Check size={10} /> Messenger
                               </div>
                            )}
                         </td>
                         <td className="px-8 py-5">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest ${
                               u.role === 'admin' ? 'bg-red-600 text-white shadow-sm' : 
                               u.role === 'instructor' ? 'bg-blue-600 text-white shadow-sm' : 
                               'bg-bg text-text-muted border border-border'
                            }`}>
                               {u.role === 'admin' ? 'Administrator' : u.role === 'instructor' ? 'Instruktor' : 'Klubowicz'}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => handleUpdateUserRole(u.userId, 'instructor')}
                                 className="px-3 py-1.5 bg-white border border-border rounded-xl text-[9px] font-bold uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all"
                               >
                                 Instruktor
                               </button>
                               <button 
                                 onClick={() => handleUpdateUserRole(u.userId, 'admin')}
                                 className="px-3 py-1.5 bg-white border border-border rounded-xl text-[9px] font-bold uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all"
                               >
                                 Admin
                               </button>
                               <button 
                                 onClick={() => handleUpdateUserRole(u.userId, 'student')}
                                 className="px-3 py-1.5 bg-white border border-border rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-bg transition-all"
                               >
                                 Reset
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
