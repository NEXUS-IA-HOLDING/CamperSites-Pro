/**
 * LocationReviewsModal - Visualización y Envío de Reseñas de la Comunidad
 * Puntuación (1-5 estrellas), Seguridad, Ruido, Servicios Verificados
 * CamperSites Pro
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LocationReview, LocationReviewStats } from '../types/assistant';
import { ReviewService } from '../services/ReviewService';
import { CamperSitesTheme as theme } from '../theme';

interface LocationReviewsModalProps {
  visible: boolean;
  locationId: string;
  locationName: string;
  onClose: () => void;
  userVehicleType?: string;
}

const AVAILABLE_SERVICES = [
  { key: 'water', label: 'Agua Potable', icon: 'water' },
  { key: 'electricity', label: 'Electricidad', icon: 'power-plug' },
  { key: 'grey_water', label: 'Vaciado Grises', icon: 'cup-water' },
  { key: 'black_water', label: 'Vaciado Negras (WC)', icon: 'toilet' },
  { key: 'truck_parking', label: 'Plazas Camión/Pesado', icon: 'truck' },
  { key: 'adblue', label: 'Surtidor AdBlue', icon: 'gas-station' },
  { key: 'wifi', label: 'WiFi', icon: 'wifi' },
];

export const LocationReviewsModal: React.FC<LocationReviewsModalProps> = ({
  visible,
  locationId,
  locationName,
  onClose,
  userVehicleType = 'camper',
}) => {
  const [reviews, setReviews] = useState<LocationReview[]>([]);
  const [stats, setStats] = useState<LocationReviewStats>({
    totalReviews: 0,
    avgRating: 0,
    safeCount: 0,
    cautionCount: 0,
    unsafeCount: 0,
    quietCount: 0,
    acceptableCount: 0,
    noisyCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formulario de nueva reseña
  const [rating, setRating] = useState<number>(5);
  const [securityLevel, setSecurityLevel] = useState<'safe' | 'caution' | 'unsafe'>('safe');
  const [noiseLevel, setNoiseLevel] = useState<'quiet' | 'acceptable' | 'noisy'>('quiet');
  const [comment, setComment] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>(['water']);

  useEffect(() => {
    if (visible && locationId) {
      loadReviews();
    }
  }, [visible, locationId]);

  const loadReviews = async () => {
    setLoading(true);
    const data = await ReviewService.fetchLocationReviews(locationId);
    setReviews(data);
    setStats(ReviewService.calculateReviewStats(data));
    setLoading(false);
  };

  const toggleService = (serviceKey: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceKey)
        ? prev.filter(s => s !== serviceKey)
        : [...prev, serviceKey]
    );
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      Alert.alert('Comentario requerido', 'Por favor, escribe un breve comentario sobre tu experiencia.');
      return;
    }

    setSubmitting(true);
    const result = await ReviewService.submitReview({
      locationId,
      userId: '',
      userName: '',
      rating,
      securityLevel,
      noiseLevel,
      comment: comment.trim(),
      verifiedServices: selectedServices,
      vehicleTypeUsed: userVehicleType,
    });

    setSubmitting(false);

    if (result.success) {
      Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada y ayuda a toda la comunidad.');
      setShowAddForm(false);
      setComment('');
      loadReviews();
    } else {
      Alert.alert('Error', result.error || 'No se pudo guardar la reseña');
    }
  };

  const renderStars = (count: number, interactive = false, onSelect?: (r: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onSelect && onSelect(star)}>
            <Icon
              name={star <= count ? 'star' : 'star-outline'}
              size={interactive ? 28 : 16}
              color="#FFB300"
              style={{ marginHorizontal: interactive ? 4 : 1 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.locationTitle} numberOfLines={1}>{locationName}</Text>
              <Text style={styles.subtitle}>Opiniones de la Comunidad</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Resumen de Métricas */}
          <View style={styles.summaryCard}>
            <View style={styles.avgBox}>
              <Text style={styles.avgNumber}>
                {stats.totalReviews > 0 ? stats.avgRating : '—'}
              </Text>
              {renderStars(Math.round(stats.avgRating))}
              <Text style={styles.reviewCountText}>{stats.totalReviews} valoraciones</Text>
            </View>

            <View style={styles.badgesSummary}>
              <View style={styles.badgeItem}>
                <Icon name="shield-check" size={16} color="#10B981" />
                <Text style={styles.badgeText}>
                  {stats.safeCount >= stats.cautionCount ? 'Seguro para pernoctar' : 'Precaución'}
                </Text>
              </View>
              <View style={styles.badgeItem}>
                <Icon name="volume-medium" size={16} color="#0EA5E9" />
                <Text style={styles.badgeText}>
                  {stats.quietCount >= stats.noisyCount ? 'Zona silenciosa' : 'Ruidos moderados'}
                </Text>
              </View>
            </View>
          </View>

          {/* Botón Acción para Añadir Reseña */}
          <TouchableOpacity
            style={styles.addReviewToggle}
            onPress={() => setShowAddForm(!showAddForm)}>
            <Icon name={showAddForm ? 'minus-circle' : 'plus-circle'} size={20} color="#FFFFFF" />
            <Text style={styles.addReviewToggleText}>
              {showAddForm ? 'Ocultar formulario' : 'Valorar y opinar sobre este lugar'}
            </Text>
          </TouchableOpacity>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Formulario Desplegable */}
            {showAddForm && (
              <View style={styles.formContainer}>
                <Text style={styles.formSectionTitle}>Tu valoración general</Text>
                <View style={styles.interactiveStars}>
                  {renderStars(rating, true, setRating)}
                </View>

                {/* Nivel de Seguridad */}
                <Text style={styles.fieldLabel}>Seguridad para pernoctar:</Text>
                <View style={styles.radioGroup}>
                  {[
                    { key: 'safe', label: '🛡️ Seguro', color: '#10B981' },
                    { key: 'caution', label: '⚠️ Precaución', color: '#F59E0B' },
                    { key: 'unsafe', label: '⛔ Inseguro', color: '#EF4444' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.radioOption,
                        securityLevel === option.key && { borderColor: option.color, backgroundColor: option.color + '15' },
                      ]}
                      onPress={() => setSecurityLevel(option.key as any)}>
                      <Text style={[styles.radioText, securityLevel === option.key && { color: option.color, fontWeight: '700' }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Nivel de Ruido */}
                <Text style={styles.fieldLabel}>Nivel de ruido nocturno:</Text>
                <View style={styles.radioGroup}>
                  {[
                    { key: 'quiet', label: '🤫 Silencioso', color: '#10B981' },
                    { key: 'acceptable', label: '🔊 Aceptable', color: '#0EA5E9' },
                    { key: 'noisy', label: '📢 Ruidoso', color: '#EF4444' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.radioOption,
                        noiseLevel === option.key && { borderColor: option.color, backgroundColor: option.color + '15' },
                      ]}
                      onPress={() => setNoiseLevel(option.key as any)}>
                      <Text style={[styles.radioText, noiseLevel === option.key && { color: option.color, fontWeight: '700' }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Servicios Comprobados */}
                <Text style={styles.fieldLabel}>Servicios que has comprobado:</Text>
                <View style={styles.chipsRow}>
                  {AVAILABLE_SERVICES.map(srv => {
                    const isSelected = selectedServices.includes(srv.key);
                    return (
                      <TouchableOpacity
                        key={srv.key}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => toggleService(srv.key)}>
                        <Icon name={srv.icon} size={14} color={isSelected ? '#FFFFFF' : '#475569'} />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {srv.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Comentario de Texto */}
                <Text style={styles.fieldLabel}>Tu experiencia / detalles útiles:</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Ej: Pernocta muy tranquila, fuentes funcionando, suelo nivelado y buena sombra..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.btnDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Publicar reseña</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Listado de Reseñas */}
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary.main} style={{ marginTop: 24 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="comment-text-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Aún no hay reseñas</Text>
                <Text style={styles.emptySubtitle}>Sé el primero en opinar sobre este punto.</Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.reviewAuthorBox}>
                      <Text style={styles.reviewerName}>{rev.userName}</Text>
                      <View style={styles.vehiclePill}>
                        <Icon name="caravan" size={12} color="#0284C7" />
                        <Text style={styles.vehiclePillText}>{rev.vehicleTypeUsed}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewDateBox}>
                      {renderStars(rev.rating)}
                      <Text style={styles.reviewDate}>
                        {new Date(rev.createdAt).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                  </View>

                  {/* Badges de seguridad y ruido */}
                  <View style={styles.reviewBadgesRow}>
                    <View style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>
                        {rev.securityLevel === 'safe' ? '🛡️ Seguro' : rev.securityLevel === 'caution' ? '⚠️ Precaución' : '⛔ Inseguro'}
                      </Text>
                    </View>
                    <View style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>
                        {rev.noiseLevel === 'quiet' ? '🤫 Silencioso' : rev.noiseLevel === 'acceptable' ? '🔊 Aceptable' : '📢 Ruidoso'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reviewComment}>{rev.comment}</Text>

                  {/* Servicios verificados por este usuario */}
                  {rev.verifiedServices && rev.verifiedServices.length > 0 && (
                    <View style={styles.servicesVerifiedRow}>
                      {rev.verifiedServices.map((srvKey) => {
                        const srvObj = AVAILABLE_SERVICES.find(s => s.key === srvKey);
                        return (
                          <View key={srvKey} style={styles.verifiedTag}>
                            <Icon name="check" size={12} color="#16A34A" />
                            <Text style={styles.verifiedTagText}>{srvObj?.label || srvKey}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 10,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avgBox: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  avgNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  reviewCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  badgesSummary: {
    flex: 1,
    paddingLeft: 16,
    gap: 6,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  addReviewToggle: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addReviewToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  contentScroll: {
    maxHeight: 460,
  },
  formContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  interactiveStars: {
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  radioText: {
    fontSize: 11,
    color: '#475569',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  chipActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  chipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewAuthorBox: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
  },
  vehiclePillText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
  },
  reviewDateBox: {
    alignItems: 'flex-end',
  },
  reviewDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  miniBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reviewComment: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 4,
  },
  servicesVerifiedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedTagText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
  },
});
