/**
 * VehicleCatalogModal.tsx
 * Selector de Vehículo desde Catálogo Oficial con Ajustes Manuales y Recomendaciones Autodoc / Amazon
 * CamperSites Pro — Nexus AI Holding
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  vehicleCatalogService,
  VEHICLE_CATALOG,
  VehicleModelItem,
  UserVehicleSetup,
  VehicleRecambioAutodoc,
  VehicleGadgetAmazon,
} from '../services/VehicleCatalogService';
import { CamperValhallaRoutingService } from '../services/CamperValhallaRoutingService';
import { Logger } from '../utils/logger';

interface Props {
  visible: boolean;
  onClose: () => void;
  onVehicleSaved?: (setup: UserVehicleSetup) => void;
}

type ModalTab = 'catalogo' | 'ajustes' | 'recambios' | 'gadgets';

export const VehicleCatalogModal: React.FC<Props> = ({ visible, onClose, onVehicleSaved }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Vehículo seleccionado / en edición
  const [currentSetup, setCurrentSetup] = useState<UserVehicleSetup>({
    brand: 'Fiat',
    model: 'Ducato L2H2 Gran Volumen',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    height: 2.52,
    width: 2.05,
    length: 5.41,
    weight: 3.5,
    fuelType: 'diesel',
    displacementCc: 2184,
    horsepower: 140,
    avgConsumptionL100km: 8.9,
    tankCapacityL: 90,
    environmentalBadge: 'C',
    hasSolarPanels: false,
    hasRoofRack: false,
    hasBikeRack: false,
    hasTowBar: false,
    hasAirConditioner: false,
  });

  const [recambios, setRecambios] = useState<VehicleRecambioAutodoc[]>([]);
  const [gadgets, setGadgets] = useState<VehicleGadgetAmazon[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  const loadInitialData = async () => {
    const saved = await vehicleCatalogService.loadUserVehicleSetup();
    setCurrentSetup(saved);
    setRecambios(vehicleCatalogService.getRecommendedRecambios(saved));
    setGadgets(vehicleCatalogService.getRecommendedGadgets(saved));
  };

  const handleSelectModel = (model: VehicleModelItem) => {
    // Calcular altura y longitud con accesorios preexistentes
    let extraH = 0;
    let extraL = 0;
    if (currentSetup.hasRoofRack) extraH += 0.15;
    if (currentSetup.hasAirConditioner) extraH += 0.22;
    if (currentSetup.hasSolarPanels) extraH += 0.08;
    if (currentSetup.hasBikeRack) extraL += 0.65;
    if (currentSetup.hasTowBar) extraL += 0.25;

    const newSetup: UserVehicleSetup = {
      ...currentSetup,
      catalogId: model.id,
      brand: model.brand,
      model: model.model,
      category: model.category,
      chassisBase: model.chassisBase,
      height: Number((model.dimensions.height + extraH).toFixed(2)),
      width: model.dimensions.width,
      length: Number((model.dimensions.length + extraL).toFixed(2)),
      weight: model.dimensions.weight,
      fuelType: model.engine.fuelType,
      displacementCc: model.engine.displacementCc,
      horsepower: model.engine.horsepower,
      avgConsumptionL100km: model.engine.avgConsumptionL100km,
      tankCapacityL: model.engine.tankCapacityL,
      environmentalBadge: model.engine.environmentalBadge,
    };

    setCurrentSetup(newSetup);
    setRecambios(vehicleCatalogService.getRecommendedRecambios(newSetup));
    setGadgets(vehicleCatalogService.getRecommendedGadgets(newSetup));

    Alert.alert(
      'Modelo Seleccionado',
      `Se han aplicado las medidas y motorización de ${model.brand} ${model.model}.\n\nPuedes personalizar las medidas si llevas accesorios instalados en la pestaña "Medidas".`,
      [{ text: 'Entendido', onPress: () => setActiveTab('ajustes') }]
    );
  };

  const toggleAccessory = (key: 'hasSolarPanels' | 'hasRoofRack' | 'hasBikeRack' | 'hasTowBar' | 'hasAirConditioner', deltaHeight: number, deltaLength: number) => {
    const wasActive = !!currentSetup[key];
    const newActive = !wasActive;

    const hDiff = newActive ? deltaHeight : -deltaHeight;
    const lDiff = newActive ? deltaLength : -deltaLength;

    setCurrentSetup((prev) => ({
      ...prev,
      [key]: newActive,
      height: Math.max(1.5, Number((prev.height + hDiff).toFixed(2))),
      length: Math.max(3.0, Number((prev.length + lDiff).toFixed(2))),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await vehicleCatalogService.saveUserVehicleSetup(currentSetup);

      // Sincronizar de inmediato con el motor de rutas Valhalla
      await CamperValhallaRoutingService.saveVehicleDimensions({
        height: saved.height,
        width: saved.width,
        length: saved.length,
        weight: saved.weight,
        excludeTolls: false,
      });

      Alert.alert(
        'Vehículo Guardado',
        `Ficha técnica actualizada:\n• Altura: ${saved.height} m\n• Anchura: ${saved.width} m\n• Longitud: ${saved.length} m\n• Peso MMA: ${saved.weight} t\n• Motor: ${saved.displacementCc}cc (${saved.horsepower} CV) - ${saved.avgConsumptionL100km} L/100km\n\nEl navegador calculará rutas y consumo adaptados exactamente a tu vehículo.`
      );

      if (onVehicleSaved) {
        onVehicleSaved(saved);
      }
      onClose();
    } catch (err) {
      Logger.error('VehicleCatalogModal', 'Error al guardar vehículo', err);
      Alert.alert('Error', 'No se pudo guardar la configuración del vehículo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAffiliateLink = async (url: string, title: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Enlace', `Abriendo enlace de ${title}...`);
      }
    } catch (e) {
      Logger.error('VehicleCatalogModal', 'Error abriendo enlace', e);
    }
  };

  const filteredModels = vehicleCatalogService.searchModels(searchQuery).filter((item) => {
    if (!selectedBrand) return true;
    return item.brand.toLowerCase() === selectedBrand.toLowerCase();
  });

  const brands = vehicleCatalogService.getBrands();
  const tripEstimate500km = vehicleCatalogService.calculateTripFuelEstimate(500, 1.48, currentSetup);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>🚐 Mi Vehículo & Motorización</Text>
              <Text style={styles.subtitle}>
                {currentSetup.brand} {currentSetup.model} • {currentSetup.horsepower} CV
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Selector de Pestañas */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'catalogo' && styles.tabBtnActive]}
              onPress={() => setActiveTab('catalogo')}>
              <Icon name="book-open-page-variant" size={16} color={activeTab === 'catalogo' ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, activeTab === 'catalogo' && styles.tabBtnTextActive]}>Catálogo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ajustes' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ajustes')}>
              <Icon name="tune-vertical" size={16} color={activeTab === 'ajustes' ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, activeTab === 'ajustes' && styles.tabBtnTextActive]}>Medidas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'recambios' && styles.tabBtnActive]}
              onPress={() => setActiveTab('recambios')}>
              <Icon name="wrench" size={16} color={activeTab === 'recambios' ? '#10B981' : '#94A3B8'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, activeTab === 'recambios' && { color: '#10B981', fontWeight: '800' }]}>Autodoc</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'gadgets' && styles.tabBtnActive]}
              onPress={() => setActiveTab('gadgets')}>
              <Icon name="storefront-outline" size={16} color={activeTab === 'gadgets' ? '#FBBF24' : '#94A3B8'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabBtnText, activeTab === 'gadgets' && { color: '#FBBF24', fontWeight: '800' }]}>Gadgets</Text>
            </TouchableOpacity>
          </View>

          {/* CONTENIDO DE PESTAÑAS */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. CATÁLOGO DE MODELOS */}
            {activeTab === 'catalogo' && (
              <View>
                {/* Buscador */}
                <View style={styles.searchBox}>
                  <Icon name="magnify" size={20} color="#38BDF8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por modelo (Ducato, California, Benimar, Sprinter...)"
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Icon name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Filtro por marca */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.brandChip, selectedBrand === null && styles.brandChipActive]}
                    onPress={() => setSelectedBrand(null)}>
                    <Text style={[styles.brandChipText, selectedBrand === null && styles.brandChipTextActive]}>Todas</Text>
                  </TouchableOpacity>
                  {brands.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.brandChip, selectedBrand === b && styles.brandChipActive]}
                      onPress={() => setSelectedBrand(selectedBrand === b ? null : b)}>
                      <Text style={[styles.brandChipText, selectedBrand === b && styles.brandChipTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Listado de modelos */}
                {filteredModels.map((item) => {
                  const isSelected = currentSetup.catalogId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modelCard, isSelected && styles.modelCardSelected]}
                      activeOpacity={0.85}
                      onPress={() => handleSelectModel(item)}>
                      <View style={styles.modelHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.modelBrand}>{item.brand}</Text>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{item.category.replace('_', ' ').toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.modelTitle}>{item.model}</Text>
                          <Text style={styles.modelGeneration}>{item.generation}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.activeCheckBadge}>
                            <Icon name="check" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </View>

                      {/* Medidas y motor */}
                      <View style={styles.specsRow}>
                        <View style={styles.specItem}>
                          <Icon name="arrow-up-down" size={14} color="#38BDF8" style={{ marginRight: 3 }} />
                          <Text style={styles.specValue}>{item.dimensions.height}m alto</Text>
                        </View>
                        <View style={styles.specItem}>
                          <Icon name="arrow-left-right" size={14} color="#38BDF8" style={{ marginRight: 3 }} />
                          <Text style={styles.specValue}>{item.dimensions.length}m largo</Text>
                        </View>
                        <View style={styles.specItem}>
                          <Icon name="engine-outline" size={14} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.specValue}>{item.engine.horsepower} CV</Text>
                        </View>
                        <View style={styles.specItem}>
                          <Icon name="gas-station-outline" size={14} color="#FBBF24" style={{ marginRight: 3 }} />
                          <Text style={styles.specValue}>{item.engine.avgConsumptionL100km} L</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 2. MEDIDAS Y AJUSTES MANUALES */}
            {activeTab === 'ajustes' && (
              <View>
                <Text style={styles.sectionHeader}>📏 Dimensiones Reales para Gálibo y Altura</Text>
                <Text style={styles.sectionNotice}>
                  Puedes retocar manualmente cualquier medida. Valhalla evitará túneles y puentes inferiores a la altura indicada.
                </Text>

                {/* Controles numéricos de dimensiones */}
                <View style={styles.dimensionInputsGrid}>
                  {/* Altura */}
                  <View style={styles.dimInputCard}>
                    <Text style={styles.dimLabel}>ALTURA TOTAL</Text>
                    <View style={styles.dimRowControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, height: Math.max(1.5, Number((p.height - 0.05).toFixed(2))) }))}>
                        <Icon name="minus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.dimNumberText}>{currentSetup.height.toFixed(2)} m</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, height: Number((p.height + 0.05).toFixed(2)) }))}>
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Longitud */}
                  <View style={styles.dimInputCard}>
                    <Text style={styles.dimLabel}>LONGITUD TOTAL</Text>
                    <View style={styles.dimRowControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, length: Math.max(3.0, Number((p.length - 0.1).toFixed(2))) }))}>
                        <Icon name="minus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.dimNumberText}>{currentSetup.length.toFixed(2)} m</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, length: Number((p.length + 0.1).toFixed(2)) }))}>
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Anchura */}
                  <View style={styles.dimInputCard}>
                    <Text style={styles.dimLabel}>ANCHURA (CON RETROVISORES)</Text>
                    <View style={styles.dimRowControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, width: Math.max(1.5, Number((p.width - 0.05).toFixed(2))) }))}>
                        <Icon name="minus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.dimNumberText}>{currentSetup.width.toFixed(2)} m</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, width: Number((p.width + 0.05).toFixed(2)) }))}>
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Peso */}
                  <View style={styles.dimInputCard}>
                    <Text style={styles.dimLabel}>PESO MMA MÁXIMO</Text>
                    <View style={styles.dimRowControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, weight: Math.max(1.5, Number((p.weight - 0.1).toFixed(1))) }))}>
                        <Icon name="minus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.dimNumberText}>{currentSetup.weight.toFixed(1)} t</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setCurrentSetup((p) => ({ ...p, weight: Number((p.weight + 0.1).toFixed(1)) }))}>
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Accesorios que suman altura / longitud */}
                <Text style={[styles.sectionHeader, { marginTop: 16 }]}>⚙️ Accesorios Instalados (Suman Gálibo Automático)</Text>
                <View style={styles.accessoriesGrid}>
                  <TouchableOpacity
                    style={[styles.accessoryChip, currentSetup.hasSolarPanels && styles.accessoryChipActive]}
                    onPress={() => toggleAccessory('hasSolarPanels', 0.08, 0)}>
                    <Icon name="white-balance-sunny" size={16} color={currentSetup.hasSolarPanels ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.accessoryChipText, currentSetup.hasSolarPanels && styles.accessoryChipTextActive]}>
                      Placas Solares (+8 cm)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.accessoryChip, currentSetup.hasAirConditioner && styles.accessoryChipActive]}
                    onPress={() => toggleAccessory('hasAirConditioner', 0.22, 0)}>
                    <Icon name="snowflake" size={16} color={currentSetup.hasAirConditioner ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.accessoryChipText, currentSetup.hasAirConditioner && styles.accessoryChipTextActive]}>
                      Climatizador Techo (+22 cm)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.accessoryChip, currentSetup.hasBikeRack && styles.accessoryChipActive]}
                    onPress={() => toggleAccessory('hasBikeRack', 0, 0.65)}>
                    <Icon name="bicycle" size={16} color={currentSetup.hasBikeRack ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.accessoryChipText, currentSetup.hasBikeRack && styles.accessoryChipTextActive]}>
                      Portabicis (+65 cm)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.accessoryChip, currentSetup.hasRoofRack && styles.accessoryChipActive]}
                    onPress={() => toggleAccessory('hasRoofRack', 0.15, 0)}>
                    <Icon name="truck-cargo-container" size={16} color={currentSetup.hasRoofRack ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.accessoryChipText, currentSetup.hasRoofRack && styles.accessoryChipTextActive]}>
                      Baca de Techo (+15 cm)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Motor y Consumo */}
                <Text style={[styles.sectionHeader, { marginTop: 18 }]}>⛽ Motor y Consumo de Combustible</Text>
                <View style={styles.engineCard}>
                  <View style={styles.engineRow}>
                    <Text style={styles.engineLabel}>Potencia Motor:</Text>
                    <Text style={styles.engineVal}>{currentSetup.horsepower} CV ({currentSetup.displacementCc} cc)</Text>
                  </View>
                  <View style={styles.engineRow}>
                    <Text style={styles.engineLabel}>Consumo Medio Teórico:</Text>
                    <Text style={styles.engineVal}>{currentSetup.avgConsumptionL100km} L / 100km</Text>
                  </View>
                  <View style={styles.engineRow}>
                    <Text style={styles.engineLabel}>Estimación Etapa 500 km:</Text>
                    <Text style={[styles.engineVal, { color: '#10B981' }]}>
                      {tripEstimate500km.estimatedLitres} L (~{tripEstimate500km.estimatedCostEur} €)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 3. RECAMBIOS CON AUTODOC */}
            {activeTab === 'recambios' && (
              <View>
                <View style={styles.affiliateBanner}>
                  <Icon name="shield-check" size={24} color="#10B981" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.affiliateTitle}>Recambios Homologados en Autodoc</Text>
                    <Text style={styles.affiliateDesc}>
                      Piezas OEM compatibles con el chasis {currentSetup.brand} {currentSetup.model}.
                    </Text>
                  </View>
                </View>

                {recambios.map((rec) => (
                  <View key={rec.id} style={styles.recambioCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.recambioName}>{rec.name}</Text>
                      <Text style={styles.recambioDesc}>{rec.description}</Text>
                      <Text style={styles.recambioPrice}>Aprox. {rec.approxPriceEur.toFixed(2)} €</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.buyBtnAutodoc}
                      onPress={() => handleOpenAffiliateLink(rec.searchUrl, rec.name)}>
                      <Icon name="cart-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.buyBtnText}>Ver en Autodoc</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* 4. GADGETS CON AMAZON */}
            {activeTab === 'gadgets' && (
              <View>
                <View style={[styles.affiliateBanner, { borderColor: 'rgba(251, 191, 36, 0.4)' }]}>
                  <Icon name="star-circle" size={24} color="#FBBF24" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.affiliateTitle, { color: '#FBBF24' }]}>Accesorios Recomendados Amazon</Text>
                    <Text style={styles.affiliateDesc}>
                      Gadgets indispensables a medida para tu cabina y pernocta segura.
                    </Text>
                  </View>
                </View>

                {gadgets.map((gad) => (
                  <View key={gad.id} style={styles.gadgetCard}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      {gad.badge && (
                        <View style={styles.gadgetBadge}>
                          <Text style={styles.gadgetBadgeText}>{gad.badge}</Text>
                        </View>
                      )}
                      <Text style={styles.gadgetName}>{gad.name}</Text>
                      <Text style={styles.gadgetDesc}>{gad.description}</Text>
                      <Text style={styles.gadgetPrice}>Aprox. {gad.approxPriceEur.toFixed(2)} €</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.buyBtnAmazon}
                      onPress={() => handleOpenAffiliateLink(gad.searchUrl, gad.name)}>
                      <Icon name="amazon" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.buyBtnText}>Ver en Amazon</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Botón Guardar Inferior */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSave} disabled={isSaving}>
              <Icon name="content-save-check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>
                {isSaving ? 'Guardando...' : `Guardar Vehículo (${currentSetup.height}m / ${currentSetup.length}m)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  brandChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginRight: 6,
  },
  brandChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  brandChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  brandChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  modelCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: 8,
  },
  modelCardSelected: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: '#38BDF8',
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    marginRight: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  modelGeneration: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  activeCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
    paddingTop: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specValue: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  sectionNotice: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 16,
  },
  dimensionInputsGrid: {
    gap: 8,
  },
  dimInputCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  dimLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  dimRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
  },
  accessoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accessoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  accessoryChipActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderColor: '#38BDF8',
  },
  accessoryChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  accessoryChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  engineCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  engineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  engineLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  engineVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  affiliateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 12,
  },
  affiliateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  affiliateDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  recambioCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recambioName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  recambioDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  recambioPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 4,
  },
  buyBtnAutodoc: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyBtnAmazon: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gadgetCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  gadgetBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  gadgetBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
  gadgetName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gadgetDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  gadgetPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
