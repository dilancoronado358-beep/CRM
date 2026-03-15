import { useState } from "react";
import { T } from "../theme";
import { Ico } from "../components/ui";

export function ChatTelegram({ t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(0,136,204,0.3)" }}>
        <Ico k="paper-plane" size={32} style={{ color: "#FFF" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Telegram Bot Integration</h2>
      <p style={{ color: T.whiteDim, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        {t("Este módulo está en construcción. Aquí podrás leer los chats de tu bot de Telegram y configurar auto-respuestas.")}
      </p>
    </div>
  );
}
