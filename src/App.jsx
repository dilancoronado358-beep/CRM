import { useState, useEffect, useRef } from "react";
import { useSupaState, sb } from "./hooks/useSupaState";
import { T, applyTheme } from "./theme";
import { getApiUrl } from "./utils";

import { Av, Btn, ControlSegmentado, IndSupa, Ico, SpotlightSearch, ConfirmModal } from "./components/ui";
import { io } from "socket.io-client";
import { Toaster } from "sileo";
import "sileo/styles.css";
import { sileo } from "./utils/sileo";

// Features
import { Dashboard } from "./features/Dashboard";
import { Contactos } from "./features/Contactos";
import { Empresas } from "./features/Empresas";
import { Pipeline } from "./features/Pipeline";
import { Deals } from "./features/Deals";
import { Actividades } from "./features/Actividades";
import { Tareas } from "./features/Tareas";
import { ModuloEmail } from "./features/ModuloEmail";
import { PlantillasEmail } from "./features/PlantillasEmail";
import { Notas } from "./features/Notas";
import { Reportes } from "./features/Reportes";
import { Configuracion } from "./features/Configuracion";
import { Productos } from "./features/Productos";
import { Calendario } from "./features/Calendario";
import { Automatizaciones } from "./features/Automatizaciones";
import { Documentos } from "./features/Documentos";
import { Formularios } from "./features/Formularios";
import { Websites } from "./features/Websites";
import { Playbook } from "./features/Playbook";
import { EmailSequences } from "./features/EmailSequences";
import { Finanzas } from "./features/Finanzas";
import { NotificationCenter } from "./features/NotificationCenter";
import { DataHygiene } from "./features/DataHygiene";
import { Login } from "./features/Login";

// Public Views
import { FormularioPublico } from "./features/FormularioPublico";
import { LandingPagePublica } from "./features/LandingPagePublica";

// Chatbots
import { ChatWhatsApp } from "./features/ChatWhatsApp";
import { ChatTelegram } from "./features/ChatTelegram";
import { ChatInstagram } from "./features/ChatInstagram";
import { ChatFacebook } from "./features/ChatFacebook";

// ─────────────────────────────────────────────────────────────────────────────
// DICCIONARIO GLOBAL COMPLETO  (es = clave, en/ru/fr = traducciones)
// ─────────────────────────────────────────────────────────────────────────────
const DICT = {
  // ── Navegación principal ──────────────────────────────────────────────────
  "Control Center": { en: "Control Center", ru: "Панель управления", fr: "Tableau de Bord" },
  "Pipeline (Kanban)": { en: "Pipeline", ru: "Воронка продаж", fr: "Pipeline" },
  "Deals / Oportunidades": { en: "Deals", ru: "Сделки", fr: "Opportunités" },
  "Directorio Contactos": { en: "Contacts", ru: "Контакты", fr: "Contacts" },
  "Empresas": { en: "Companies", ru: "Компании", fr: "Entreprises" },
  "Registro Actividades": { en: "Activity Log", ru: "Журнал активности", fr: "Journal d'Activités" },
  "Gestión de Tareas": { en: "Tasks", ru: "Задачи", fr: "Tâches" },
  "Catálogo & Precios": { en: "Catalog", ru: "Каталог", fr: "Catalogue" },
  "Bandeja de Correo": { en: "Inbox", ru: "Входящие", fr: "Boîte de Réception" },
  "Plantillas Email": { en: "Email Templates", ru: "Шаблоны", fr: "Modèles Email" },
  "Calendario Global": { en: "Calendar", ru: "Календарь", fr: "Calendrier" },
  "Gestión Documental": { en: "Documents", ru: "Документы", fr: "Documents" },
  "Automatizaciones": { en: "Automations", ru: "Автоматизация", fr: "Automatisations" },
  "Secuencias Email": { en: "Email Sequences", ru: "Цепочки писем", fr: "Séquences Email" },
  "Notas Internas": { en: "Notes", ru: "Заметки", fr: "Notes" },
  "Reportes Analíticos": { en: "Reports", ru: "Отчёты", fr: "Rapports" },
  "Finanzas & Comisiones": { en: "Finances", ru: "Финансы", fr: "Finances" },
  "Limpieza de Datos": { en: "Data Hygiene", ru: "Очистка данных", fr: "Nettoyage des Données" },
  "Configuración": { en: "Settings", ru: "Настройки", fr: "Paramètres" },
  "Form Builder": { en: "Form Builder", ru: "Формы", fr: "Formulaires" },
  "Landing Pages": { en: "Landing Pages", ru: "Лендинги", fr: "Pages Web" },
  "Sales Playbook": { en: "Sales Playbook", ru: "База знаний", fr: "Wiki Ventes" },
  "WhatsApp": { en: "WhatsApp", ru: "WhatsApp", fr: "WhatsApp" },
  "Telegram": { en: "Telegram", ru: "Telegram", fr: "Telegram" },
  "Instagram": { en: "Instagram", ru: "Instagram", fr: "Instagram" },
  "Facebook": { en: "Facebook", ru: "Facebook", fr: "Facebook" },
  // ── Grupos de navegación ──────────────────────────────────────────────────
  "Ventas": { en: "Sales", ru: "Продажи", fr: "Ventes" },
  "Agenda": { en: "Planner", ru: "Органайзер", fr: "Agenda" },
  "Facturación": { en: "Billing", ru: "Биллинг", fr: "Facturation" },
  "Comunicación": { en: "Communication", ru: "Связь", fr: "Communication" },
  "Herramientas": { en: "Tools", ru: "Инструменты", fr: "Outils" },
  "Sistema": { en: "System", ru: "Система", fr: "Système" },
  "Captación Leads": { en: "Lead Gen", ru: "Генерация лидов", fr: "Génération de Leads" },
  // ── Acciones y botones globales ───────────────────────────────────────────
  "Guardar": { en: "Save", ru: "Сохранить", fr: "Enregistrer" },
  "Cancelar": { en: "Cancel", ru: "Отмена", fr: "Annuler" },
  "Eliminar": { en: "Delete", ru: "Удалить", fr: "Supprimer" },
  "Editar": { en: "Edit", ru: "Редактировать", fr: "Modifier" },
  "Crear": { en: "Create", ru: "Создать", fr: "Créer" },
  "Nuevo": { en: "New", ru: "Новый", fr: "Nouveau" },
  "Cerrar": { en: "Close", ru: "Закрыть", fr: "Fermer" },
  "Buscar": { en: "Search", ru: "Поиск", fr: "Rechercher" },
  "Filtrar": { en: "Filter", ru: "Фильтр", fr: "Filtrer" },
  "Exportar": { en: "Export", ru: "Экспорт", fr: "Exporter" },
  "Ver todos": { en: "View all", ru: "Посмотреть все", fr: "Voir tout" },
  "Confirmar": { en: "Confirm", ru: "Подтвердить", fr: "Confirmer" },
  "Agregar": { en: "Add", ru: "Добавить", fr: "Ajouter" },
  "Duplicar": { en: "Duplicate", ru: "Дублировать", fr: "Dupliquer" },
  "Publicar": { en: "Publish", ru: "Опубликовать", fr: "Publier" },
  "Activar": { en: "Activate", ru: "Активировать", fr: "Activer" },
  "Pausar": { en: "Pause", ru: "Приостановить", fr: "Mettre en pause" },
  "Importar": { en: "Import", ru: "Импорт", fr: "Importer" },
  // ── Dashboard ────────────────────────────────────────────────────────────
  "Pipeline Activo": { en: "Active Pipeline", ru: "Активная воронка", fr: "Pipeline Actif" },
  "Total Ganado": { en: "Total Won", ru: "Всего выиграно", fr: "Total Gagné" },
  "Tasa de Conversión": { en: "Conversion Rate", ru: "Коэффициент конверсии", fr: "Taux de Conversion" },
  "Contactos": { en: "Contacts", ru: "Контакты", fr: "Contacts" },
  "Actividades Pend.": { en: "Pending Activities", ru: "Ожидающие задачи", fr: "Activités en Attente" },
  "Emails Sin Leer": { en: "Unread Emails", ru: "Непрочитанные письма", fr: "Emails Non Lus" },
  "Embudo de Ventas": { en: "Sales Funnel", ru: "Воронка продаж", fr: "Entonnoir de Ventes" },
  "Revenue por etapa": { en: "Revenue by stage", ru: "Выручка по этапам", fr: "Revenu par étape" },
  "Tendencia Revenue": { en: "Revenue Trend", ru: "Динамика выручки", fr: "Tendance Revenus" },
  "Últimos 6 meses": { en: "Last 6 months", ru: "Последние 6 месяцев", fr: "6 derniers mois" },
  "Mejores Deals Activos": { en: "Top Active Deals", ru: "Лучшие сделки", fr: "Meilleurs Deals Actifs" },
  "Actividad Reciente": { en: "Recent Activity", ru: "Недавняя активность", fr: "Activité Récente" },
  "Ingresos": { en: "Revenue", ru: "Выручка", fr: "Revenus" },
  // ── Pipeline & Deals ─────────────────────────────────────────────────────
  "Nuevo Deal": { en: "New Deal", ru: "Новая сделка", fr: "Nouveau Deal" },
  "Nuevo Pipeline": { en: "New Pipeline", ru: "Новая воронка", fr: "Nouveau Pipeline" },
  "Etapa": { en: "Stage", ru: "Этап", fr: "Étape" },
  "Probabilidad": { en: "Probability", ru: "Вероятность", fr: "Probabilité" },
  "Valor": { en: "Value", ru: "Стоимость", fr: "Valeur" },
  "Fecha Cierre": { en: "Close Date", ru: "Дата закрытия", fr: "Date de Clôture" },
  "Contacto": { en: "Contact", ru: "Контакт", fr: "Contact" },
  "Empresa": { en: "Company", ru: "Компания", fr: "Entreprise" },
  "Estado": { en: "Status", ru: "Статус", fr: "Statut" },
  "Ganado": { en: "Won", ru: "Выиграна", fr: "Gagné" },
  "Perdido": { en: "Lost", ru: "Проиграна", fr: "Perdu" },
  "En proceso": { en: "In Progress", ru: "В процессе", fr: "En Cours" },
  "sin deals": { en: "no deals", ru: "нет сделок", fr: "aucun deal" },
  "Agregar Deal": { en: "Add Deal", ru: "Добавить сделку", fr: "Ajouter un Deal" },
  // ── Contactos & Empresas ──────────────────────────────────────────────────
  "Nuevo Contacto": { en: "New Contact", ru: "Новый контакт", fr: "Nouveau Contact" },
  "Nueva Empresa": { en: "New Company", ru: "Новая компания", fr: "Nouvelle Entreprise" },
  "Nombre": { en: "Name", ru: "Имя", fr: "Nom" },
  "Teléfono": { en: "Phone", ru: "Телефон", fr: "Téléphone" },
  "Correo": { en: "Email", ru: "Электронная почта", fr: "Email" },
  "Cargo": { en: "Role", ru: "Должность", fr: "Poste" },
  "Lead": { en: "Lead", ru: "Лид", fr: "Lead" },
  "Cliente": { en: "Client", ru: "Клиент", fr: "Client" },
  "Prospecto": { en: "Prospect", ru: "Перспективный", fr: "Prospect" },
  "Industria": { en: "Industry", ru: "Отрасль", fr: "Secteur" },
  // ── Tareas & Actividades ──────────────────────────────────────────────────
  "Nueva Tarea": { en: "New Task", ru: "Новая задача", fr: "Nouvelle Tâche" },
  "Nueva Actividad": { en: "New Activity", ru: "Новое действие", fr: "Nouvelle Activité" },
  "Pendiente": { en: "Pending", ru: "В ожидании", fr: "En Attente" },
  "Completado": { en: "Completed", ru: "Завершено", fr: "Terminé" },
  "Vencida": { en: "Overdue", ru: "Просрочено", fr: "En Retard" },
  "Prioridad": { en: "Priority", ru: "Приоритет", fr: "Priorité" },
  "Alta": { en: "High", ru: "Высокий", fr: "Élevée" },
  "Media": { en: "Medium", ru: "Средний", fr: "Moyenne" },
  "Baja": { en: "Low", ru: "Низкий", fr: "Faible" },
  "Vencimiento": { en: "Due Date", ru: "Срок выполнения", fr: "Date d'Échéance" },
  "Descripción": { en: "Description", ru: "Описание", fr: "Description" },
  // ── Email ─────────────────────────────────────────────────────────────────
  "Redactar": { en: "Compose", ru: "Написать", fr: "Rédiger" },
  "Responder": { en: "Reply", ru: "Ответить", fr: "Répondre" },
  "Reenviar": { en: "Forward", ru: "Переслать", fr: "Transférer" },
  "Bandeja entrada": { en: "Inbox", ru: "Входящие", fr: "Boîte de Réception" },
  "Enviados": { en: "Sent", ru: "Отправленные", fr: "Envoyés" },
  "Borradores": { en: "Drafts", ru: "Черновики", fr: "Brouillons" },
  "Asunto": { en: "Subject", ru: "Тема", fr: "Objet" },
  "Para": { en: "To", ru: "Кому", fr: "À" },
  // ── Automatizaciones ─────────────────────────────────────────────────────
  "Nuevo Flow": { en: "New Flow", ru: "Новый поток", fr: "Nouveau Flow" },
  "Ejecutar Prueba": { en: "Run Test", ru: "Запустить тест", fr: "Lancer le Test" },
  "Ejecutando...": { en: "Running...", ru: "Выполняется...", fr: "En cours..." },
  "En vivo": { en: "Live", ru: "Активен", fr: "En Direct" },
  "Pausado": { en: "Paused", ru: "Приостановлен", fr: "En Pause" },
  "ejecuciones": { en: "executions", ru: "выполнений", fr: "exécutions" },
  "nodos": { en: "nodes", ru: "узлов", fr: "noeuds" },
  "Agregar Nodo": { en: "Add Node", ru: "Добавить узел", fr: "Ajouter un Nœud" },
  "Motor de Automatización": { en: "Automation Engine", ru: "Движок автоматизации", fr: "Moteur d'Automatisation" },
  "Disparadores": { en: "Triggers", ru: "Триггеры", fr: "Déclencheurs" },
  "Acciones": { en: "Actions", ru: "Действия", fr: "Actions" },
  "Condiciones": { en: "Conditions", ru: "Условия", fr: "Conditions" },
  "Pipeline objetivo": { en: "Target Pipeline", ru: "Целевая воронка", fr: "Pipeline Cible" },
  "Todos los Pipelines": { en: "All Pipelines", ru: "Все воронки", fr: "Tous les Pipelines" },
  "Consola de Ejecución": { en: "Execution Console", ru: "Консоль выполнения", fr: "Console d'Exécution" },
  // ── Configuración ─────────────────────────────────────────────────────────
  "Ajustes CRM": { en: "CRM Settings", ru: "Настройки CRM", fr: "Paramètres CRM" },
  "Administración Global": { en: "Global Administration", ru: "Глобальное управление", fr: "Administration Globale" },
  "Mi Perfil": { en: "My Profile", ru: "Мой профиль", fr: "Mon Profil" },
  "Apariencia": { en: "Appearance", ru: "Внешний вид", fr: "Apparence" },
  "Recordatorios": { en: "Reminders", ru: "Напоминания", fr: "Rappels" },
  "Infraestructura": { en: "Infrastructure", ru: "Инфраструктура", fr: "Infrastructure" },
  "Equipo & Accesos": { en: "Team & Access", ru: "Команда и доступ", fr: "Équipe & Accès" },
  "SMTP / IMAP": { en: "SMTP / IMAP", ru: "SMTP / IMAP", fr: "SMTP / IMAP" },
  "API & Webhooks": { en: "API & Webhooks", ru: "API и вебхуки", fr: "API & Webhooks" },
  "Seguridad": { en: "Security", ru: "Безопасность", fr: "Sécurité" },
  "Avanzado": { en: "Advanced", ru: "Дополнительно", fr: "Avancé" },
  "Tema del Sistema": { en: "System Theme", ru: "Тема оформления", fr: "Thème du Système" },
  "Activo": { en: "Active", ru: "Активен", fr: "Actif" },
  "Idioma del Sistema": { en: "System Language", ru: "Язык системы", fr: "Langue du Système" },
  "Nombre Completo": { en: "Full Name", ru: "Полное имя", fr: "Nom Complet" },
  "Guardar Cambios": { en: "Save Changes", ru: "Сохранить изменения", fr: "Enregistrer les changements" },
  // ── Formularios & Landing Pages ───────────────────────────────────────────
  "Nueva Página": { en: "New Page", ru: "Новая страница", fr: "Nouvelle Page" },
  "Tus Páginas": { en: "Your Pages", ru: "Ваши страницы", fr: "Vos Pages" },
  "Vista Previa": { en: "Preview", ru: "Предпросмотр", fr: "Aperçu" },
  "Tipo de campo": { en: "Field type", ru: "Тип поля", fr: "Type de champ" },
  "Agregar Campo": { en: "Add Field", ru: "Добавить поле", fr: "Ajouter un Champ" },
  "Enlace del formulario": { en: "Form link", ru: "Ссылка формы", fr: "Lien du formulaire" },
  // ── Notas ─────────────────────────────────────────────────────────────────
  "Nueva Nota": { en: "New Note", ru: "Новая заметка", fr: "Nouvelle Note" },
  "Sin notas": { en: "No notes yet", ru: "Нет заметок", fr: "Aucune note" },
  // ── Reportes ─────────────────────────────────────────────────────────────
  "Resumen General": { en: "General Summary", ru: "Общая сводка", fr: "Résumé Général" },
  "Período": { en: "Period", ru: "Период", fr: "Période" },
  // ── General / Misceláneos ─────────────────────────────────────────────────
  "Cargando...": { en: "Loading...", ru: "Загрузка...", fr: "Chargement..." },
  "Sin resultados": { en: "No results", ru: "Нет результатов", fr: "Aucun résultat" },
  "Acciones": { en: "Actions", ru: "Действия", fr: "Actions" },
  "Detalles": { en: "Details", ru: "Подробности", fr: "Détails" },
  "Historial": { en: "History", ru: "История", fr: "Historique" },
  "Archivos": { en: "Files", ru: "Файлы", fr: "Fichiers" },
  "Notas": { en: "Notes", ru: "Заметки", fr: "Notes" },
  "Fecha": { en: "Date", ru: "Дата", fr: "Date" },
  "Hora": { en: "Time", ru: "Время", fr: "Heure" },
  "Tipo": { en: "Type", ru: "Тип", fr: "Тип" },
  "Total": { en: "Total", ru: "Итого", fr: "Total" },
  "Cantidad": { en: "Amount", ru: "Количество", fr: "Montant" },
  "Precio": { en: "Price", ru: "Цена", fr: "Prix" },
  "Categoría": { en: "Category", ru: "Категория", fr: "Catégorie" },
  "Sin categoría": { en: "Uncategorized", ru: "Без категории", fr: "Sans catégorie" },
  "Etiquetas": { en: "Tags", ru: "Теги", fr: "Étiquettes" },
  "Fuente": { en: "Source", ru: "Источник", fr: "Source" },
  "Propietario": { en: "Owner", ru: "Владелец", fr: "Propriétaire" },
  "Añadir": { en: "Add", ru: "Добавить", fr: "Ajouter" },
  "Adjuntar": { en: "Attach", ru: "Прикрепить", fr: "Joindre" },
};


export default function App() {
  const { db, setDb, session, estadoSupa, cargando, cargandoFondo, isAppReady, guardarEnSupa, eliminarDeSupa, sendBroadcast } = useSupaState();
  const [modulo, setModulo] = useState("dashboard");
  const [focusEmailId, setFocusEmailId] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [hashURL, setHashURL] = useState(window.location.hash);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutGlobal, setLogoutGlobal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const socketRef = useRef(null);


  // SOCKET GLOBAL PARA NOTIFICACIONES
  useEffect(() => {
    const socket = io(getApiUrl(db));

    socket.on("whatsapp_message", (msg) => {
      if (!msg.fromMe) {
        sileo.info({
          title: "Nuevo WhatsApp",
          description: msg.body.length > 50 ? msg.body.slice(0, 50) + "..." : msg.body,
        });
      }
    });
    socketRef.current = socket;

    // Listener para disparar workflows desde useSupaState (CustomEvent Fallback)
    const handleSupaDealUpdate = (e) => {
      const { dealId, etapaId } = e.detail;
      if (socketRef.current && socketRef.current.connected) {
        console.log(`🔌 [App Socket] Emitiendo workflow_trigger para ${dealId}`);
        socketRef.current.emit('workflow_trigger', { dealId, etapaId });
      }
    };
    window.addEventListener('supa-deal-updated', handleSupaDealUpdate);

    return () => {
      window.removeEventListener('supa-deal-updated', handleSupaDealUpdate);
      socket.disconnect();
    };
  }, []);

  // Recordatorios de Tareas del Día
  useEffect(() => {
    if (!db.usuario || !db.tareas) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const tareasHoy = db.tareas.filter(t => t.vencimiento === hoy && t.estado !== "completada" && t.asignado === db.usuario.name);

    if (tareasHoy.length > 0) {
      const yaNotificado = sessionStorage.getItem(`noti_tareas_${hoy}`);
      if (!yaNotificado) {
        sileo.info({
          title: "Tareas para hoy",
          description: `Tienes ${tareasHoy.length} tareas pendientes para el día de hoy.`,
        });
        sessionStorage.setItem(`noti_tareas_${hoy}`, "true");
      }
    }
  }, [db.tareas, db.usuario?.id]);

  useEffect(() => {
    // Apply theme on mount and whenever user changes it
    const themeId = db.usuario?.tema || localStorage.getItem("crm_theme") || "dark";
    applyTheme(themeId);
  }, [db.usuario?.tema]);

  // Reset de UI al cambiar de usuario o entrar
  useEffect(() => {
    setSpotlightOpen(false);
    setShowLogoutConfirm(false);
  }, [session?.user?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Spotlight (Ctrl/Cmd + K)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSpotlightOpen(prev => !prev);
      }
      // 2. ESC para cerrar todo
      if (e.key === "Escape") {
        setSpotlightOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. Mostrar pantalla de carga global SOLO acaba de hacer login explícitamente
  const isJustLoggedIn = sessionStorage.getItem("just_logged_in") === "true";

  // Limpiar la bandera cuando ya terminó de cargar con un pequeño delay para evitar flashing
  useEffect(() => {
    if (isJustLoggedIn && !cargando) {
      const t = setTimeout(() => {
        sessionStorage.removeItem("just_logged_in");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isJustLoggedIn, cargando]);

  if (isJustLoggedIn && cargando) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: T.bg0, color: T.white }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(6, 182, 212, 0.4)", marginBottom: 24, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
          <Ico k="check" size={28} style={{ color: "#FFF" }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", marginBottom: 16 }}>
          ENSING<span style={{ color: T.teal }}>CRM</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: T.whiteDim, fontSize: 13, fontWeight: 500 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Entrando a tu cuenta y sincronizando...
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .7; transform: scale(0.95); } }
        `}</style>
      </div>
    );
  }

  if (hashURL.startsWith("#/f/")) {
    const formId = hashURL.replace("#/f/", "");
    return <FormularioPublico formId={formId} />;
  }
  if (hashURL.startsWith("#/sites/")) {
    const siteSlug = hashURL.replace("#/sites/", "");
    return <LandingPagePublica siteSlug={siteSlug} />;
  }

  // 2. Si es una redirección de recuperación de contraseña de Supabase
  const isRecovering = window.location.href.includes("type=recovery") ||
    window.location.hash.includes("recovery-confirm") ||
    window.location.search.includes("type=recovery");

  if (isRecovering) {
    return <Login forceView="new-password" />;
  }

  if (loggingOut) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: T.bg0, color: T.white }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.red + "20", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.red}40`, marginBottom: 24 }}>
          <Ico k="lock" size={28} style={{ color: T.red }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-.02em", marginBottom: 16 }}>
          CERRANDO SE<span style={{ color: T.red }}>SIÓN</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: T.whiteDim, fontSize: 13, fontWeight: 500 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${T.red}20`, borderTopColor: T.red, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Sincronizando y saliendo de forma segura...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session && !db.usuario) {
    return <Login />;
  }

  // 3. Bloqueo de carga: asegurar que todos los datos iniciales estén listos
  if (!isAppReady) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: T.bg0, color: T.white }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: T.whiteDim, fontSize: 13, fontWeight: 500 }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${T.tealSoft}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Cargando CRM...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const lng = db.usuario?.idioma || "es";
  // Self-contained translator: t("Spanish key") → translated string for current language
  const t = (es) => {
    if (lng === "es") return es;
    const entry = DICT[es];
    if (!entry) return es;
    return entry[lng] || entry.en || es;
  };

  const MODULOS = [
    { id: "dashboard", label: t("Control Center"), role: t("Ventas"), comp: Dashboard },
    { id: "pipeline", label: t("Pipeline (Kanban)"), role: t("Ventas"), comp: Pipeline },
    { id: "deals", label: t("Deals / Oportunidades"), role: t("Ventas"), comp: Deals },
    { id: "contactos", label: t("Directorio Contactos"), role: t("Agenda"), comp: Contactos },
    { id: "empresas", label: t("Empresas"), role: t("Agenda"), comp: Empresas },
    { id: "actividades", label: t("Registro Actividades"), role: t("Agenda"), comp: Actividades },
    { id: "tareas", label: t("Gestión de Tareas"), role: t("Agenda"), comp: Tareas },
    { id: "catalogo", label: t("Catálogo & Precios"), role: t("Facturación"), comp: Productos },
    { id: "finanzas", label: t("Finanzas & Comisiones"), role: t("Facturación"), comp: Finanzas, adminOnly: true },
    { id: "email", label: t("Bandeja de Correo"), role: t("Comunicación"), comp: ModuloEmail },
    { id: "whatsapp", label: t("WhatsApp"), role: t("Comunicación"), comp: ChatWhatsApp, reqWhatsApp: true },
    { id: "telegram", label: t("Telegram"), role: t("Comunicación"), comp: ChatTelegram },
    { id: "instagram", label: t("Instagram"), role: t("Comunicación"), comp: ChatInstagram },
    { id: "facebook", label: t("Facebook"), role: t("Comunicación"), comp: ChatFacebook },
    { id: "plantillas", label: t("Plantillas Email"), role: t("Comunicación"), comp: PlantillasEmail },
    { id: "calendario", label: t("Calendario Global"), role: t("Herramientas"), comp: Calendario },
    { id: "documentos", label: t("Gestión Documental"), role: t("Sistema"), comp: Documentos },
    { id: "email_sequences", label: t("Secuencias Email"), role: t("Comunicación"), comp: EmailSequences },
    { id: "workflows", label: t("Automatizaciones"), role: t("Sistema"), comp: Automatizaciones },
    { id: "notas", label: t("Notas Internas"), role: t("Herramientas"), comp: Notas },
    { id: "playbook", label: t("Sales Playbook"), role: t("Herramientas"), comp: Playbook },
    { id: "reportes", label: t("Reportes Analíticos"), role: t("Herramientas"), comp: Reportes },
    { id: "hygiene", label: t("Limpieza de Datos"), role: t("Herramientas"), comp: DataHygiene },
    { id: "config", label: t("Configuración"), role: t("Sistema"), comp: Configuracion },
    { id: "formularios", label: t("Form Builder"), role: t("Captación Leads"), comp: Formularios },
    { id: "websites", label: t("Landing Pages"), role: t("Captación Leads"), comp: Websites },
  ].filter(m => {
    // 1. Permisos Administrativos (adminOnly)
    if (m.adminOnly && db.usuario?.role !== "admin") return false;

    // 2. Permisos WhatsApp (reqWhatsApp)
    if (!m.reqWhatsApp) return true;
    if (db.usuario?.role === "admin") return true;
    if (db.usuario?.whatsappAccess === true) return true;
    
    return false;
  });


  const grp = MODULOS.reduce((acc, m) => { (acc[m.role] = acc[m.role] || []).push(m); return acc; }, {});
  const ModuloActivo = MODULOS.find(m => m.id === modulo)?.comp || Dashboard;

  const propsModulo = { db, setDb, guardarEnSupa, eliminarDeSupa, t, setModulo, cargandoFondo, focusEmailId, setFocusEmailId };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg0, color: T.white }}>
      {/* SIDEBAR */}
      <div style={{ width: menuAbierto ? 260 : 80, background: T.bg1, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width .3s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden", flexShrink: 0, zIndex: 50, position: "relative", boxShadow: "1px 0 10px rgba(0,0,0,0.02)" }}>

        {/* CABECERA SIDEBAR */}
        <div style={{ height: 72, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: menuAbierto ? "0 20px" : "0 10px", justifyContent: menuAbierto ? "space-between" : "center", flexShrink: 0 }}>
          {menuAbierto && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(37,99,235,0.3)" }}>
                <Ico k="check" size={20} style={{ color: "#FFF" }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: T.white, letterSpacing: "-.02em" }}>ENSING<span style={{ color: T.teal }}>CRM</span></div>
            </div>
          )}
          <Btn variant="fantasma" size="sm" onClick={() => setMenuAbierto(!menuAbierto)} style={{ padding: 8, color: T.whiteOff }}>
            <Ico k="menu" size={20} />
          </Btn>
        </div>

        {/* NAVEGACIÓN */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(grp).map(([r, mods]) => (
            <div key={r}>
              {menuAbierto && <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", padding: "0 12px", marginBottom: 8 }}>{r}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {mods.map(m => {
                  const act = modulo === m.id;
                  const icons = { 
                    dashboard: "board", pipeline: "funnel", deals: "dollar", contactos: "users", empresas: "building", 
                    actividades: "lightning", tareas: "check", catalogo: "grid", email: "mail", whatsapp: "phone", 
                    telegram: "paper-plane", instagram: "camera", facebook: "users", plantillas: "template", 
                    calendario: "calendar", documentos: "note", workflows: "var", notas: "note", reportes: "chart", 
                    config: "cog", formularios: "template", websites: "link", playbook: "book", email_sequences: "mail",
                    hygiene: "hygiene", finanzas: "credit-card"
                  };
                  return (
                    <button key={m.id} onClick={() => setModulo(m.id)} title={!menuAbierto ? m.label : undefined}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12, 
                        padding: menuAbierto ? "12px 16px" : "12px", 
                        width: "100%", 
                        border: "none", 
                        background: act ? T.tealSoft : "transparent", 
                        color: act ? T.teal : T.whiteOff, 
                        borderRadius: 12, 
                        cursor: "pointer", 
                        transition: "all .25s cubic-bezier(0.4, 0, 0.2, 1)", 
                        fontFamily: "inherit", 
                        fontWeight: act ? 800 : 500, 
                        justifyContent: menuAbierto ? "flex-start" : "center",
                        position: "relative",
                        overflow: "hidden"
                      }}
                      onMouseEnter={e => { 
                        if (!act) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; 
                        e.currentTarget.style.color = act ? T.teal : T.white; 
                      }}
                      onMouseLeave={e => { 
                        if (!act) e.currentTarget.style.background = "transparent"; 
                        e.currentTarget.style.color = act ? T.teal : T.whiteOff; 
                      }}>
                      {/* Indicador Vertical Animado */}
                      {act && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, background: T.teal, borderRadius: "0 4px 4px 0", animation: "fadeIn .3s" }} />}
                      
                      <Ico k={icons[m.id]} size={18} style={{ color: act ? T.teal : T.whiteDim, transition: "transform .2s", transform: act ? "scale(1.1)" : "none" }} />
                      {menuAbierto && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginLeft: act ? 2 : 0, transition: "margin .2s" }}>{m.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER SIDEBAR */}
        <div style={{ padding: "16px 12px", borderTop: `1px solid ${T.borderHi}`, background: T.bg1, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: menuAbierto ? "space-between" : "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
              {db.usuario?.profilePic ? (
                <img src={db.usuario.profilePic} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${T.teal}` }} />
              ) : (
                <Av text={db.usuario?.avatar} color={T.teal} size={36} fs={14} />
              )}
              {menuAbierto && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{db.usuario?.name || "Usuario"}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{db.usuario?.email}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TOPBAR */}
        <div style={{ height: 72, background: T.bg1, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: T.white }}>
              {MODULOS.find(m => m.id === modulo)?.label || t("Cargando...")}
            </div>
            <IndSupa estado={estadoSupa} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <NotificationCenter db={db} guardarEnSupa={guardarEnSupa} setModulo={setModulo} />
            {/* Buscador Global Rápido (Visual) */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.whiteDim, pointerEvents: "none" }}><Ico k="search" size={14} /></div>
              <input placeholder="Búsqueda rápida..." style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 20, padding: "8px 16px 8px 34px", fontSize: 13, color: T.white, width: 220, outline: "none", transition: "all .2s", fontFamily: "inherit" }} onFocus={e => e.target.style.background = T.bg1} onBlur={e => e.target.style.background = T.bg2} />
            </div>
            <Btn variant="secundario" style={{ padding: 8, borderRadius: "50%" }}><Ico k="refresh" size={16} /></Btn>
            <Btn variant="secundario" style={{ padding: 8, borderRadius: "50%", color: T.red, borderColor: T.red }}
              onClick={() => setShowLogoutConfirm(true)}
              title={t("Cerrar sesión")}>
              <Ico k="lock" size={16} />
            </Btn>
          </div>
        </div>

        {/* AREA DE TRABAJO */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px", position: "relative" }}>
          <div key={modulo} className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
            <ModuloActivo {...propsModulo} />
          </div>
        </div>
      </div>

      {/* GLOBAL OMNIBAR */}
      <SpotlightSearch
        db={db}
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onNavigate={(m) => setModulo(m)}
        onLogout={() => setShowLogoutConfirm(true)}
        applyTheme={applyTheme}
      />

      {/* NOTIFICACIONES MODERNAS (SILEO) - PHYSICS BASED GOOEY TOASTS */}
      <Toaster position="top-center" theme="dark" />

      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => { setShowLogoutConfirm(false); setLogoutGlobal(false); }}
        onConfirm={async () => {
          setLoggingOut(true);
          setShowLogoutConfirm(false);
          try {
            const userEmail = db.usuario?.email || session?.user?.email;
            if (logoutGlobal && userEmail) {
              await sendBroadcast('force_logout', {
                email: userEmail,
                timestamp: Date.now(),
                origin: window.location.href
              });
            }
            await sb.auth.signOut({ scope: logoutGlobal ? 'global' : 'local' });
          } catch (err) {
            console.error("Error during logout:", err);
          } finally {
            localStorage.removeItem("crm_usuario_activo");
            localStorage.removeItem("crm_theme");
            sessionStorage.clear();
            window.location.reload();
          }
        }}
        title="¿Cerrar sesión?"
        description="Esta acción cerrará tu sesión actual de forma segura."
        confirmText="Confirmar Cierre"
        variant="danger"
        extraContent={
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
            <input
              type="checkbox"
              checked={logoutGlobal}
              onChange={e => setLogoutGlobal(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: T.teal }}
            />
            <span style={{ fontSize: 13, color: T.whiteDim, fontWeight: 500 }}>
              Cerrar sesión en todos los dispositivos
            </span>
          </label>
        }
      />
    </div>
  );
}