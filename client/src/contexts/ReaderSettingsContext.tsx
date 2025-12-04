import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

export type FontFamily = 'sans' | 'serif' | 'mono';

interface ReaderSettings {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
}

interface ReaderSettingsContextType extends ReaderSettings {
  updateSettings: (settings: Partial<ReaderSettings>) => void;
}

const ReaderSettingsContext = createContext<
  ReaderSettingsContextType | undefined
>(undefined);

const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 1.6,
};

export function ReaderSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('readerSettings');
    return saved
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));

    // Inject CSS variables
    const root = document.documentElement;
    root.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
    root.style.setProperty(
      '--reader-line-height',
      settings.lineHeight.toString(),
    );

    let family = 'Inter, system-ui, sans-serif';
    if (settings.fontFamily === 'serif')
      family = 'Merriweather, Georgia, serif';
    if (settings.fontFamily === 'mono') family = 'Fira Code, monospace';
    root.style.setProperty('--reader-font-family', family);
  }, [settings]);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <ReaderSettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  const context = useContext(ReaderSettingsContext);
  if (context === undefined) {
    throw new Error(
      'useReaderSettings must be used within a ReaderSettingsProvider',
    );
  }
  return context;
}
