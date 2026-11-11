/**
 * AffiliatePartnersModal.tsx
 * Centro de Ventajas y Acuerdos de Afiliados Oficiales
 * CamperSites Pro - GLP, Ferries Marítimos y Seguros Camper
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  AFFILIATE_PARTNERS,
  AffiliatePartner,
  affiliatePartnerService,
} from '../services/AffiliatePartnerService';

interface AffiliatePartnersModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AffiliatePartnersModal: React.FC<AffiliatePartnersModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);

  const filteredPartners =
    selectedCategory === 'all'
      ? AFFILIATE_PARTNERS
      : AFFILIATE_PARTNERS.filter((p) => p.category === selectedCategory);

  const handleCopyPromoCode = (partner: AffiliatePartner) => {
    if (!partner.promoCode) return;
    Clipboard.setString(partner.promoCode);
    affiliatePartnerService.copyPromoCode(partner.promoCode);
    setCopiedPartnerId(partner.id);
    setTimeout(() => {
      setCopiedPartnerId((prev) => (prev === partner.id ? null : prev));
    }, 2500);
  };

  const handleOpenPartner = async (partner: AffiliatePartner) => {
    try {
      await affiliatePartnerService.openPartner(partner);
    } catch {
      Alert.alert(
        'Código Promocional',
        `Código de descuento para ${partner.brandName}: ${partner.promoCode || ''}`
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🚐 Ventajas & Descuentos de Afiliados</Text>
              <Text style={styles.headerSubtitle}>
                Acuerdos exclusivos en GLP, Ferries y Seguros Camper para usuarios Pro
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Categorías */}
          <View style={styles.categoriesBar}>
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
              onPress={() => setSelectedCategory('all')}>
              <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'hosting' && styles.catChipActive]}
              onPress={() => setSelectedCategory('hosting')}>
              <Icon name="server-network" size={14} color={selectedCategory === 'hosting' ? '#000' : '#FFF'} />
              <Text style={[styles.catChipText, selectedCategory === 'hosting' && styles.catChipTextActive]}>
                🌐 Hostinger (20% Dto)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'fuel_lpg' && styles.catChipActive]}
              onPress={() => setSelectedCategory('fuel_lpg')}>
              <Icon name="gas-station" size={14} color={selectedCategory === 'fuel_lpg' ? '#000' : '#FFF'} />
              <Text style={[styles.catChipText, selectedCategory === 'fuel_lpg' && styles.catChipTextActive]}>
                GLP / Repsol / Cepsa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'ferry' && styles.catChipActive]}
              onPress={() => setSelectedCategory('ferry')}>
              <Icon name="ferry" size={14} color={selectedCategory === 'ferry' ? '#000' : '#FFF'} />
              <Text style={[styles.catChipText, selectedCategory === 'ferry' && styles.catChipTextActive]}>
                Ferries
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === 'insurance' && styles.catChipActive]}
              onPress={() => setSelectedCategory('insurance')}>
              <Icon name="shield-check" size={14} color={selectedCategory === 'insurance' ? '#000' : '#FFF'} />
              <Text style={[styles.catChipText, selectedCategory === 'insurance' && styles.catChipTextActive]}>
                Seguros Camper
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Afiliados */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {filteredPartners.map((p) => (
              <View key={p.id} style={styles.card}>
                {p.limitedTimeOffer && (
                  <View style={styles.limitedTimeBanner}>
                    <Icon name="tag-percent-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.limitedTimeText}>
                      20% de Descuento Exclusivo con este Código
                    </Text>
                  </View>
                )}
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: p.accentColor }]}>
                    <Icon name={p.logoIcon} size={26} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.brandRow}>
                      <Text style={styles.brandName}>{p.brandName}</Text>
                      <Text style={styles.badgeTag}>{p.badge}</Text>
                    </View>
                    <Text style={styles.discountSummary}>{p.discountSummary}</Text>
                  </View>
                </View>

                <Text style={styles.cardDesc}>{p.description}</Text>

                <View style={styles.perksList}>
                  {p.perks.map((perk, idx) => (
                    <View key={idx} style={styles.perkRow}>
                      <Icon name="check-circle" size={14} color="#00E676" />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  {p.promoCode && (
                    <TouchableOpacity
                      style={[
                        styles.promoCodeBox,
                        copiedPartnerId === p.id && styles.promoCodeBoxCopied,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleCopyPromoCode(p)}
                      accessibilityRole="button"
                      accessibilityLabel={`Copiar código ${p.promoCode}`}>
                      <View style={styles.promoCodeContent}>
                        <View style={styles.promoCodeHeaderRow}>
                          <Text style={styles.promoCodeLabel}>CÓDIGO:</Text>
                          {copiedPartnerId === p.id && (
                            <Text style={styles.copiedBadgeText}>¡Copiado!</Text>
                          )}
                        </View>
                        <Text style={styles.promoCodeText}>{p.promoCode}</Text>
                      </View>
                      <Icon
                        name={copiedPartnerId === p.id ? 'check-circle' : 'content-copy'}
                        size={16}
                        color={copiedPartnerId === p.id ? '#00E676' : '#94A3B8'}
                        style={styles.promoCopyIcon}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.applyBtn, { backgroundColor: p.accentColor }]}
                    onPress={() => handleOpenPartner(p)}>
                    <Text style={styles.applyBtnText}>Acceder al Descuento</Text>
                    <Icon name="arrow-top-right" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#121820',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  categoriesBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#00E676',
  },
  catChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  catChipTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1A222D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#263445',
  },
  limitedTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  limitedTimeText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  badgeTag: {
    backgroundColor: '#263445',
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountSummary: {
    color: '#FFD600',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  perksList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#263445',
    paddingTop: 8,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  perkText: {
    color: '#CBD5E1',
    fontSize: 11,
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#263445',
    paddingTop: 12,
  },
  promoCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0E14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  promoCodeBoxCopied: {
    borderColor: '#00E676',
    backgroundColor: '#0B2416',
  },
  promoCodeContent: {
    justifyContent: 'center',
  },
  promoCodeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoCodeLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
  },
  copiedBadgeText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 6,
  },
  promoCodeText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  promoCopyIcon: {
    marginLeft: 8,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
