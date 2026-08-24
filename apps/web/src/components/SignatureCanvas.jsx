import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Button } from 'antd';

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 200;

const getFallbackType = (event) => (event.type.startsWith('mouse') ? 'mouse' : 'touch');

const SignatureCanvas = forwardRef(({ width, height, penColor = '#000', lineWidth = 2, hideClearButton = false }, ref) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const activeInputRef = useRef(null);

  const resolvedWidth = typeof width === 'number' ? width : DEFAULT_WIDTH;
  const resolvedHeight = typeof height === 'number' ? height : DEFAULT_HEIGHT;
  const widthStyle = width ? (typeof width === 'number' ? `${width}px` : width) : `${resolvedWidth}px`;
  const heightStyle = height ? (typeof height === 'number' ? `${height}px` : height) : `${resolvedHeight}px`;

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  const ensureCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const widthPx = Math.max(rect.width, 1);
    const heightPx = Math.max(rect.height, 1);

    if (canvas.width !== Math.round(widthPx)) {
      canvas.width = Math.round(widthPx);
    }
    if (canvas.height !== Math.round(heightPx)) {
      canvas.height = Math.round(heightPx);
    }
  }, []);

  const bypassedElementsRef = useRef(new Map());

  const applyOverlayBypass = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof document.elementsFromPoint !== 'function') return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const stack = document.elementsFromPoint(centerX, centerY);

    for (const element of stack) {
      if (element === canvas || canvas.contains(element)) {
        break;
      }
      if (
        element instanceof HTMLElement &&
        element !== document.body &&
        element !== document.documentElement
      ) {
        if (!bypassedElementsRef.current.has(element)) {
          bypassedElementsRef.current.set(element, element.style.pointerEvents);
          element.dataset.signatureCanvasBypass = 'true';
        }
        element.style.pointerEvents = 'none';
      }
    }
  }, []);

  const restoreOverlayBypass = useCallback(() => {
    bypassedElementsRef.current.forEach((prevValue, element) => {
      if (!element.isConnected) return;
      if (prevValue) {
        element.style.pointerEvents = prevValue;
      } else {
        element.style.removeProperty('pointer-events');
      }
      delete element.dataset.signatureCanvasBypass;
    });
    bypassedElementsRef.current.clear();
  }, []);

  const getPoint = useCallback(
    (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      ensureCanvasSize();

      const rect = canvas.getBoundingClientRect();
      const pointer = event.touches ? event.touches[0] : event;
      const rectWidth = rect.width || canvas.offsetWidth || canvas.width || 1;
      const rectHeight = rect.height || canvas.offsetHeight || canvas.height || 1;
      const left = rect.left || canvas.offsetLeft || 0;
      const top = rect.top || canvas.offsetTop || 0;
      const scaleX = rectWidth ? canvas.width / rectWidth : 1;
      const scaleY = rectHeight ? canvas.height / rectHeight : 1;

      const x = (pointer.clientX - left) * scaleX;
      const y = (pointer.clientY - top) * scaleY;

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      return { x, y };
    },
    [ensureCanvasSize],
  );

  const drawLine = useCallback(
    (point) => {
      const context = getContext();
      if (!context || !point) return;

      const lastPoint = lastPointRef.current ?? point;
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      lastPointRef.current = point;
    },
    [getContext],
  );

  const startDrawing = useCallback(
    (event, inputType) => {
      if (activeInputRef.current && activeInputRef.current !== inputType) {
        drawingRef.current = false;
      }
      if (event?.cancelable) {
        event.preventDefault();
      }
      applyOverlayBypass();
      const point = getPoint(event);
      if (!point) return;
      drawingRef.current = true;
      activeInputRef.current = inputType;
      lastPointRef.current = point;
    },
    [applyOverlayBypass, getPoint],
  );

  const moveDrawing = useCallback(
    (event, inputType) => {
      if (!drawingRef.current) return;
      if (activeInputRef.current && activeInputRef.current !== inputType) return;
      if (event?.cancelable) {
        event.preventDefault();
      }
      drawLine(getPoint(event));
    },
    [drawLine, getPoint],
  );

  const endDrawing = useCallback(
    (event, inputType) => {
      if (inputType && activeInputRef.current && activeInputRef.current !== inputType) {
        return;
      }
      if (event?.cancelable) {
        event.preventDefault();
      }
      drawingRef.current = false;
      activeInputRef.current = null;
      lastPointRef.current = null;
      restoreOverlayBypass();
    },
    [restoreOverlayBypass],
  );

  const clearCanvas = useCallback(() => {
    ensureCanvasSize();
    const context = getContext();
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
      drawingRef.current = false;
      activeInputRef.current = null;
      lastPointRef.current = null;
      restoreOverlayBypass();
  }, [ensureCanvasSize, getContext]);

  const isCanvasEmpty = useCallback(() => {
    const context = getContext();
    const canvas = canvasRef.current;
    if (!context || !canvas) return true;

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        return false;
      }
    }
    return true;
  }, [getContext]);

  useEffect(() => {
    const context = getContext();
    if (!context) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = lineWidth;
    context.strokeStyle = penColor;
  }, [getContext, lineWidth, penColor]);

  useImperativeHandle(ref, () => ({
    getSignature: () => canvasRef.current?.toDataURL('image/png') ?? null,
    isEmpty: isCanvasEmpty,
    clear: clearCanvas,
  }));

  useEffect(() => {
    const handleWindowBlur = () => endDrawing(null);
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        endDrawing(null);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    let rafId = null;
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(() => {
        ensureCanvasSize();
      });
    } else {
      ensureCanvasSize();
    }

    let kickIntervalId = window.setInterval(() => {
      ensureCanvasSize();
      if (canvasRef.current && canvasRef.current.width > 0 && canvasRef.current.height > 0) {
        window.clearInterval(kickIntervalId);
        kickIntervalId = null;
      }
    }, 150);

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
          ensureCanvasSize();
        })
      : null;

    if (resizeObserver && canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (kickIntervalId) {
        window.clearInterval(kickIntervalId);
      }
      restoreOverlayBypass();
    };
  }, [endDrawing, ensureCanvasSize, restoreOverlayBypass]);

  const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

  const handlePointerDown = useCallback(
    (event) => {
      applyOverlayBypass();
      startDrawing(event, 'pointer');
      if (event.pointerId !== undefined) {
        try {
          canvasRef.current?.setPointerCapture?.(event.pointerId);
        } catch (error) {
          console.warn('setPointerCapture failed', error);
        }
      }
    },
    [applyOverlayBypass, startDrawing],
  );

  const handlePointerMove = useCallback(
    (event) => {
      moveDrawing(event, 'pointer');
    },
    [moveDrawing],
  );

  const handlePointerEnd = useCallback(
    (event) => {
      if (event?.pointerId !== undefined) {
        try {
          canvasRef.current?.releasePointerCapture?.(event.pointerId);
        } catch (error) {
          console.warn('releasePointerCapture failed', error);
        }
      }
      endDrawing(event, 'pointer');
    },
    [endDrawing],
  );

  const handleFallbackStart = useCallback(
    (event) => {
      applyOverlayBypass();
      startDrawing(event, getFallbackType(event));
    },
    [applyOverlayBypass, startDrawing],
  );

  const handleFallbackMove = useCallback(
    (event) => {
      moveDrawing(event, getFallbackType(event));
    },
    [moveDrawing],
  );

  const handleFallbackEnd = useCallback(
    (event) => {
      endDrawing(event, getFallbackType(event));
    },
    [endDrawing],
  );

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={resolvedWidth}
        height={resolvedHeight}
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: 2,
          touchAction: 'none',
          display: 'block',
          width: widthStyle,
          height: heightStyle,
          zIndex: 1,
        }}
        onPointerDown={supportsPointerEvents ? handlePointerDown : undefined}
        onPointerMove={supportsPointerEvents ? handlePointerMove : undefined}
        onPointerUp={supportsPointerEvents ? handlePointerEnd : undefined}
        onPointerLeave={supportsPointerEvents ? handlePointerEnd : undefined}
        onPointerCancel={supportsPointerEvents ? handlePointerEnd : undefined}
        onMouseDown={handleFallbackStart}
        onMouseMove={handleFallbackMove}
        onMouseUp={handleFallbackEnd}
        onMouseLeave={handleFallbackEnd}
        onTouchStart={handleFallbackStart}
        onTouchMove={handleFallbackMove}
        onTouchEnd={handleFallbackEnd}
        onTouchCancel={handleFallbackEnd}
      />
      {!hideClearButton && (
        <Button onClick={clearCanvas} style={{ marginTop: 8 }}>
          Bersihkan
        </Button>
      )}
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
