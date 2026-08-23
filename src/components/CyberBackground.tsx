import { useEffect, useRef } from "react";

const CyberBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Sparse matrix columns ─────────────────────────────────
    const CHAR_SET = "01ABCDEF><:/\\#!%$".split("");
    const COL_W = 28;
    const totalCols = Math.ceil(window.innerWidth / COL_W);
    // ~28% active columns for rich but non-intrusive cyber telemetry
    const activeCols = Math.max(12, Math.floor(totalCols * 0.28));
    interface Drop { col: number; y: number; speed: number; opacity: number }
    const drops: Drop[] = [];
    const usedCols = new Set<number>();
    while (drops.length < activeCols) {
      const col = Math.floor(Math.random() * totalCols);
      if (usedCols.has(col)) continue;
      usedCols.add(col);
      drops.push({
        col,
        y: Math.random() * -120,
        speed: 0.22 + Math.random() * 0.28,
        opacity: 0.22 + Math.random() * 0.24,
      });
    }

    // ── Floating network nodes ────────────────────────────────
    interface Node { x: number; y: number; vx: number; vy: number; r: number; hue: number }
    const nodes: Node[] = Array.from({ length: 36 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: 1.5 + Math.random() * 1.8,
      hue: Math.random() < 0.6 ? 212 : 192, // Azure Blue (212) or Sentinel Cyan (192)
    }));

    // ── Traveling data packets along edges ───────────────────
    interface Packet { from: number; to: number; progress: number; speed: number }
    const packets: Packet[] = [];

    // ── Static ambient glows (Sentinel Blue & Splunk Cyan) ──────
    const glows = [
      { x: 0.15,  y: 0.12, r: 0.38, color: [0, 120, 212]   }, // Microsoft Azure Blue
      { x: 0.85,  y: 0.82, r: 0.32, color: [6, 182, 212]   }, // Splunk Cyan
      { x: 0.80,  y: 0.10, r: 0.26, color: [59, 130, 246]  }, // Sentinel Blue
      { x: 0.12,  y: 0.85, r: 0.24, color: [14, 165, 233]  }, // Sky Blue
    ];

    let frame = 0;

    const draw = () => {
      frame++;
      const W = canvas.width;
      const H = canvas.height;

      // solid fill on frame 1 then semi-transparent trail
      if (frame === 1) {
        ctx.fillStyle = "#0a0f1d";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "rgba(10, 15, 29, 0.25)";
      ctx.fillRect(0, 0, W, H);

      // ── Ambient radial glows (static, redrawn each frame) ──
      for (const g of glows) {
        const gx = g.x * W;
        const gy = g.y * H;
        const gr = g.r * Math.min(W, H);
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grd.addColorStop(0, `rgba(${g.color[0]},${g.color[1]},${g.color[2]},0.09)`);
        grd.addColorStop(1, `rgba(${g.color[0]},${g.color[1]},${g.color[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // ── Dot grid ──────────────────────────────────────────
      const GRID = 40;
      ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
      for (let gx = GRID / 2; gx < W; gx += GRID) {
        for (let gy = GRID / 2; gy < H; gy += GRID) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Sparse matrix rain / Telemetry stream ─────────────
      ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
      for (const d of drops) {
        const x = d.col * COL_W;
        const y = d.y * 16;
        const alpha = d.opacity;
        ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.fillText(CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)], x, y);
        if (d.y > 2) {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.5})`;
          ctx.fillText(CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)], x, y - 16);
        }
        d.y += d.speed;
        if (y > H + 80) {
          d.y = Math.random() * -80;
          d.opacity = 0.22 + Math.random() * 0.24;
        }
      }

      // ── Network nodes + edges ─────────────────────────────
      for (const nd of nodes) {
        nd.x += nd.vx;
        nd.y += nd.vy;
        if (nd.x < 0 || nd.x > W) nd.vx *= -1;
        if (nd.y < 0 || nd.y > H) nd.vy *= -1;
      }

      const EDGE_DIST = 180;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EDGE_DIST) {
            const a = (1 - dist / EDGE_DIST) * 0.22;
            ctx.strokeStyle = `rgba(59, 130, 246, ${a})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();

            // Randomly spawn traveling packets along connected edges
            if (packets.length < 16 && Math.random() < 0.008) {
              packets.push({
                from: i,
                to: j,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02,
              });
            }
          }
        }
      }

      // Draw & update traveling telemetry packets
      for (let p = packets.length - 1; p >= 0; p--) {
        const pkt = packets[p];
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          packets.splice(p, 1);
          continue;
        }
        const nA = nodes[pkt.from];
        const nB = nodes[pkt.to];
        if (nA && nB) {
          const px = nA.x + (nB.x - nA.x) * pkt.progress;
          const py = nA.y + (nB.y - nA.y) * pkt.progress;
          ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw node glow points
      for (const nd of nodes) {
        const grd = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, nd.r * 4.5);
        const isC = nd.hue === 192;
        grd.addColorStop(0, isC ? "rgba(6, 182, 212, 0.85)"  : "rgba(59, 130, 246, 0.85)");
        grd.addColorStop(1, isC ? "rgba(6, 182, 212, 0)"     : "rgba(59, 130, 246, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default CyberBackground;
