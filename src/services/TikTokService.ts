/**
 * TikTokService.ts — CamperSites Pro
 * Nexus Studio (Nexus AI Holding)
 * 
 * Manages TikTok integration, Share Kit intents, viral marketing hashtags,
 * and direct spot / route sharing for camper community engagement.
 */

import { Linking, Platform, Clipboard } from 'react-native';

export interface SpotSharePayload {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
  city?: string;
  country?: string;
  rating?: number;
}

export class TikTokService {
  private static readonly CLIENT_KEY = 'aw8a3ej0odyxs6i5';
  private static readonly OFFICIAL_TIKTOK_PROFILE = 'campersites_oficial_es';

  /**
   * Generates formatted text & hashtags for TikTok
   */
  public static generateViralCaption(spot: SpotSharePayload): string {
    const locName = spot.title || 'Spot Camper Secreto';
    const locationStr = spot.city ? `${spot.city}, ${spot.country || 'Europa'}` : 'España / Europa';
    const coordsStr = `${spot.latitude.toFixed(5)}, ${spot.longitude.toFixed(5)}`;

    return `🚐 Descubierto con CamperSites Pro en ${locName} (${locationStr})! 📍 Coordenadas: ${coordsStr} 🏕️ ¿Te quedarías a pernoctar aquí? #campersites #camperlife #vanlife #autocaravana #pernoctacamper #furgocamper #roadtrip #rutacamper`;
  }

  /**
   * Shares a camper spot to TikTok.
   * Copies formatted description and coordinates to clipboard, then opens TikTok creator.
   */
  public static async shareSpot(spot: SpotSharePayload): Promise<{ success: boolean; message: string }> {
    const caption = this.generateViralCaption(spot);

    // 1. Copy viral caption with coordinates and hashtags to clipboard for instant pasting
    try {
      Clipboard.setString(caption);
    } catch {
      // Continue even if clipboard fails
    }

    // 2. Deep links to TikTok app creator / camera
    const tiktokAppUrl = Platform.select({
      ios: 'tiktok://camera',
      android: 'snssdk1233://camera', // International TikTok package scheme
      default: 'https://www.tiktok.com'
    });

    const fallbackWeb = `https://www.tiktok.com/tag/campersites`;

    try {
      const canOpen = await Linking.canOpenURL(tiktokAppUrl);
      if (canOpen) {
        await Linking.openURL(tiktokAppUrl);
        return {
          success: true,
          message: '¡Texto y coordenadas copiados al portapapeles! Abriendo TikTok para grabar tu vídeo o historia.'
        };
      } else {
        // Try generic android intent or open TikTok profile
        const profileUrl = `https://www.tiktok.com/@${this.OFFICIAL_TIKTOK_PROFILE}`;
        await Linking.openURL(profileUrl);
        return {
          success: true,
          message: '¡Texto copiado al portapapeles! Abriendo TikTok oficial de CamperSites Pro.'
        };
      }
    } catch (err) {
      // Final fallback: web browser
      await Linking.openURL(fallbackWeb);
      return {
        success: true,
        message: '¡Coordenadas copiadas al portapapeles!'
      };
    }
  }

  /**
   * Open the official CamperSites Pro TikTok profile
   */
  public static async openOfficialProfile(): Promise<void> {
    const profileUrl = `https://www.tiktok.com/@${this.OFFICIAL_TIKTOK_PROFILE}`;
    await Linking.openURL(profileUrl);
  }
}

export default TikTokService;
