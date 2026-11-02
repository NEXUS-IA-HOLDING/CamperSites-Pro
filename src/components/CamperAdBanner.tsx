/**
 * CamperAdBanner.tsx - Banner Publicitario Táctico para Usuarios del Plan Gratuito
 * CamperSites Pro (YRYS)
 * 
 * Muestra patrocinios automotrices y de autocaravanas de alta calidad (Ferrys Baleària,
 * Seguros IATI, GLP, Paneles Solares) generando ingresos continuos.
 * Desaparece automáticamente para usuarios Pro / Premium.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { adMobService, CamperSponsoredAd } from '../services/AdMobService';

interface CamperAdBannerProps {
  placement?: 'bottom_bar' | 'feed' | 'modal';
  onPressAd?: () => void;
}

export const CamperAdBanner: React.FC<CamperAdBannerProps> = ({
  placement = 'feed',
  onPressAd,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState<CamperSponsoredAd | null>(null);

  useEffect(() => {
    checkAdEligibility();
  }, []);

  const checkAdEligibility = async () => {
    const shouldShow = await adMobService.shouldShowAds();
    if (shouldShow) {
      const ad = adMobService.getNextSponsoredAd();
      setCurrentAd(ad);
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  const handlePressAd = () => {
    if (!currentAd) return;
    adMobService.recordAdClick(currentAd);
    onPressAd?.();

    if (currentAd.ctaUrl) {
      Linking.openURL(currentAd.ctaUrl).catch(() => {});
    }
  };

  if (!visible || !currentAd) return null;

  return (
    <View style={[styles.container, placement === 'bottom_bar' && styles.bottomBarContainer]}>
      <TouchableOpacity
        style={[styles.adCard, { borderColor: currentAd.accentColor + '40' }]}
        activeOpacity={0.88}
        onPress={handlePressAd}>
        <View style={styles.headerRow}>
          <View style={[styles.badgePill, { backgroundColor: currentAd.accentColor + '20' }]}>
            <Text style={[styles.badgeText, { color: currentAd.accentColor }]}>
              {currentAd.badgeText}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.hideInfoBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setVisible(false)}>
            <Icon name="close" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.bodyRow}>
          <View style={[styles.iconBox, { backgroundColor: currentAd.accentColor + '18' }]}>
            <Icon name={currentAd.iconName} size={24} color={currentAd.accentColor} />
          </View>

          <View style={styles.textBox}>
            <Text style={styles.adTitle} numberOfLines={1}>
              {currentAd.title}
            </Text>
            <Text style={styles.adTagline} numberOfLines={2}>
              {currentAd.tagline}
            </Text>
          </View>

          <View style={[styles.ctaBtn, { backgroundColor: currentAd.accentColor }]}>
            <Text style={styles.ctaText}>{currentAd.ctaText}</Text>
            <Icon name="open-in-new" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginVertical: 8,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 84 : 76,
    left: 0,
    right: 0,
    zIndex: 90,
    marginHorizontal: 14,
    marginVertical: 0,
  },
  adCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  hideInfoBtn: {
    padding: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBox: {
    flex: 1,
  },
  adTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  adTagline: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 13,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default CamperAdBanner;
