import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button } from 'antd';
import SignatureCanvas from 'react-signature-canvas';
import './SignatureModal.css';

const MIN_MODAL_WIDTH = 360;
const MAX_MODAL_WIDTH = 720;
const MODAL_HORIZONTAL_PADDING = 48; // default ant modal body padding (24px each side)
const CANVAS_HEIGHT = 220;

function SignatureModal({ open, onCancel, onOk, confirmLoading }) {
  const sigCanvas = useRef(null);
  const [modalWidth, setModalWidth] = useState(() => {
    if (typeof window === 'undefined') return MIN_MODAL_WIDTH;
    return Math.max(
      MIN_MODAL_WIDTH,
      Math.min(MAX_MODAL_WIDTH, window.innerWidth - MODAL_HORIZONTAL_PADDING),
    );
  });

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === 'undefined') return;
      setModalWidth((prev) => {
        const next = Math.max(
          MIN_MODAL_WIDTH,
          Math.min(MAX_MODAL_WIDTH, window.innerWidth - MODAL_HORIZONTAL_PADDING),
        );
        return prev === next ? prev : next;
      });
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  const canvasMetrics = useMemo(() => {
    const width = Math.max(320, modalWidth - MODAL_HORIZONTAL_PADDING);
    return { width, height: CANVAS_HEIGHT };
  }, [modalWidth]);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleOk = () => {
    const canvas = sigCanvas.current;

    if (!canvas || canvas.isEmpty()) {
      alert('Tanda tangan tidak boleh kosong.');
      return;
    }

    let dataUrl = null;

    if (typeof canvas.getCanvas === 'function') {
      dataUrl = canvas.getCanvas().toDataURL('image/png');
    }

    if (!dataUrl) {
      console.error('Tidak dapat mengambil data tanda tangan.');
      return;
    }

    onOk(dataUrl);
  };

  return (
    <Modal
      open={open}
      title="Tanda Tangan"
      width={modalWidth}
      onCancel={onCancel}
      styles={{ body: { paddingTop: 12, paddingBottom: 8 } }}
      footer={[
        <Button key="back" onClick={onCancel}>
          Batal
        </Button>,
        <Button key="clear" onClick={handleClear}>
          Bersihkan
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk} loading={confirmLoading}>
          Simpan
        </Button>,
      ]}
    >
      <div className="signature-canvas-container">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: 'signature-canvas',
            width: canvasMetrics.width,
            height: canvasMetrics.height,
          }}
        />
      </div>
    </Modal>
  );
}

export default SignatureModal;
