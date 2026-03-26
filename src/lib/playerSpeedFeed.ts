export interface AppConfig {
  websocketUrl: string;
}

export function createAppConfig(): AppConfig {
  return {
    websocketUrl: "wss://live.bitjita.com/"
  };
}

export interface SpeedSample {
  entityId: string;
  x: number;
  z: number;
  receivedAt: number;
}

export type SpeedSampleCallback = (sample: SpeedSample) => void;

function toHexCoordinate(rawCoordinate: number): number {
  return Math.round(rawCoordinate / 1000);
}

export function connectPlayerSpeedFeed(
  playerIds: string[],
  onSample: SpeedSampleCallback,
  onConnect?: () => void
): WebSocket | null {
  if (playerIds.length === 0) return null;

  const validPlayerIds = playerIds.filter((id) => /^[0-9]{1,32}$/.test(id));
  if (validPlayerIds.length === 0) return null;

  const config = createAppConfig();
  const channels = validPlayerIds.map((id) => `mobile_entity_state:${id}`);
  const ws = new WebSocket(config.websocketUrl);

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "subscribe", channels }));
    onConnect?.();
  });

  ws.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;

    try {
      const msg = JSON.parse(event.data) as Record<string, unknown>;
      if (msg.type !== "event" || typeof msg.channel !== "string") return;

      const channelPlayerId = msg.channel.split(":")[1];
      if (!channelPlayerId || !validPlayerIds.includes(channelPlayerId)) return;

      const data = msg.data as Record<string, unknown> | undefined;
      if (!data) return;

      const entityId = data.entity_id;
      const x = data.location_x;
      const z = data.location_z;

      if ((typeof entityId !== "string" && typeof entityId !== "number") || typeof x !== "number" || typeof z !== "number") {
        return;
      }

      onSample({
        entityId: String(entityId),
        x: toHexCoordinate(x),
        z: toHexCoordinate(z),
        receivedAt: Date.now()
      });
    } catch {
      // Ignore parse errors from unknown message frames.
    }
  });

  return ws;
}
