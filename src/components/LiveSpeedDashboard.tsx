import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import * as RadioGroup from "@kobalte/core/radio-group";
import * as TextField from "@kobalte/core/text-field";
import { Toast, toaster } from "@kobalte/core/toast";
import { Activity, Gauge, PlugZap, UserRound, Wifi, WifiOff } from "lucide-solid";
import { connectPlayerSpeedFeed, type SpeedSample } from "../lib/playerSpeedFeed";
import "./live-speed-dashboard.css";

type SpeedUnit = "hour" | "min" | "sec";

interface DocumentPictureInPictureApi {
  requestWindow(options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
    preferInitialWindowPlacement?: boolean;
  }): Promise<Window>;
}

interface PlayerSpeedState {
  entityId: string;
  x: number;
  z: number;
  receivedAt: number;
  speedHexPerSec: number;
  sampleCount: number;
}

const unitScale: Record<SpeedUnit, number> = {
  hour: 3600,
  min: 60,
  sec: 1
};

const unitLabel: Record<SpeedUnit, string> = {
  hour: "hex/hour",
  min: "hex/min",
  sec: "hex/sec"
};

const unitOptions: Array<{ value: SpeedUnit; label: string }> = [
  { value: "hour", label: "hex/hour" },
  { value: "min", label: "hex/min" },
  { value: "sec", label: "hex/sec" }
];

const EWMA_ALPHA = 0.35;
const MIN_EFFECTIVE_ELAPSED_SEC = 0.2;
const STALE_GAP_SEC = 2.5;
const MAX_REASONABLE_HEX_PER_SEC = 120;

function normalizePlayerIds(raw: string): string[] {
  const parts = raw
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id) => /^[0-9]{1,32}$/.test(id));

  return Array.from(new Set(parts));
}

function convertSpeed(speedHexPerSec: number, unit: SpeedUnit): number {
  return Math.max(0, speedHexPerSec) * unitScale[unit];
}

function formatSpeed(speedHexPerSec: number, unit: SpeedUnit): string {
  const rounded = Math.round(convertSpeed(speedHexPerSec, unit));
  const value = rounded.toString().padStart(2, "0");
  return `${value} ${unitLabel[unit]}`;
}

function initializePopupDocument(popupWindow: Window): void {
  const document = popupWindow.document;
  document.title = "現在速度";

  const head = document.head;
  head.replaceChildren();

  const metaCharset = document.createElement("meta");
  metaCharset.setAttribute("charset", "UTF-8");

  const metaViewport = document.createElement("meta");
  metaViewport.setAttribute("name", "viewport");
  metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0");

  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0d1117;
      color: #c9d1d9;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    .popup-panel {
      width: calc(100% - 24px);
      border: 1px solid #30363d;
      background: #161b22;
      padding: 14px;
      box-sizing: border-box;
      display: grid;
      gap: 10px;
    }
    .popup-label {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #8b949e;
      margin: 0;
    }
    .popup-speed {
      margin: 0;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: clamp(28px, 8vw, 44px);
      line-height: 1;
      color: #f0f6fc;
    }
    .popup-status {
      margin: 0;
      font-size: 12px;
      color: #8b949e;
    }
  `;

  head.append(metaCharset, metaViewport, style);

  const body = document.body;
  body.replaceChildren();

  const panel = document.createElement("main");
  panel.className = "popup-panel";

  const label = document.createElement("p");
  label.className = "popup-label";
  label.textContent = "Current Speed";

  const speed = document.createElement("p");
  speed.id = "popup-speed";
  speed.className = "popup-speed";
  speed.textContent = "--";

  const status = document.createElement("p");
  status.id = "popup-status";
  status.className = "popup-status";
  status.textContent = "待機中";

  panel.append(label, speed, status);
  body.append(panel);
}

function getDocumentPictureInPictureApi(): DocumentPictureInPictureApi | null {
  const maybeApi = (window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi }).documentPictureInPicture;
  return maybeApi ?? null;
}

function openClassicPopupWindow(): Window | null {
  return window.open("", "bc-speedometer-popup", "popup=yes,width=360,height=220,resizable=yes");
}

export default function LiveSpeedDashboard() {
  const [playerInput, setPlayerInput] = createSignal("");
  const [selectedUnit, setSelectedUnit] = createSignal<SpeedUnit>("sec");
  const [isConnected, setIsConnected] = createSignal(false);
  const [statusLabel, setStatusLabel] = createSignal("待機中");
  const [connectedPlayerIds, setConnectedPlayerIds] = createSignal<string[]>([]);
  const [lastMessageAt, setLastMessageAt] = createSignal<number | null>(null);
  const [statsByPlayer, setStatsByPlayer] = createSignal<Record<string, PlayerSpeedState>>({});
  const [isPopupOpen, setIsPopupOpen] = createSignal(false);

  let socket: WebSocket | null = null;
  let closeIntentional = false;
  let speedPopup: Window | null = null;
  let popupClosedCheckTimer: number | undefined;

  const orderedStats = createMemo(() =>
    Object.values(statsByPlayer()).sort((a, b) => b.receivedAt - a.receivedAt)
  );

  const averageSpeedHexPerSec = createMemo(() => {
    const rows = orderedStats();
    if (rows.length === 0) return 0;

    return rows.reduce((sum, row) => sum + row.speedHexPerSec, 0) / rows.length;
  });

  const topLine = createMemo(() => {
    const count = connectedPlayerIds().length;
    if (count === 0) return "プレイヤーIDを入力して接続してください。";

    return `${count}件のプレイヤーを購読中`;
  });

  const popupSpeedLine = createMemo(() => formatSpeed(averageSpeedHexPerSec(), selectedUnit()));

  const popupStatusLine = createMemo(() => {
    if (isConnected()) return `接続: ${statusLabel()}`;
    return `接続: ${statusLabel()} / ${topLine()}`;
  });

  const isConnecting = createMemo(() => !isConnected() && statusLabel() === "接続中...");

  const toastNotice = (title: string, detail: string, tone: "ok" | "warn" | "error" = "ok") => {
    toaster.show((toastProps) => (
      <Toast toastId={toastProps.toastId} duration={3200} class={`speed-toast speed-toast-${tone}`}>
        <Toast.Title class="speed-toast-title">{title}</Toast.Title>
        <Toast.Description class="speed-toast-description">{detail}</Toast.Description>
      </Toast>
    ));
  };

  const syncPopupContent = () => {
    if (!speedPopup || speedPopup.closed) {
      speedPopup = null;
      setIsPopupOpen(false);
      return;
    }

    const speedNode = speedPopup.document.getElementById("popup-speed");
    const statusNode = speedPopup.document.getElementById("popup-status");

    if (speedNode) speedNode.textContent = popupSpeedLine();
    if (statusNode) statusNode.textContent = popupStatusLine();
  };

  const closeSpeedPopup = () => {
    if (speedPopup && !speedPopup.closed) {
      speedPopup.close();
    }

    speedPopup = null;
    setIsPopupOpen(false);
  };

  const attachPopupCloseListener = (popup: Window) => {
    popup.addEventListener(
      "pagehide",
      () => {
        if (speedPopup === popup) {
          speedPopup = null;
          setIsPopupOpen(false);
        }
      },
      { once: true }
    );
  };

  const mountSpeedPopup = (popup: Window) => {
    speedPopup = popup;
    initializePopupDocument(popup);
    attachPopupCloseListener(popup);
    syncPopupContent();
    popup.focus();
    setIsPopupOpen(true);
  };

  const openSpeedPopup = () => {
    const documentPictureInPicture = getDocumentPictureInPictureApi();

    if (documentPictureInPicture) {
      documentPictureInPicture
        .requestWindow({ width: 360, height: 220 })
        .then((popup) => {
          mountSpeedPopup(popup);
          toastNotice("PiP表示", "ChromiumではDocument PiPで現在速度を表示します。", "ok");
          return popup;
        })
        .catch(() => {
          const fallbackPopup = openClassicPopupWindow();

          if (!fallbackPopup) {
            toastNotice("Popupを開けません", "ブラウザでポップアップを許可してください。", "error");
            return null;
          }

          mountSpeedPopup(fallbackPopup);
          toastNotice("Popup表示", "Document PiPが使えないため通常Popupで表示しています。", "warn");
          return fallbackPopup;
        });
      return;
    }

    const popup = openClassicPopupWindow();

    if (!popup) {
      toastNotice("Popupを開けません", "ブラウザでポップアップを許可してください。", "error");
      return;
    }

    mountSpeedPopup(popup);
  };

  const applySample = (sample: SpeedSample) => {
    setStatsByPlayer((prev) => {
      const previous = prev[sample.entityId];

      let speedHexPerSec = previous?.speedHexPerSec ?? 0;
      if (previous) {
        const elapsedSec = (sample.receivedAt - previous.receivedAt) / 1000;
        if (elapsedSec > STALE_GAP_SEC) {
          speedHexPerSec = previous.speedHexPerSec * 0.9;
        } else if (elapsedSec > 0) {
          const effectiveElapsedSec = Math.max(elapsedSec, MIN_EFFECTIVE_ELAPSED_SEC);
          const distance = Math.hypot(sample.x - previous.x, sample.z - previous.z);
          const instantaneousSpeed = Math.min(distance / effectiveElapsedSec, MAX_REASONABLE_HEX_PER_SEC);
          speedHexPerSec = previous.speedHexPerSec * (1 - EWMA_ALPHA) + instantaneousSpeed * EWMA_ALPHA;
        }
      }

      return {
        ...prev,
        [sample.entityId]: {
          entityId: sample.entityId,
          x: sample.x,
          z: sample.z,
          receivedAt: sample.receivedAt,
          speedHexPerSec,
          sampleCount: (previous?.sampleCount ?? 0) + 1
        }
      };
    });

    setLastMessageAt(sample.receivedAt);
  };

  const disconnectFeed = (announce: boolean) => {
    if (socket) {
      closeIntentional = true;
      socket.close(1000, "manual-close");
      socket = null;
    }

    setIsConnected(false);
    setStatusLabel("未接続");

    if (announce) {
      toastNotice("接続を終了", "WebSocket購読を停止しました。", "warn");
    }
  };

  const handleUnitChange = (nextValue: string) => {
    if (nextValue === "hour" || nextValue === "min" || nextValue === "sec") {
      setSelectedUnit(nextValue);
    }
  };

  const connectFeed = () => {
    const playerIds = normalizePlayerIds(playerInput());
    if (playerIds.length === 0) {
      toastNotice("入力エラー", "1〜32桁の数値プレイヤーIDを指定してください。", "error");
      return;
    }

    disconnectFeed(false);

    setStatusLabel("接続中...");
    setConnectedPlayerIds(playerIds);
    setStatsByPlayer({});
    setLastMessageAt(null);

    const ws = connectPlayerSpeedFeed(playerIds, applySample, () => {
      setIsConnected(true);
      setStatusLabel("接続済み");
      toastNotice("接続成功", "位置情報ストリームの購読を開始しました。", "ok");
    });

    if (!ws) {
      setStatusLabel("接続失敗");
      toastNotice("接続失敗", "プレイヤーIDが不正です。", "error");
      return;
    }

    socket = ws;
    ws.addEventListener("error", () => {
      setStatusLabel("接続エラー");
      toastNotice("接続エラー", "WebSocketでエラーが発生しました。", "error");
    });

    ws.addEventListener("close", () => {
      socket = null;
      setIsConnected(false);
      setStatusLabel("切断");

      if (closeIntentional) {
        closeIntentional = false;
        return;
      }

      toastNotice("接続終了", "サーバーとの接続が閉じられました。", "warn");
    });
  };

  const toggleConnection = () => {
    if (isConnected() || isConnecting()) {
      disconnectFeed(true);
      return;
    }

    connectFeed();
  };

  createEffect(() => {
    popupSpeedLine();
    popupStatusLine();
    syncPopupContent();
  });

  popupClosedCheckTimer = window.setInterval(() => {
    if (speedPopup?.closed) {
      speedPopup = null;
      setIsPopupOpen(false);
    }
  }, 700);

  onCleanup(() => {
    disconnectFeed(false);
    if (popupClosedCheckTimer) {
      clearInterval(popupClosedCheckTimer);
    }
    closeSpeedPopup();
  });

  return (
    <div class="speedometer-shell">
      <header class="speedometer-hero">
        <h1 class="speedometer-title">
          <Gauge size={22} class="title-icon" />
          BC Speedometer
        </h1>
        <p class="speedometer-description">
          BitCraft内のプレイヤーの移動速度をリアルタイムで表示します。
        </p>
      </header>

      <section class="speedometer-panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <PlugZap size={16} />
            Live Feed Control
          </h2>
          <div class="connection-badge" data-connected={isConnected() ? "yes" : "no"}>
            <Show when={isConnected()} fallback={<WifiOff size={14} />}>
              <Wifi size={14} />
            </Show>
            <span>{statusLabel()}</span>
          </div>
        </div>

        <TextField.Root class="id-input-group">
          <TextField.Label class="field-label">Player IDs</TextField.Label>
          <TextField.Input
            class="field-input"
            value={playerInput()}
            onInput={(event) => setPlayerInput(event.currentTarget.value)}
            placeholder="プレイヤーIDを入力"
          />
          <TextField.Description class="field-help">
            数値IDをカンマ区切りで入力します。
          </TextField.Description>
        </TextField.Root>

        <div class="radiogroup-cl-60">
          <RadioGroup.Root class="unit-group" value={selectedUnit()} onChange={handleUnitChange}>
            <RadioGroup.Label class="field-label">表示単位</RadioGroup.Label>
            <div class="unit-list" role="presentation">
              <For each={unitOptions}>
                {(option) => (
                  <RadioGroup.Item class="unit-item" value={option.value}>
                    <RadioGroup.ItemInput class="unit-input" />
                    <RadioGroup.ItemControl class="unit-control" />
                    <RadioGroup.ItemLabel class="unit-item-label">{option.label}</RadioGroup.ItemLabel>
                  </RadioGroup.Item>
                )}
              </For>
            </div>
          </RadioGroup.Root>

          <div class="action-panel-right">
            <div class="action-row action-row-right">
              <button
                class={`action-button ${isConnected() || isConnecting() ? "muted" : ""}`}
                type="button"
                onClick={toggleConnection}
              >
                {isConnected() || isConnecting() ? "切断" : "接続開始"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="speedometer-grid">
        <article class="metric-card">
          <div class="metric-head-row">
            <h3 class="metric-title">
              <Activity size={16} />
              現在速度
            </h3>
            <Show
              when={!isPopupOpen()}
              fallback={
                <button class="action-button muted metric-popup-button" type="button" onClick={closeSpeedPopup}>
                  Popup閉じる
                </button>
              }
            >
              <button class="action-button metric-popup-button" type="button" onClick={openSpeedPopup}>
                Popup表示
              </button>
            </Show>
          </div>
          <p class="metric-main">{formatSpeed(averageSpeedHexPerSec(), selectedUnit())}</p>
          <ul class="metric-sub-list">
            <For each={unitOptions}>
              {(unit) => <li>{formatSpeed(averageSpeedHexPerSec(), unit.value)}</li>}
            </For>
          </ul>
          <p class="metric-foot">
            最終受信: <Show when={lastMessageAt()} fallback={<span>未受信</span>}>{new Date(lastMessageAt() as number).toLocaleTimeString()}</Show>
          </p>
        </article>

        <article class="players-card">
          <h3 class="metric-title">
            <UserRound size={16} />
            プレイヤー別
          </h3>

          <Show when={orderedStats().length > 0} fallback={<p class="empty-line">速度データ待機中です。</p>}>
            <ul class="players-list">
              <For each={orderedStats()}>
                {(row) => (
                  <li class="player-row">
                    <div class="player-main-row">
                      <strong>ID {row.entityId}</strong>
                      <span>{formatSpeed(row.speedHexPerSec, selectedUnit())}</span>
                    </div>
                    <div class="player-meta-row">
                      <span>
                        x: {row.x.toFixed(0)} / z: {row.z.toFixed(0)} hex
                      </span>
                      <span>samples: {row.sampleCount}</span>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </article>
      </section>

      <Toast.Region class="speed-toast-region">
        <Toast.List class="speed-toast-list" />
      </Toast.Region>
    </div>
  );
}
