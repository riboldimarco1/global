import { useState, useRef, useCallback, useEffect } from "react";

interface PinchZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export function usePinchZoom(minScale = 1, maxScale = 4) {
  const [state, setState] = useState<PinchZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const initialCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialTranslate = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchEnd = useRef<number>(0);

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches: TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance.current = getDistance(e.touches);
      initialScale.current = state.scale;
      initialCenter.current = getCenter(e.touches);
      initialTranslate.current = { x: state.translateX, y: state.translateY };
    }
  }, [state.scale, state.translateX, state.translateY]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const currentDistance = getDistance(e.touches);
      const currentCenter = getCenter(e.touches);
      
      const scaleFactor = currentDistance / initialDistance.current;
      let newScale = initialScale.current * scaleFactor;
      newScale = Math.min(Math.max(newScale, minScale), maxScale);
      
      const dx = currentCenter.x - initialCenter.current.x;
      const dy = currentCenter.y - initialCenter.current.y;
      
      setState({
        scale: newScale,
        translateX: initialTranslate.current.x + dx,
        translateY: initialTranslate.current.y + dy,
      });
    }
  }, [minScale, maxScale]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd.current < 300 && e.changedTouches.length === 1) {
      setState({
        scale: 1,
        translateX: 0,
        translateY: 0,
      });
    }
    lastTouchEnd.current = now;
  }, []);

  const resetZoom = useCallback(() => {
    setState({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const style: React.CSSProperties = {
    transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
    transformOrigin: "center center",
    touchAction: state.scale > 1 ? "none" : "pan-y",
  };

  return {
    containerRef,
    style,
    scale: state.scale,
    resetZoom,
    isZoomed: state.scale > 1,
  };
}
