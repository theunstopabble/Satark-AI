import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = async (evt: React.MouseEvent) => {
    evt.preventDefault();
    if (!promptInstall) return;

    try {
      // FIX: Handle prompt() Promise and detect user choice
      const result = await promptInstall.prompt();
      console.log("PWA install prompt result:", result);
      // After prompt, hide button if installed
      setSupportsPWA(false);
    } catch (err) {
      console.error("PWA install failed:", err);
    }
  };

  if (!supportsPWA) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-all border border-primary/20"
      title="Install App"
    >
      <Download size={14} /> <span className="hidden sm:inline">Install</span>
    </button>
  );
}
