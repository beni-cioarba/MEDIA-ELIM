// Service worker de OneSignal (web push de la amintire zilnică de Proiectul
// Împreună). Vive en /push/onesignal/ con ese ámbito para no pisar el de la
// app (ngsw, en /). Lo registra el SDK al activar el aviso. Lo copia el build
// (asset de angular.json). docs/ai/32-impreuna.md → Notificaciones.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
