import React from 'react';
import { CSSTransition } from 'react-transition-group';

interface FadeTransitionProps {
  in: boolean;
  children: React.ReactNode;
  onExited?: () => void;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  in: inProp,
  children,
  onExited
}) => {
  const nodeRef = React.useRef(null);

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={inProp}
      timeout={300}
      classNames="fade"
      unmountOnExit
      onExited={onExited}
    >
      <div ref={nodeRef}>
        {children}
      </div>
    </CSSTransition>
  );
};