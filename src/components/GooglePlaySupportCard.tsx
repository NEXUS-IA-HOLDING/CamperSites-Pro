/**
 * GooglePlaySupportCard.tsx — CamperSites Pro
 * Nexus Studio (Nexus AI Holding)
 * 
 * Community Crowdfunding & Supporter card for Google Play Developer account fee.
 * Transparently engages the campervan community to fund store fees via donations,
 * sharing, and IATI insurance affiliate revenue.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { affiliatePartnerService } from '../services/AffiliatePartnerService';

interface GooglePlaySupportCardProps {
  onOpenIati?: () => void;
}

export const GooglePlaySupportCard: React.FC<GooglePlaySupportCardProps> = ({
  onOpenIati,
}) => {
  const [copiedBizum, setCopiedBizum] = useState(false);

  const GOAL_EUROS = 25;
  const CURRENT_EUROS = 5; // Starting seed
  const progressPercent = Math.min(100, Math.round((CURRENT_EUROS / GOAL_EUROS) * 100));

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'CamperSites Pro — La App GPS Definitiva para Campers',
        message:
          '🚐 ¡Hola! Te recomiendo CamperSites Pro: mapas 100% offline, avisador de radares DGT, sensor de viento para toldo y +517.000 spots en Europa.\n\nDescarga gratis directa en: https://nexus-ia-holding.github.io/CamperSites-Pro/',
      });
    } catch {}
  };

  const handleOpenCoffee = () => {
    // Direct link to holding donation / support or PayPal
    const supportUrl = 'https://nexus-ia-holding.github.io/CamperSites-Pro/#instalacion';
    Linking.openURL(supportUrl).catch(() => {
      Alert.alert(
        '☕ Apoyo Comunitario',
        'Puedes apoyar el proyecto compartiendo la app con amigos o contratando tu seguro camper con 5% de descuento en la app.'
      );
    });
  };

  const handleDirectIati = async () => {
    if (onOpenIati) {
      onOpenIati();
      return;
    }
    const partner = affiliatePartnerService.getPartnerById('iati_escapadas_camper');
    if (partner) {
      await affiliatePartnerService.openPartner(partner);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Icon name="google-play" size={20} color="#38BDF8" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.pillRow}>
            <Text style={styles.badgeText}>FONDO COMUNITARIO</Text>
            <Text style={styles.statusPill}>OBJETIVO 25 €</Text>
          </View>
          <Text style={styles.cardTitle}>Llevemos CamperSites Pro a Google Play</Text>
        </View>
      </View>

      {/* Explicación */}
      <Text style={styles.cardDesc}>
        Esta app es de código libre e independiente. Google exige un pago único de 25 $ para publicar en la Play Store oficial. ¡Cualquier café o contratación con descuento nos ayuda a alcanzarlo!
      </Text>

      {/* Barra de Progreso */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressTextCurrent}>
            Recaudado: <Text style={styles.boldText}>{CURRENT_EUROS} €</Text> de {GOAL_EUROS} €
          </Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Botones de Acción */}
      <View style={styles.actionsGrid}>
        {/* Opción 1: Seguro IATI (La que más recauda) */}
        <TouchableOpacity
          style={styles.actionBtnPrimary}
          activeOpacity={0.85}
          onPress={handleDirectIati}>
          <Icon name="shield-check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionBtnPrimaryTitle}>Seguro Camper con 5% Dto.</Text>
            <Text style={styles.actionBtnPrimarySub}>La comisión financia la cuenta</Text>
          </View>
          <Icon name="chevron-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Fila secundaria: Compartir y Café */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            activeOpacity={0.8}
            onPress={handleShareApp}>
            <Icon name="share-variant" size={17} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnSecondaryText}>Compartir App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSecondary}
            activeOpacity={0.8}
            onPress={handleOpenCoffee}>
            <Icon name="coffee" size={17} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnSecondaryText}>Invitar a Café</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'rgba(19, 29, 49, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  statusPill: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 14,
  },
  progressSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTextCurrent: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  boldText: {
    fontWeight: '800',
    color: '#38BDF8',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  actionsGrid: {
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionBtnPrimaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnPrimarySub: {
    fontSize: 10,
    color: '#E0F2FE',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
});

export default GooglePlaySupportCard;
