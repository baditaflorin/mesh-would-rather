import { useState } from "react";
import {
  MeshNameInput,
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
  const alone = room.peerCount < 1;
  const phaseLabel =
    phase === "composing" ? "write a prompt" : phase === "voting" ? "vote" : "results";

  return (
    <div className="wr-screen">
      <header className="wr-header">
        <h1>{config.appName}</h1>
        <p className="wr-status">
          round {round + 1} · {phaseLabel}
        </p>
      </header>

      <MeshNameInput
        value={name}
        onChange={setName}
        placeholder="your name"
        maxLength={48}
        className="wr-name"
      />

      {phase === "composing" && (
        <form className="wr-prompt-form" onSubmit={setPrompt}>
          <input
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
            placeholder="Would you rather… (option A)"
            maxLength={80}
            aria-label="option A"
          />
          <input
            value={draftB}
            onChange={(e) => setDraftB(e.target.value)}
            placeholder="…or this? (option B)"
            maxLength={80}
            aria-label="option B"
          />
          <button
            type="submit"
            className="wr-set-prompt"
            aria-label="set prompt"
            disabled={!draftA.trim() || !draftB.trim()}
          >
            set prompt
          </button>
          {alone && (
            <p className="wr-hint">
              You&apos;re the only one here. Open this page in a second tab (or share the 📡 invite
              link) so someone can vote — then write a prompt above.
            </p>
          )}
        </form>
      )}

      {(phase === "voting" || phase === "reveal") && (
        <div className="wr-cards">
          {(["a", "b"] as const).map((opt) => {
            const text = opt === "a" ? optA : optB;
            const count = opt === "a" ? aCount : bCount;
            const pct = votes.pctOf(opt);
            const mine = votes.myVote === opt;
            return (
              <div
                key={opt}
                className={`wr-card wr-card-${opt}${mine ? " wr-card-mine" : ""}`}
                data-mine={mine ? "true" : undefined}
              >
                <div className="wr-card-text">{text}</div>
                {phase === "voting" && (
                  <button
                    type="button"
                    onClick={() => votes.vote(opt)}
                    disabled={phase !== "voting" || !name.trim()}
                    aria-label={`I'd rather ${opt.toUpperCase()}`}
                  >
                    {mine ? `✓ your pick` : `I'd rather ${opt.toUpperCase()}`}
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
        <>
          <p className="wr-hint">
            {!name.trim()
              ? "Type your name above to vote."
              : votes.myVote
                ? `You picked ${votes.myVote.toUpperCase()} · ${votes.totalVotes} vote${votes.totalVotes === 1 ? "" : "s"} in — tap reveal when everyone's voted.`
                : `Pick a side · ${votes.totalVotes} vote${votes.totalVotes === 1 ? "" : "s"} in so far.`}
          </p>
          <button
            type="button"
            className="wr-reveal"
            aria-label="reveal"
            onClick={() => phaseState.transition("reveal", { from: "voting" })}
          >
            reveal
          </button>
        </>
      )}

      {phase === "reveal" && (
        <button type="button" className="wr-next" aria-label="next round" onClick={nextRound}>
          next round
        </button>
      )}
    </div>
  );
}
