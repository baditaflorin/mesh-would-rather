import { useState } from "react";
import {
  useNamedPeer,
  usePhase,
  useVotes,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Opt = "a" | "b";

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="wr-screen">
        <h1>{config.appName}</h1>
        <p className="wr-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName } = useNamedPeer(config, room);
  const phaseState = usePhase<"composing" | "voting" | "reveal">(room, "phase", "composing");
  const promptMap = room.doc.getMap<string | number>("prompt");
  const round = (promptMap.get("round") as number | undefined) ?? 0;
  const optA = (promptMap.get("a") as string | undefined) ?? "";
  const optB = (promptMap.get("b") as string | undefined) ?? "";
  const votes = useVotes<Opt>(room, `vote-${round}`);
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");

  const setPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const a = draftA.trim();
    const b = draftB.trim();
    if (!a || !b) return;
    room.doc.transact(() => {
      promptMap.set("a", a);
      promptMap.set("b", b);
      if (typeof promptMap.get("round") !== "number") promptMap.set("round", 0);
    });
    phaseState.transition("voting", { from: "composing" });
    setDraftA("");
    setDraftB("");
  };

  const nextRound = () => {
    room.doc.transact(() => {
      promptMap.set("round", round + 1);
      promptMap.set("a", "");
      promptMap.set("b", "");
    });
    phaseState.transition("composing", { from: "reveal" });
  };

  const phase = phaseState.phase;
  const aCount = votes.tally.get("a") ?? 0;
  const bCount = votes.tally.get("b") ?? 0;
  const winner = aCount === bCount ? null : aCount > bCount ? "a" : "b";

  return (
    <div className="wr-screen">
      <header className="wr-header">
        <h1>{config.appName}</h1>
        <p className="wr-status">
          round {round + 1} · {phase}
        </p>
      </header>

      <div className="wr-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      {phase === "composing" && (
        <form className="wr-prompt-form" onSubmit={setPrompt}>
          <input
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
            placeholder="option A"
            maxLength={80}
            aria-label="option A"
          />
          <input
            value={draftB}
            onChange={(e) => setDraftB(e.target.value)}
            placeholder="option B"
            maxLength={80}
            aria-label="option B"
          />
          <button type="submit" className="wr-set-prompt" aria-label="set prompt">
            set prompt
          </button>
        </form>
      )}

      {(phase === "voting" || phase === "reveal") && (
        <div className="wr-cards">
          {(["a", "b"] as const).map((opt) => {
            const text = opt === "a" ? optA : optB;
            const count = opt === "a" ? aCount : bCount;
            const pct = votes.pctOf(opt);
            return (
              <div key={opt} className={`wr-card wr-card-${opt}`}>
                <div className="wr-card-text">{text}</div>
                {phase === "voting" && (
                  <button
                    type="button"
                    onClick={() => votes.vote(opt)}
                    disabled={phase !== "voting" || !name.trim()}
                    aria-label={`I'd rather ${opt.toUpperCase()}`}
                  >
                    I'd rather {opt.toUpperCase()}
                  </button>
                )}
                {phase === "reveal" && (
                  <div className="wr-result">
                    <div
                      className={`wr-bar wr-bar-${opt}`}
                      data-pct={pct}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="wr-count">
                      {count} · {pct}%
                    </span>
                    {winner === opt && <span className="wr-winner">winner</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {phase === "voting" && (
        <button
          type="button"
          className="wr-reveal"
          aria-label="reveal"
          onClick={() => phaseState.transition("reveal", { from: "voting" })}
        >
          reveal
        </button>
      )}

      {phase === "reveal" && (
        <button type="button" className="wr-next" aria-label="next round" onClick={nextRound}>
          next round
        </button>
      )}
    </div>
  );
}
