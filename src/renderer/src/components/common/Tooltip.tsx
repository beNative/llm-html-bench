import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  children: React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
}

interface PositionCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
  arrowOffset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  description,
  shortcut,
  position = 'top',
  delay = 180,
  disabled = false,
  children,
  className = '',
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<PositionCoords | null>(null);

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    // Viewport dimensions with safe padding
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    const arrowDistance = 8; // Gap between trigger and tooltip

    // Default dimensions if measuring before render
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 160;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 34;

    let targetPlacement = position;

    // 1. Smart Viewport Collision Flip Detection
    if (position === 'top' && triggerRect.top - tooltipHeight - arrowDistance < padding) {
      targetPlacement = 'bottom';
    } else if (position === 'bottom' && triggerRect.bottom + tooltipHeight + arrowDistance > viewportHeight - padding) {
      targetPlacement = 'top';
    } else if (position === 'left' && triggerRect.left - tooltipWidth - arrowDistance < padding) {
      targetPlacement = 'right';
    } else if (position === 'right' && triggerRect.right + tooltipWidth + arrowDistance > viewportWidth - padding) {
      targetPlacement = 'left';
    }

    let top = 0;
    let left = 0;

    // 2. Compute Raw Coordinates based on resolved placement
    if (targetPlacement === 'top') {
      top = triggerRect.top - tooltipHeight - arrowDistance;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (targetPlacement === 'bottom') {
      top = triggerRect.bottom + arrowDistance;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (targetPlacement === 'left') {
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.left - tooltipWidth - arrowDistance;
    } else if (targetPlacement === 'right') {
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.right + arrowDistance;
    }

    // 3. Absolute Viewport Boundary Clamping (Zero Truncation Guarantee)
    const clampedLeft = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
    const clampedTop = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));

    // 4. Calculate relative arrow offset to point exactly at trigger center
    let arrowOffset: number | undefined;
    if (targetPlacement === 'top' || targetPlacement === 'bottom') {
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      arrowOffset = Math.max(12, Math.min(triggerCenterX - clampedLeft, tooltipWidth - 12));
    } else {
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      arrowOffset = Math.max(10, Math.min(triggerCenterY - clampedTop, tooltipHeight - 10));
    }

    setCoords({
      top: clampedTop,
      left: clampedLeft,
      placement: targetPlacement,
      arrowOffset,
    });
  };

  const show = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Re-calculate coordinates whenever visible or resized/scrolled
  useLayoutEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, content, description, shortcut]);

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [isVisible]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Clone child element to attach ref and mouse handlers directly
  const child = React.isValidElement(children) ? children : <span>{children}</span>;
  const triggerElement = React.cloneElement(child as React.ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (child as any).ref;
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && typeof childRef === 'object') {
        childRef.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      if (typeof child.props.onMouseEnter === 'function') child.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      if (typeof child.props.onMouseLeave === 'function') child.props.onMouseLeave(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      if (typeof child.props.onFocus === 'function') child.props.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      if (typeof child.props.onBlur === 'function') child.props.onBlur(e);
    },
  });

  const tooltipPortal =
    isVisible && !disabled && content
      ? ReactDOM.createPortal(
          <div
            ref={tooltipRef}
            className={`smart-tooltip-portal smart-tooltip-${coords?.placement || position} ${className}`}
            style={{
              position: 'fixed',
              top: coords ? `${coords.top}px` : '-9999px',
              left: coords ? `${coords.left}px` : '-9999px',
              zIndex: 999999,
              pointerEvents: 'none',
              ...style,
            }}
            role="tooltip"
          >
            <div className="smart-tooltip-inner">
              <div className="smart-tooltip-main">
                <span className="smart-tooltip-text">{content}</span>
                {shortcut && <kbd className="smart-tooltip-keycap">{shortcut}</kbd>}
              </div>
              {description && (
                <div className="smart-tooltip-description">{description}</div>
              )}
            </div>
            {/* Dynamic arrow pointer pointing at trigger */}
            <div
              className="smart-tooltip-arrow"
              style={
                coords?.arrowOffset !== undefined
                  ? coords.placement === 'top' || coords.placement === 'bottom'
                    ? { left: `${coords.arrowOffset}px` }
                    : { top: `${coords.arrowOffset}px` }
                  : undefined
              }
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {triggerElement}
      {tooltipPortal}
    </>
  );
};
