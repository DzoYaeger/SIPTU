import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';
import Animated, { FadeIn, createAnimatedComponent } from 'react-native-reanimated';
import { Button } from './Button';

const { width } = Dimensions.get('window');
const AnimatedView = createAnimatedComponent(View);

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onOK: (signature: string) => void;
  title?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ 
  visible, 
  onClose, 
  onOK,
  title = "Tanda Tangan"
}) => {
  const signatureRef = useRef<any>(null);

  const handleOK = (signature: string) => {
    onOK(signature);
    onClose();
  };

  const handleClear = () => {
    signatureRef.current?.clearCanvas();
  };

  const webStyle = `.m-signature-pad--footer {display: none; margin: 0;}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <AnimatedView
          entering={FadeIn.springify()}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-secondary-200">
            <Text className="text-lg font-bold text-secondary-900">
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Signature Canvas */}
          <View className="p-4">
            <View className="rounded-xl overflow-hidden bg-secondary-50" style={{ height: 300 }}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleOK}
                webStyle={webStyle}
                descriptionText="Tanda tangan di sini"
                minWidth={2}
                maxWidth={4}
                imageType="image/png"
                autoClear={false}
                backgroundColor="#f8fafc"
              />
            </View>

            <TouchableOpacity
              onPress={handleClear}
              className="flex-row items-center justify-center mt-3 py-2"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
              <Text className="ml-2 text-red-500 font-medium">Hapus</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="p-4 border-t border-secondary-200 flex-row gap-3">
            <Button
              title="Batal"
              variant="outline"
              onPress={onClose}
              className="flex-1"
            />
            <Button
              title="Simpan"
              onPress={() => signatureRef.current?.readSignature()}
              className="flex-1"
            />
          </View>
        </AnimatedView>
      </View>
    </Modal>
  );
};

export default SignatureModal;
