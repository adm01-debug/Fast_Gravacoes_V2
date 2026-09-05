/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  Bell,
  CheckCircle2,
  Share,
  PlusSquare,
  MoreVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { MobileHeader, MobileHeaderSpacer } from "@/components/navigation/MobileHeader";
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallAppPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: WifiOff,
      title: "Funciona Offline",
      description: "Acesse dados e registre produção mesmo sem internet"
    },
    {
      icon: Zap,
      title: "Acesso Rápido",
      description: "Abra direto da tela inicial, como um app nativo"
    },
    {
      icon: Shield,
      title: "Dados Seguros",
      description: "Cache local protegido e sincronização automática"
    },
    {
      icon: Bell,
      title: "Notificações",
      description: "Receba alertas de manutenção e produção em tempo real"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header with back navigation */}
      <MobileHeader title="Instalar App" showBack={true} />
      <MobileHeaderSpacer />

      <div className="p-4 md:p-8">
        <Breadcrumbs className="mb-4" />
        <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Instalar FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</h1>
          <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-70">
            QUALIDADE + VELOCIDADE
          </p>

          {/* Online Status */}
          <Badge
            variant={isOnline ? "default" : "destructive"}
            className="mt-2"
          >
            {isOnline ? (
              <><Wifi className="w-3 h-3 mr-1" /> Online</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
            )}
          </Badge>
        </motion.div>

        {/* Install Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                {isInstalled ? "App Instalado!" : "Instalar Aplicativo"}
              </CardTitle>
              <CardDescription>
                {isInstalled
                  ? "O FAST GRAVAÇÕES já está instalado no seu dispositivo"
                  : "Adicione à sua tela inicial para acesso rápido"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">Instalação Concluída</p>
                    <p className="text-sm text-muted-foreground">
                      Você pode fechar esta página e usar o app pela tela inicial
                    </p>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <Button
                  onClick={handleInstall}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Instalar Agora
                </Button>
              ) : isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Para instalar no iPhone/iPad, siga os passos:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        1
                      </div>
                      <div className="flex items-center gap-2">
                        <Share className="w-5 h-5 text-primary" />
                        <span>Toque no botão <strong>Compartilhar</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        2
                      </div>
                      <div className="flex items-center gap-2">
                        <PlusSquare className="w-5 h-5 text-primary" />
                        <span>Selecione <strong>Adicionar à Tela Inicial</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        3
                      </div>
                      <span>Confirme tocando em <strong>Adicionar</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Para instalar no Android, siga os passos:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        1
                      </div>
                      <div className="flex items-center gap-2">
                        <MoreVertical className="w-5 h-5 text-primary" />
                        <span>Toque no menu <strong>⋮</strong> do navegador</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        2
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        <span>Selecione <strong>Instalar aplicativo</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        3
                      </div>
                      <span>Confirme tocando em <strong>Instalar</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Offline Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Modo Offline</h4>
                  <p className="text-sm text-muted-foreground">
                    Quando instalado, o app armazena dados localmente permitindo que
                    operadores registrem produção mesmo sem conexão. Os dados serão
                    sincronizados automaticamente quando a conexão for restaurada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InstallAppPage;
