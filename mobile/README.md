# App GhostScale (iPhone e Android)

App nativo que abre o painel da GhostScale e recebe as notificações de venda
**com o som de venda escolhido no painel, mesmo com o app fechado** (o app
instalado pelo navegador só consegue o som padrão do celular).

- Os 6 sons de venda vão dentro do app (`assets/sounds`).
- O servidor manda o push pela Expo com `sound: "<som>.wav"` (iPhone) e
  `channelId: "venda_<som>"` (Android, um canal por som).
- Ao abrir o painel logado, o app registra o aparelho em `/api/push/native`.

## O que você precisa

1. Conta grátis em https://expo.dev
2. iPhone: conta Apple Developer (US$ 99/ano) — https://developer.apple.com/programs/
3. Android: conta Google Play Console (US$ 25, uma vez) — só para publicar na loja.
   Para testar no Android não precisa: dá para instalar o APK direto.
4. Um computador com Node.js 20+.

## Primeira vez

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init        # cria o projeto na Expo e preenche o projectId
```

## Testar no Android (sem loja)

```bash
npx eas-cli@latest build -p android --profile preview
```

No fim a Expo mostra um link/QR Code do APK. Abra no celular e instale.

Para as notificações no Android, a Expo pede a chave do Firebase (FCM v1).
Siga o passo a passo do comando abaixo, opção "Google Service Account Key":

```bash
npx eas-cli@latest credentials -p android
```

## iPhone (TestFlight / App Store)

```bash
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios
```

A Expo pede o login da conta Apple Developer e cria sozinha os certificados e a
chave de notificação (APNs). Depois do envio, o app aparece no TestFlight para
você instalar e testar; em seguida é só mandar para revisão da App Store.

## Como testar o som

1. Abra o app, entre na sua conta e aceite as notificações.
2. No sino 🔔, escolha o som de venda.
3. Feche o app e use "Enviar venda de teste" (ou gere um Pix de teste).
