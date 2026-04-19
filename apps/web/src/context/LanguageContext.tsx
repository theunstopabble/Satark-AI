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
    en: "Advanced Deepfake Detection System",
    hi: "उन्नत डीपफेक सेंसिंग प्रणाली",
  },
  "landing.hero.headline1": {
    en: "Defending Truth in the",
    hi: "जनरेटिव AI के इस युग में",
  },
  "landing.hero.headline2": {
    en: "Age of Generative AI",
    hi: "सत्य की रक्षा करें",
  },
  "landing.hero.subheading": {
    en: "Detect AI-generated audio with scientifically validated precision.",
    hi: "वैज्ञानिक रूप से मान्यता प्राप्त सटीकता के साथ AI-जनित ऑडियो का पता लगाएं।",
  },
  "landing.hero.cta1": { en: "Start Free Scan", hi: "मुफ्त स्कैन शुरू करें" },
  "landing.hero.cta2": { en: "How it Works", hi: "यह कैसे काम करता है" },

  // Home/Landing - Features Section
  "landing.features.title": {
    en: "How Satark Works",
    hi: "Satark कैसे काम करता है",
  },
  "landing.features.audio": { en: "Audio Forensics", hi: "ऑडियो फोरेंसिक्स" },
  "landing.features.audio.desc": {
    en: "Analyze spectral patterns for hidden artifacts.",
    hi: "छुपे हुए आर्टिफैक्ट्स के लिए स्पेक्ट्रल पैटर्न का विश्लेषण करें।",
  },
  "landing.features.live": { en: "Live Monitoring", hi: "लाइव मॉनिटरिंग" },
  "landing.features.live.desc": {
    en: "Real-time verification during calls and meetings.",
    hi: "कॉलों और मीटिंग्स के दौरान वास्तविक समय में सत्यापन।",
  },
  "landing.features.game": { en: "Deepfake Game", hi: "डीपफेक गेम" },
  "landing.features.game.desc": {
    en: "Test your skills in identifying synthetic media.",
    hi: "सिंथेटिक मीडिया की पहचान करने में अपनी कौशल को परखें।",
  },
  "landing.features.pdf": { en: "Audit Reports", hi: "ऑडिट रिपोर्ट" },
  "landing.features.pdf.desc": {
    en: "Generate detailed forensic PDF certificates.",
    hi: "विस्तृत फोरेंसिक PDF प्रमाणपत्र उत्पन्न करें।",
  },

  // Home/Landing - Trust Signals
  "landing.trust.title": {
    en: "Trusted by Security Professionals",
    hi: "सुरक्षा पेशेवरों द्वारा भरोसेमंद",
  },
  "landing.trust.files": { en: "Files Analyzed", hi: "फ़ाइलों का विश्लेषण" },
  "landing.trust.uptime": { en: "Uptime Guarantee", hi: "अपटाइम वारंटी" },
  "landing.trust.orgs": { en: "Organizations", hi: "संगठन" },

  // Home/Landing - Footer
  "landing.footer.rights": {
    en: "All rights reserved.",
    hi: "सर्वाधिकार सुरक्षित हैं।",
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
