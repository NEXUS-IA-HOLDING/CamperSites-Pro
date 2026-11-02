/**
 * UpdateService.ts — CamperSites Pro
 * Nexus Studio (Nexus AI Holding)
 * 
 * In-app update checker for direct APK distribution.
 * Queries GitHub Releases API to notify users whenever a new version is released.
 */

import { Linking, Alert } from 'react-native';

export interface ReleaseInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  isNewer: boolean;
}

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'NEXUS-IA-HOLDING/CamperSites-Pro';
const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export class UpdateService {
  /**
   * Checks if a newer version is available on GitHub Releases
   */
  public static async checkForUpdate(): Promise<ReleaseInfo | null> {
    try {
      const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CamperSites-Pro-App',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const latestTag = (data.tag_name || '').replace(/^v/, '');
      const body = data.body || '';

      // Find APK download asset
      const apkAsset = Array.isArray(data.assets)
        ? data.assets.find((a: any) => a.name && a.name.endsWith('.apk'))
        : null;

      const downloadUrl = apkAsset?.browser_download_url || data.html_url;

      const isNewer = this.compareVersions(latestTag, CURRENT_VERSION) > 0;

      return {
        version: latestTag,
        releaseNotes: body,
        downloadUrl,
        isNewer,
      };
    } catch {
      // Silently fail if offline or network error
      return null;
    }
  }

  /**
   * Prompts the user to update if a newer version exists
   */
  public static async promptIfUpdateAvailable(): Promise<void> {
    const info = await this.checkForUpdate();
    if (!info || !info.isNewer) return;

    Alert.alert(
      `🚀 Actualización Disponible (v${info.version})`,
      `Hay una nueva versión de CamperSites Pro con mejoras en cartografía, radares y estabilidad.\n\n¿Deseas descargar la actualización ahora?`,
      [
        { text: 'Más tarde', style: 'cancel' },
        {
          text: 'Descargar e Instalar',
          onPress: () => {
            if (info.downloadUrl) {
              Linking.openURL(info.downloadUrl);
            }
          },
        },
      ]
    );
  }

  /**
   * Helper to compare semantic versions: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0);

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
