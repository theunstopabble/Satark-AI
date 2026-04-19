import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "hi";

type Translations = {
  [key: string]: {
    en: string;
    hi: string;
  };
};

const translations: Translations = {
  // Brand
  "brand.name": { en: "Satark AI", hi: "सतर्क AI" },

  // Navbar
  "nav.signin": { en: "Sign In", hi: "लॉग इन करें" },
  "nav.getstarted": { en: "Get Started", hi: "शुरू करें" },
  "nav.newscan": { en: "New Scan", hi: "नया स्कैन" },
  "nav.history": { en: "History", hi: "पुराना इतिहास" },
  "nav.profile": { en: "Profile", hi: "प्रोफाइल" },

  // Dashboard Toggles
  "toggle.detector": { en: "🛡️ Deepfake Detector", hi: "🛡️ डीपफेक डिटेक्टर" },
  "toggle.identity": { en: "🆔 Speaker Identity", hi: "🆔 आवाज़ पहचान" },

  // Deepfake Detector
  "hero.title": { en: "New Analysis", hi: "नई विश्लेषण" },
  "hero.subtitle": {
    en: "Detect deepfakes with advanced spectral processing.",
    hi: "उन्नत स्पेक्ट्रल प्रोसेसिंग के साथ डीपफेक का पता लगाएं।",
  },
  "tab.url": { en: "URL Link", hi: "URL लिंक" },
  "tab.file": { en: "File Upload", hi: "फाइल अपलोड" },
  "label.pasteurl": { en: "Paste Audio URL", hi: "ऑडियो URL पेस्ट करें" },
  "label.uploadfile": { en: "Upload Audio File", hi: "ऑडियो फाइल अपलोड करें" },
  "btn.processing": { en: "Processing Audio...", hi: "प्रोसेसिंग जारी है..." },
  "btn.run": { en: "Run Diagnostics", hi: "जांच शुरू करें" },
  "drag.drop": {
    en: "Drag & drop audio or video here, or click to select",
    hi: "ऑडियो या वीडियो यहाँ खींचें, या चुनने के लिए क्लिक करें",
  },

  // Results
  "result.report": { en: "Analysis Report", hi: "विश्लेषण रिपोर्ट" },
  "result.confidence": { en: "Confidence Score", hi: "विश्वास स्कोर" },
  "result.real": { en: "Real Audio", hi: "असली आवाज़" },
  "result.fake": { en: "Deepfake Detected", hi: "डीपफेक पाया गया" },
  "result.details": { en: "Details", hi: "विवरण" },

  // Speaker Identity
  "si.title": {
    en: "Speaker Identity Verification",
    hi: "वक्ता पहचान सत्यापन",
  },
  "si.subtitle": {
    en: "Enroll voice prints and verify speaker identity using biometrics.",
    hi: "आवाज़ के प्रिंट दर्ज करें और बायोमेट्रिक्स से पहचान सत्यापित करें।",
  },
  "si.mode.enroll": { en: "Enroll New Speaker", hi: "नया वक्ता जोड़ें" },
  "si.mode.verify": { en: "Verify Identity", hi: "पहचान सत्यापित करें" },
  "si.label.name": { en: "Speaker Name", hi: "वक्ता का नाम" },
  "si.btn.enroll": { en: "Enroll Speaker", hi: "वक्ता को जोड़ें" },
  "si.btn.verify": { en: "Verify Speaker", hi: "वक्ता की जाँच करें" },
  "si.result.match": { en: "Identity Match", hi: "पहचान मेल खाई" },
  "si.result.noconfidence": { en: "Low Confidence", hi: "कम विश्वास" },
  "si.result.mismatch": { en: "Identity Mismatch", hi: "पहचान मेल नहीं खाई" },

  // Home/Landing - Hero Section
  "landing.hero.badge": {
    en: "Defend Truth in the Age of AI",
    hi: "AI yug mein satya ki raksha karein",
  },
  "landing.hero.headline1": { en: "Next-Generation ", hi: "Agle Yug ka" },
  "landing.hero.headline2": {
    en: "Deepfake Detection",
    hi: "Deepfake Pehchan",
  },
  "landing.hero.subheading": {
    en: "Advanced audio and image analysis to reveal synthetic media instantly.",
    hi: "Jhutli media ko turant pata lagane ke liye avansd audio aur image analysis.",
  },
  "landing.hero.cta1": { en: "Start Free Scan", hi: "Free Scan Shuru Karein" },
  "landing.hero.cta2": { en: "Watch Demo", hi: "Demo Dekhein" },

  // Home/Landing - Features Section
  "landing.features.title": {
    en: "How Satark Works",
    hi: "Satark Kaise Kaam Karta Hai",
  },
  "landing.features.desc": {
    en: "Our platform combines forensic science with machine learning.",
    hi: "Hamara platform forensic vigyan aur machine learning ko jodta hai.",
  },

  // Home/Landing - Feature Cards
  "landing.feature.spectra.title": {
    en: "Spectral Analysis",
    hi: "Spectral Vishleshan",
  },
  "landing.feature.spectra.desc": {
    en: "Detects hidden artifacts invisible to the human eye.",
    hi: "Insani aankh se chupe chupe artifacts ko pakadta hai.",
  },
  "landing.feature.silence.title": {
    en: "Silence Detection",
    hi: "Chuppan ka Pata",
  },
  "landing.feature.silence.desc": {
    en: "Identifies unnatural gaps and silent spikes typical of TTS models.",
    hi: "TTS models ke mukhya lakshan, ajeeb chuppan ko pehchan ta hai.",
  },
  "landing.feature.fusion.title": {
    en: "Multi-Modal Fusion",
    hi: "Multi-Modular Milan",
  },
  "landing.feature.fusion.desc": {
    en: "Cross-references audio and video streams for higher accuracy.",
    hi: "Behtar accuracy ke liye audio aur video streams ka milapan karta hai.",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
