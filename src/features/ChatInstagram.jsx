import { useState } from "react";
import { T } from "../theme";
import { Ico } from "../components/ui";

export function ChatInstagram({ t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(220,39,67,0.3)" }}>
        <Ico k="camera" size={32} style={{ color: "#FFF" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Instagram Direct Integration</h2>
      <p style={{ color: T.whiteDim, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        {t("Este módulo está en construcción. Aquí podrás gestionar los DMs de tu cuenta de Instagram y crear flujos de chat.")}
      </p>
    </div>
  );
}
