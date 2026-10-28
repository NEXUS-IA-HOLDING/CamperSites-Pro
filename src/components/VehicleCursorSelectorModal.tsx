/**
 * VehicleCursorSelectorModal - Selector visual de icono de posición en el mapa
 * CamperSites Pro
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VEHICLE_CURSORS, VehicleCursorType } from '../types/assistant';

interface VehicleCursorSelectorModalProps {
  visible: boolean;
  selectedCursor: VehicleCursorType;
  onSelectCursor: (cursor: VehicleCursorType) => void;
  onClose: () => void;
}

export const VehicleCursorSelectorModal: React.FC<VehicleCursorSelectorModalProps> = ({
  visible,
  selectedCursor,
  onSelectCursor,
  onClose,
}) => {
  const cursorKeys = Object.keys(VEHICLE_CURSORS) as VehicleCursorType[];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.touchOutside} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.card}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Icon name="car-settings" size={24} color="#10B981" />
            <Text style={styles.title}>Personalizar Icono en el Mapa</Text>
          </View>
          <Text style={styles.subtitle}>
            Elige el vehículo que representa tu posición con orientación 360° en tiempo real
          </Text>

          <ScrollView contentContainerStyle={styles.grid}>
            {cursorKeys.map(key => {
              const item = VEHICLE_CURSORS[key];
              const isSelected = selectedCursor === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.itemCard,
                    isSelected && { borderColor: item.color, backgroundColor: item.color + '15' },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelectCursor(key);
                    onClose();
                  }}>
                  <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                    <Icon name={item.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.itemLabel, isSelected && { color: item.color, fontWeight: '800' }]}>
                    {item.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.activeCheck}>
                      <Icon name="check" size={14} color="#10B981" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  touchOutside: {
    flex: 1,
  },
  card: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  itemCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  activeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default VehicleCursorSelectorModal;
