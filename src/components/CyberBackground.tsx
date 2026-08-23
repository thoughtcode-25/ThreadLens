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
    // Only ~20% of columns are active at any time for subtlety
    const activeCols = Math.max(8, Math.floor(totalCols * 0.18));
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
        speed: 0.12 + Math.random() * 0.18,
        opacity: 0.18 + Math.random() * 0.22,
      });
    }

    // ── Floating network nodes ────────────────────────────────
    interface Node { x: number; y: number; vx: number; vy: number; r: number; hue: number }
    const nodes: Node[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 1.4 + Math.random() * 1.6,
      hue: Math.random() < 0.6 ? 212 : 192, // Azure Blue (212) or Sentinel Cyan (192)
    }));

    // ── Static ambient glows (Sentinel Blue & Splunk Cyan) ──────
    const glows = [
      { x: 0.12,  y: 0.10, r: 0.32, color: [0, 120, 212]   }, // Microsoft Azure Blue
      { x: 0.88,  y: 0.85, r: 0.26, color: [6, 182, 212]   }, // Splunk Cyan
      { x: 0.85,  y: 0.08, r: 0.20, color: [59, 130, 246]  }, // Sentinel Blue
      { x: 0.10,  y: 0.88, r: 0.18, color: [14, 165, 233]  }, // Sky Blue
    ];

    let frame = 0;

    const draw = () => {
      frame++;
      const W = canvas.width;
      const H = canvas.height;

      // solid fill on frame 1 then semi-transparent trail
      if (frame === 1) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      ctx.fillRect(0, 0, W, H);

      // ── Ambient radial glows (static, redrawn each frame) ──
      for (const g of glows) {
        const gx = g.x * W;
        const gy = g.y * H;
        const gr = g.r * Math.min(W, H);
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grd.addColorStop(0, `rgba(${g.color[0]},${g.color[1]},${g.color[2]},0.07)`);
        grd.addColorStop(1, `rgba(${g.color[0]},${g.color[1]},${g.color[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      // ── Dot grid ──────────────────────────────────────────
      const GRID = 44;
      ctx.fillStyle = "rgba(56, 189, 248, 0.07)";
      for (let gx = GRID / 2; gx < W; gx += GRID) {
        for (let gy = GRID / 2; gy < H; gy += GRID) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Sparse matrix rain / Telemetry stream ─────────────
      ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
      for (const d of drops) {
        const x = d.col * COL_W;
        const y = d.y * 16;
        // lead char — brighter
        const alpha = d.opacity;
        ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.fillText(CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)], x, y);
        // one ghost char above
        if (d.y > 3) {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.45})`;
          ctx.fillText(CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)], x, y - 16);
        }
        d.y += d.speed;
        if (y > H + 80) {
          d.y = Math.random() * -80;
          d.opacity = 0.18 + Math.random() * 0.22;
        }
      }

      // ── Network nodes + edges ─────────────────────────────
      // move nodes
      for (const nd of nodes) {
        nd.x += nd.vx;
        nd.y += nd.vy;
        if (nd.x < 0 || nd.x > W) nd.vx *= -1;
        if (nd.y < 0 || nd.y > H) nd.vy *= -1;
      }

      // edges
      const EDGE_DIST = 170;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EDGE_DIST) {
            const a = (1 - dist / EDGE_DIST) * 0.16;
            ctx.strokeStyle = `rgba(59, 130, 246, ${a})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // dots
      for (const nd of nodes) {
        const grd = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, nd.r * 4);
        const isC = nd.hue === 192;
        grd.addColorStop(0, isC ? "rgba(6, 182, 212, 0.75)"  : "rgba(59, 130, 246, 0.75)");
        grd.addColorStop(1, isC ? "rgba(6, 182, 212, 0)"     : "rgba(59, 130, 246, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r * 4, 0, Math.PI * 2);
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
