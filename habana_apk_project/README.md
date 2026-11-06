# HABANA Tablet - Aplicación Nativa Android (APK)

Aplicación nativa ligera para tabletas y dispositivos murales con modo inmersivo de pantalla completa (Kiosk Mode), aceleración de hardware WebGL y conmutación automática de conexión (Failover Local / Cloudflare).

## 📦 Ubicación del APK Compilado
- **Fichero compilado listo para instalar**: `F:\Habana Tablet APK\habana-tablet.apk` (o `app\build\outputs\apk\release\app-release.apk`)
- **Tamaño**: ~373 KB (Ultra-ligero, sin dependencias externas pesadas)

## 🌐 URLs de Acceso Integradas en la APK
1. **Red Local (LAN - 0ms latencia)**: `https://192.168.1.139:5175/?tablet=true`
2. **Acceso Remoto (Túnel Cloudflare)**: `https://drunk-break-civil-cornell.trycloudflare.com/?tablet=true`
   - *Failover automático*: Si la tableta sale de la red WiFi de casa, la APK conmuta automáticamente a la URL de Cloudflare en menos de 2 segundos.
   - *Bypass SSL*: Acepta certificados locales autofirmados sin mostrar alertas de seguridad.
   - *Permisos Automáticos*: Micrófono y altavoz concedidos automáticamente para Lola (TTS y voz).
   - *Keep Screen On*: Mantiene la pantalla encendida para uso continuo en soporte de pared.

## 🚀 Cómo Instalar en la Tableta

### Método 1: Descarga directa desde el navegador de la tableta
1. Abre Chrome en la tableta.
2. Entra en cualquiera de estos enlaces:
   - Desde fuera de casa: `https://drunk-break-civil-cornell.trycloudflare.com/habana-tablet.apk`
   - Desde casa (WiFi): `https://192.168.1.139:5175/habana-tablet.apk`
3. Acepta la descarga y pulsa **Instalar**.

### Método 2: Instalación por USB (ADB)
```powershell
adb install -r "F:\Habana Tablet APK\habana-tablet.apk"
```

## 🛠️ Recompilación
Para recompilar la APK en cualquier momento:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location "F:\Habana Tablet APK"
.\gradlew.bat assembleRelease
```
