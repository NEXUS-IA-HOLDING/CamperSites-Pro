import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * COMPONENTE: Confirmación Control Policial
 * Se muestra al pasar por un control
 * Timer de 40 segundos para confirmar
 */

interface ControlConfirmationProps {
  control: {
    id: string;
    latitude: number;
    longitude: number;
  };
  onConfirm: (stillActive: boolean) => void;
  onDismiss: () => void;
}

export const ControlConfirmation: React.FC<ControlConfirmationProps> = ({
  control,
  onConfirm,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(40);
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    // Animación entrada
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleConfirm = (stillActive: boolean) => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onConfirm(stillActive);
    });
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}>
      <View style={styles.header}>
        <Icon name="shield-alert" size={24} color="#FF6F00" />
        <Text style={styles.title}>Control Policial</Text>
        <TouchableOpacity onPress={handleDismiss}>
          <Icon name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.question}>¿El control sigue activo?</Text>

      <View style={styles.timer}>
        <Icon name="timer-sand" size={20} color="#FF6F00" />
        <Text style={styles.timerText}>{timeLeft}s</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.buttonNo]}
          onPress={() => handleConfirm(false)}>
          <Icon name="close-circle" size={20} color="#FFF" />
          <Text style={styles.buttonText}>No, ya no está</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonYes]}
          onPress={() => handleConfirm(true)}>
          <Icon name="check-circle" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Sí, sigue ahí</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.thanks}>
        Gracias por ayudar a la comunidad 🙏
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 150,
    width: 320,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
    marginLeft: 10,
  },
  question: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 15,
    textAlign: 'center',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginLeft: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonNo: {
    backgroundColor: '#4CAF50',
  },
  buttonYes: {
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  thanks: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ControlConfirmation;
