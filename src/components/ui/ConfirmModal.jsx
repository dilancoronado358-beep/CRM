import React from 'react';
import { Modal, Btn, Ico } from './index';
import { T } from '../../theme';

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = "Confirmar Acción",
  description = "¿Estás seguro de que deseas realizar esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger"
}) => {
  const isDanger = variant === "danger";

  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`,
          boxShadow: `0 0 20px ${isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)'}`
        }}>
          <Ico k={isDanger ? "trash" : "help"} size={32} style={{ color: isDanger ? '#EF4444' : '#2563EB' }} />
        </div>

        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: T.white, fontWeight: 800 }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 14, color: T.whiteDim, lineHeight: 1.5 }}>{description}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: `1px solid ${T.borderHi}`,
              background: 'transparent',
              color: T.whiteOff,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: isDanger ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' : 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
              color: '#FFF',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isDanger ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(6, 182, 212, 0.3)',
              transition: 'transform 0.1s, filter 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
