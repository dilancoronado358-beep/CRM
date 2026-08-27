# 💠 ENSING CRM Premium

Bienvenido a la versión definitiva de **ENSING CRM**, un sistema de gestión de relaciones comerciales diseñado con una estética obsidian-glassmorphism y una arquitectura de alta estabilidad.

![Status](https://img.shields.io/badge/Status-Premium-06B6D4?style=for-the-badge)
![Stability](https://img.shields.io/badge/Stability-100%25-10B981?style=for-the-badge)
![Design](https://img.shields.io/badge/Design-Glassmorphism-A78BFA?style=for-the-badge)

## 🚀 Características Principales

### 💎 Interfaz Premium (ENSING Aesthetic)
- **Lead Modal Obsidian**: Un diseño lateral renovado con tipografía de alto impacto (32px para valores financieros) y efectos de vidrio.
- **Scrollbars Minimalistas**: Barras de desplazamiento inteligentes que solo aparecen al interactuar, manteniendo la limpieza visual.
- **Micro-interacciones**: Transiciones fluidas en Kanban, botones con glow dinámico y estados de carga pulidos.

### 🛡️ Arquitectura de Ultra-Estabilidad
- **Safe-Rendering Engine**: Implementación exhaustiva de *Optional Chaining* en todo el flujo de datos (`db.pipelines`, `db.deals`, `db.contactos`).
- **Resiliencia ante Nulos**: El sistema ya no colapsa (black/blue screen) si faltan datos o si el usuario cambia de pipeline rápidamente; ahora maneja estados vacíos de forma elegante.
- **Persistencia Inteligente**: El CRM recuerda tu **Módulo Activo** y tu **Pipeline de Trabajo** incluso si recargas la página o cierras el navegador.

### 🤖 Automatización y Herramientas
- **Motor de Disparadores**: Sistema funcional para crear reglas automáticas basadas en cambios de etapa.
- **Modo Prueba**: Switch integrado para validar flujos sin enviar emails reales a clientes.
- **Sales Intelligence**: Integración con IA para análisis de leads y puntuación de probabilidad (Score AI).

## 🛠️ Stack Tecnológico

- **Frontend**: React + Vite (HMR Activado)
- **Estilos**: Vanilla CSS con Sistema de Tokens Dinámicos (`T` en `theme.js`).
- **Backend/DB**: Supabase (PostgreSQL + Real-time).
- **Notificaciones**: Sileo Physics-based Toasts.
- **Gráficos**: Recharts con degradados personalizados.

## 📖 Guías Técnicas

Para asegurar que el sistema se mantenga premium, revisa los siguientes archivos:

1.  [Guía de Estabilidad](file:///c:/Users/Usuario/Desktop/mi-crm/DOCS/ESTABILIDAD.md): Cómo mantener el sistema libre de errores de renderizado.
2.  [Guía de Diseño ENSING](file:///c:/Users/Usuario/Desktop/mi-crm/DOCS/DISENO.md): Cómo usar los tokens `T` para extender la UI sin romper la estética.

---
*Hecho con ❤️ para el equipo de ENSING CRM.*
