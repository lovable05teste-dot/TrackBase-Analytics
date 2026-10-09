import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// App da GhostScale: abre o painel (o mesmo do site) e cuida das notificações
// de venda. A vantagem sobre o app instalado pelo navegador é que o som de
// venda escolhido no painel toca com o app fechado.
const SITE = String(Constants.expoConfig?.extra?.siteUrl || "https://www.ghostscale.com.br").replace(/\/$/, "");
const SITE_HOST = new URL(SITE).host.replace(/^www\./, "");

// Mesmos IDs de lib/sound-prefs.ts do painel. O servidor manda o push com
// sound "<id>.wav" (iOS) e channelId "venda_<id>" (Android).
const SALE_SOUNDS = [
  { id: "fortpay_caixa_registradora", name: "Caixa registradora" },
  { id: "fortpay_moedas_caindo", name: "Moedas caindo" },
  { id: "fortpay_registradora", name: "Registradora" },
  { id: "fortpay_caixa_quiet", name: "Caixa" },
  { id: "fortpay_moeda_meia_coroa", name: "Moeda meia coroa" },
  { id: "fortpay_moeda", name: "Moeda" },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// No Android 8+ o som é do canal, e um canal não muda de som depois de criado:
// por isso um canal por som.
async function createAndroidChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("vendas", {
    name: "Vendas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 100, 300],
  });
  for (const s of SALE_SOUNDS) {
    await Notifications.setNotificationChannelAsync(`venda_${s.id}`, {
      name: `Vendas · ${s.name}`,
      importance: Notifications.AndroidImportance.MAX,
      sound: `${s.id}.wav`,
      vibrationPattern: [0, 300, 100, 300],
    });
  }
}

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

function isInternal(url: string) {
  try {
    const host = new URL(url).host.replace(/^www\./, "");
    return host === SITE_HOST;
  } catch {
    return true;
  }
}

function urlFromResponse(response: Notifications.NotificationResponse | null | undefined) {
  const path = response?.notification.request.content.data?.url;
  return typeof path === "string" && path.startsWith("/") ? `${SITE}${path}` : null;
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const tokenRef = useRef<string | null>(null);
  const canGoBack = useRef(false);
  const [startUrl] = useState(`${SITE}/`);
  const [failed, setFailed] = useState(false);
  const lastResponse = Notifications.useLastNotificationResponse();

  // Registra o aparelho na conta logada. Roda a cada página carregada: antes
  // do login dá 401 e é ignorado; depois do login o aparelho fica salvo.
  const registerDevice = useCallback(() => {
    const token = tokenRef.current;
    if (!token) return;
    const body = JSON.stringify({ token, platform: Platform.OS });
    webRef.current?.injectJavaScript(`fetch("/api/push/native",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:${JSON.stringify(body)}}).catch(function(){});true;`);
  }, []);

  useEffect(() => {
    createAndroidChannels()
      .then(getPushToken)
      .then((token) => {
        tokenRef.current = token;
        registerDevice();
      })
      .catch(() => {});
  }, [registerDevice]);

  // Tocar na notificação abre a tela certa (ex.: Vendas).
  useEffect(() => {
    const url = urlFromResponse(lastResponse);
    if (url) webRef.current?.injectJavaScript(`window.location.href=${JSON.stringify(url)};true;`);
  }, [lastResponse]);

  // Botão voltar do Android navega dentro do painel.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Links de fora (Meta, gateways, WhatsApp) abrem no navegador do celular.
  const onShouldStart = (req: { url: string }) => {
    if (req.url.startsWith("about:") || req.url.startsWith("blob:") || req.url.startsWith("data:")) return true;
    if (isInternal(req.url)) return true;
    Linking.openURL(req.url).catch(() => {});
    return false;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <StatusBar style="light" />
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.title}>Sem conexão</Text>
            <Text style={styles.text}>Verifique a internet e tente de novo.</Text>
            <Pressable style={styles.button} onPress={() => { setFailed(false); webRef.current?.reload(); }}>
              <Text style={styles.buttonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: startUrl }}
            style={styles.web}
            originWhitelist={["https://*", "http://*"]}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.center, StyleSheet.absoluteFill]}>
                <ActivityIndicator color="#60a5fa" size="large" />
              </View>
            )}
            applicationNameForUserAgent="GhostScaleApp/1.0"
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={(nav: WebViewNavigation) => { canGoBack.current = nav.canGoBack; }}
            onLoadEnd={registerDevice}
            onError={() => setFailed(true)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0f1a" },
  web: { flex: 1, backgroundColor: "#0b0f1a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0b0f1a" },
  title: { color: "#f4f2f3", fontSize: 18, fontWeight: "700" },
  text: { color: "#a7a5af", marginTop: 8, textAlign: "center" },
  button: { marginTop: 20, backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
