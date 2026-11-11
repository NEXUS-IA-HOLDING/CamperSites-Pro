/**
 * UpdateService.ts — CamperSites Pro
 * Nexus Studio (Nexus AI Holding)
 *
 * Sistema de Notificación de Actualización OTA Infalible (Doble Canal):
 * 1. Canal Primario sin caché ni rate-limit: GitHub Pages (`version.json?t=...`)
 * 2. Canal Secundario de respaldo: GitHub Releases API (`/releases/latest`)
 */

import { Linking, Alert } from 'react-native';

export interface ReleaseInfo {
  version: string;
  versionCode?: number;
  releaseDate?: string;
  releaseNotes: string;
  downloadUrl: string;
  fallbackUrl?: string;
  mandatory?: boolean;
  sha256?: string;
  sizeBytes?: number;
  isNewer: boolean;
}

export const CURRENT_VERSION = '2.1.0';
export const CURRENT_VERSION_CODE = 5;

const GITHUB_REPO = 'NEXUS-IA-HOLDING/CamperSites-Pro';
const PAGES_VERSION_URL = 'https://nexus-ia-holding.github.io/CamperSites-Pro/version.json';
const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DEFAULT_FALLBACK_URL = 'https://nexus-ia-holding.github.io/CamperSites-Pro/#descarga';

type UpdateListener = (info: ReleaseInfo) => void;

export class UpdateService {
  private static lastReleaseInfo: ReleaseInfo | null = null;
  private static listeners: Set<UpdateListener> = new Set();

  /**
   * Suscribe un listener para recibir notificaciones inmediatas cuando se detecta una actualización
   */
  public static subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    if (this.lastReleaseInfo) {
      listener(this.lastReleaseInfo);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Devuelve la última información de versión comprobada en memoria
   */
  public static getLastReleaseInfo(): ReleaseInfo | null {
    return this.lastReleaseInfo;
  }

  private static notifyListeners(info: ReleaseInfo): void {
    this.lastReleaseInfo = info;
    this.listeners.forEach(listener => {
      try {
        listener(info);
      } catch {
        // Ignore listener errors
      }
    });
  }

  /**
   * Comprueba si hay una versión más reciente disponible consultando primero
   * GitHub Pages (`version.json` sin caché) y como respaldo la API de GitHub Releases.
   */
  public static async checkForUpdate(): Promise<ReleaseInfo | null> {
    let pagesResult: ReleaseInfo | null = null;
    let githubResult: ReleaseInfo | null = null;

    // 1. Canal Primario: GitHub Pages version.json (sin rate-limit y sin caché)
    try {
      const response = await fetch(`${PAGES_VERSION_URL}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const remoteVersion = String(data.version || '').replace(/^v/, '').trim();
        const remoteCode = typeof data.versionCode === 'number' ? data.versionCode : undefined;

        if (remoteVersion) {
          const isNewerBySemver = this.compareVersions(remoteVersion, CURRENT_VERSION) > 0;
          const isNewerByCode =
            typeof remoteCode === 'number' && remoteCode > CURRENT_VERSION_CODE;
          const isNewer = isNewerBySemver || isNewerByCode;

          pagesResult = {
            version: remoteVersion,
            versionCode: remoteCode,
            releaseDate: data.releaseDate,
            releaseNotes:
              data.releaseNotes ||
              'Nueva actualización oficial con mejoras de navegación 3D, radares y estabilidad.',
            downloadUrl: data.downloadUrl || DEFAULT_FALLBACK_URL,
            fallbackUrl: data.fallbackUrl || DEFAULT_FALLBACK_URL,
            mandatory: Boolean(data.mandatory),
            isNewer,
          };

          if (pagesResult.isNewer) {
            this.notifyListeners(pagesResult);
            return pagesResult;
          }
        }
      }
    } catch {
      // Fallthrough al canal secundario si falla la red en el canal primario
    }

    // 2. Canal Secundario: GitHub Releases API
    try {
      const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CamperSites-Pro-App',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const latestTag = String(data.tag_name || '').replace(/^v/, '').trim();
        const body = data.body || '';

        if (latestTag) {
          const apkAsset = Array.isArray(data.assets)
            ? data.assets.find((a: any) => a.name && a.name.endsWith('.apk'))
            : null;

          const downloadUrl =
            apkAsset?.browser_download_url ||
            pagesResult?.downloadUrl ||
            data.html_url ||
            DEFAULT_FALLBACK_URL;

          const isNewer = this.compareVersions(latestTag, CURRENT_VERSION) > 0;

          githubResult = {
            version: latestTag,
            releaseNotes:
              body ||
              pagesResult?.releaseNotes ||
              'Nueva actualización oficial disponible para descarga directa.',
            downloadUrl,
            fallbackUrl: pagesResult?.fallbackUrl || DEFAULT_FALLBACK_URL,
            mandatory: pagesResult?.mandatory ?? true,
            isNewer,
          };

          if (githubResult.isNewer) {
            this.notifyListeners(githubResult);
            return githubResult;
          }
        }
      }
    } catch {
      // Silently fail if offline or network error
    }

    const finalResult = pagesResult || githubResult;
    if (finalResult) {
      this.notifyListeners(finalResult);
    }
    return finalResult;
  }

  /**
   * Abre la descarga directa del APK o la página web de respaldo si falla el enlace
   */
  public static async openUpdateDownload(info: ReleaseInfo): Promise<void> {
    const targetUrl = info.downloadUrl || info.fallbackUrl || DEFAULT_FALLBACK_URL;
    try {
      await Linking.openURL(targetUrl);
    } catch {
      if (info.fallbackUrl && info.fallbackUrl !== targetUrl) {
        await Linking.openURL(info.fallbackUrl).catch(() => {});
      }
    }
  }

  /**
   * Muestra alerta de actualización si existe versión superior (o confirmación en comprobación manual)
   */
  public static async promptIfUpdateAvailable(manualCheck: boolean = false): Promise<void> {
    const info = await this.checkForUpdate();
    if (!info || !info.isNewer) {
      if (manualCheck) {
        Alert.alert(
          '✅ App Actualizada',
          `Tienes instalada la última versión oficial (v${CURRENT_VERSION}).\n\nMotor 3D Look-Ahead, cartografía offline, radares DGT y base de datos de pernocta al día.`
        );
      }
      return;
    }

    Alert.alert(
      `🚀 Actualización Disponible (v${info.version})`,
      `${info.releaseNotes}\n\n¿Deseas descargar e instalar la actualización ahora?`,
      [
        { text: 'Más tarde', style: 'cancel' },
        {
          text: '⬇️ Descargar APK',
          onPress: () => {
            this.openUpdateDownload(info);
          },
        },
      ]
    );
  }

  /**
   * Compara versiones semánticas: devuelve 1 si v1 > v2, -1 si v1 < v2, 0 si son iguales
   */
  public static compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/i, '').split('-')[0];
    const clean2 = v2.replace(/^v/i, '').split('-')[0];
    const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

export default UpdateService;
