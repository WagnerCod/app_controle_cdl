# Guia de Instalação - App Controle CDL

Este documento fornece instruções detalhadas para configurar o ambiente de desenvolvimento e construir o aplicativo.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação do Ambiente](#instalação-do-ambiente)
3. [Configuração do Projeto](#configuração-do-projeto)
4. [Desenvolvimento](#desenvolvimento)
5. [Build para Produção](#build-para-produção)
6. [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### Software Necessário

| Software | Versão Mínima | Link |
|----------|--------------|------|
| Node.js | 18.x | https://nodejs.org/ |
| npm | 8.x | (incluído com Node.js) |
| Ionic CLI | 7.x | `npm install -g @ionic/cli` |
| Cordova | 12.x | `npm install -g cordova` |
| Android Studio | Latest | https://developer.android.com/studio |
| Java JDK | 17 | https://adoptium.net/ |
| Git | 2.x | https://git-scm.com/ |

### Verificar Instalações

```bash
# Verificar versões instaladas
node --version        # Deve ser >= 18.x
npm --version         # Deve ser >= 8.x
ionic --version       # Deve ser >= 7.x
cordova --version     # Deve ser >= 12.x
java -version         # Deve ser >= 17
git --version         # Qualquer versão 2.x
```

## 🛠️ Instalação do Ambiente

### 1. Instalar Node.js e npm

**Windows:**
1. Baixe o instalador em https://nodejs.org/
2. Execute o instalador e siga as instruções
3. Reinicie o terminal

**macOS:**
```bash
# Usando Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Instalar Ionic CLI e Cordova

```bash
npm install -g @ionic/cli cordova
```

### 3. Instalar Android Studio

1. Baixe em https://developer.android.com/studio
2. Execute o instalador
3. Abra o Android Studio e vá em **Tools > SDK Manager**
4. Instale:
   - Android SDK Platform 35 (Android 15)
   - Android SDK Build-Tools 35.0.0
   - Android SDK Command-line Tools
   - Android Emulator

### 4. Configurar Variáveis de Ambiente

**Windows:**
```cmd
# Adicione ao PATH do sistema:
C:\Users\[USERNAME]\AppData\Local\Android\Sdk\platform-tools
C:\Users\[USERNAME]\AppData\Local\Android\Sdk\tools
C:\Users\[USERNAME]\AppData\Local\Android\Sdk\build-tools\35.0.0

# Crie a variável ANDROID_HOME:
ANDROID_HOME=C:\Users\[USERNAME]\AppData\Local\Android\Sdk
```

**macOS/Linux:**
```bash
# Adicione ao ~/.bashrc ou ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/build-tools/35.0.0
```

### 5. Instalar Java JDK

**Windows/macOS/Linux:**
1. Baixe em https://adoptium.net/
2. Instale o JDK 17
3. Configure JAVA_HOME:

```bash
# Windows
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x

# macOS/Linux
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
```

## 📦 Configuração do Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/WagnerCod/app_controle_cdl.git
cd app_controle_cdl
```

### 2. Instalar Dependências

```bash
# Instalar dependências npm
npm install

# Verificar se houve erros
npm audit
```

### 3. Configurar Plataforma Android

```bash
# Adicionar plataforma Android
ionic cordova platform add android

# Verificar requisitos
ionic cordova requirements android
```

## 💻 Desenvolvimento

### Executar no Navegador

```bash
# Modo desenvolvimento com live reload
ionic serve

# Ou
npm start
```

O aplicativo abrirá em http://localhost:8100

### Executar em Dispositivo/Emulador Android

```bash
# Executar em dispositivo conectado
ionic cordova run android

# Executar com live reload
ionic cordova run android -l

# Executar em emulador específico
ionic cordova run android --target=emulator-5554
```

### Debugar

```bash
# Chrome DevTools para Android
# 1. Conecte o dispositivo via USB
# 2. Abra chrome://inspect no Chrome
# 3. Selecione o dispositivo e clique em "Inspect"

# Safari para iOS
# 1. Conecte o iPhone via USB
# 2. Abra Safari > Develop > [Nome do iPhone]
```

## 🏗️ Build para Produção

### Build Android Debug

```bash
# Build para desenvolvimento
ionic cordova build android

# APK será gerado em:
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Android Release

```bash
# 1. Gerar keystore (primeira vez apenas)
keytool -genkey -v -keystore app-controle-cdl.keystore -alias app-cdl -keyalg RSA -keysize 2048 -validity 10000

# 2. Build release
ionic cordova build android --prod --release

# 3. Assinar APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore app-controle-cdl.keystore platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk app-cdl

# 4. Zipalign
zipalign -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk app-controle-cdl.apk
```

### Build Android App Bundle (AAB)

```bash
# Para publicar na Google Play Store
ionic cordova build android --prod --release -- --packageType=bundle

# AAB será gerado em:
# platforms/android/app/build/outputs/bundle/release/app-release.aab
```

## 🔍 Troubleshooting

### Erro: "Command failed: gradle"

**Solução:**
```bash
cd platforms/android
./gradlew clean
cd ../..
ionic cordova build android
```

### Erro: "ANDROID_HOME not set"

**Solução:**
Verifique se a variável de ambiente ANDROID_HOME está configurada corretamente:
```bash
echo $ANDROID_HOME  # macOS/Linux
echo %ANDROID_HOME% # Windows
```

### Erro: "Unable to locate Android SDK"

**Solução:**
1. Abra Android Studio
2. Vá em Tools > SDK Manager
3. Anote o caminho do Android SDK Location
4. Configure ANDROID_HOME com esse caminho

### Erro: "License for package not accepted"

**Solução:**
```bash
# Aceitar todas as licenças
yes | $ANDROID_HOME/tools/bin/sdkmanager --licenses
```

### Erro: "Plugin not found: cordova-plugin-xxx"

**Solução:**
```bash
# Reinstalar plugins
ionic cordova platform rm android
ionic cordova platform add android
```

### Erro de Memória no Build

**Solução:**
Adicione no arquivo `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

### Problemas com Live Reload

**Solução:**
```bash
# Limpar cache
ionic cache clear

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 📱 Testando no Dispositivo Real

### Android

1. **Habilitar Modo Desenvolvedor:**
   - Vá em Configurações > Sobre o telefone
   - Toque 7 vezes em "Número da versão"
   
2. **Habilitar Depuração USB:**
   - Vá em Configurações > Sistema > Opções do desenvolvedor
   - Ative "Depuração USB"

3. **Conectar via USB:**
   ```bash
   # Verificar se dispositivo está conectado
   adb devices
   
   # Executar app
   ionic cordova run android
   ```

## 🔐 Gerando Certificado para Release

```bash
# Gerar keystore
keytool -genkey -v -keystore app-controle-cdl.keystore \
  -alias app-cdl \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Informações a fornecer:
# - Senha do keystore
# - Nome e sobrenome (CN)
# - Unidade organizacional (OU)
# - Organização (O)
# - Cidade (L)
# - Estado (ST)
# - Código do país (C)
```

**IMPORTANTE:** Guarde o keystore e a senha em local seguro!

## 📊 Verificação Pós-Instalação

Execute o checklist abaixo para verificar se tudo está funcionando:

- [ ] `ionic serve` abre o app no navegador
- [ ] `ionic cordova build android` compila sem erros
- [ ] `ionic cordova run android` executa em dispositivo/emulador
- [ ] Login e seleção de contexto funcionam
- [ ] Criação de carga e bipagem de volumes funcionam
- [ ] Indicador de rede aparece corretamente
- [ ] Dados são salvos localmente (verificar no DevTools > Application > Local Storage)

## 📞 Suporte

Se encontrar problemas não cobertos aqui:

1. Verifique os logs: `ionic cordova run android --verbose`
2. Consulte a documentação oficial:
   - Ionic: https://ionicframework.com/docs
   - Cordova: https://cordova.apache.org/docs
3. Abra uma issue no repositório
4. Entre em contato com a equipe de desenvolvimento

---

**Última Atualização:** Novembro 2025
