import { useState } from "react";
import { T } from "../theme";
import { Ico } from "../components/ui";

export function ChatFacebook({ t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(24,119,242,0.3)" }}>
        <Ico k="users" size={32} style={{ color: "#FFF" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Facebook Messenger Integration</h2>
      <p style={{ color: T.whiteDim, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        {t("Este módulo está en construcción. Aquí podrás gestionar los mensajes de tu Fanpage de Facebook y crear bots automáticos.")}
      </p>
    </div>
  );
}
