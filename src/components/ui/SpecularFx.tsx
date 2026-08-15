import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl';

/**
 * SpecularFx — WebGL rim-light layer for the shared Button primitive.
 *
 * Renders a mouse-following specular highlight along the parent element's
 * border (React Bits "SpecularButton" effect, refactored as an overlay so any
 * button gets it by default). The WebGL context is created lazily on first
 * pointer proximity and rendering idles when the shine is fully faded, so
 * resting buttons cost nothing on the GPU.
 */

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

export type SpecularFxProps = {
  /** Color of the moving specular highlight. */
  lineColor?: string;
  /** Color of the static edge stroke under the highlight. */
  baseColor?: string;
  /** Brightness of the specular highlight. */
  intensity?: number;
  /** Angular size in degrees of each shine streak along the edge. */
  shineSize?: number;
  /** How gradually each streak fades out at its ends, in degrees. */
  shineFade?: number;
  /** Width of the highlight line in pixels. */
  thickness?: number;
  /** Rotation speed of the sweep when autoAnimate is on. */
  speed?: number;
  /** Point the light toward the cursor. */
  followMouse?: boolean;
  /** Distance in pixels within which the shine fades in as the cursor approaches. */
  proximity?: number;
  /** Keep the shine always on with a rotating sweep, regardless of cursor distance. */
  autoAnimate?: boolean;
};

export function SpecularFx({
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 12,
  shineFade = 40,
  thickness = 2,
  speed = 0.35,
  followMouse = true,
  proximity = 220,
  autoAnimate = false,
}: SpecularFxProps) {
  const fxRef = useRef<HTMLSpanElement>(null);
  const propsRef = useRef({
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate,
  });
  propsRef.current = {
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate,
  };

  useEffect(() => {
    const fx = fxRef.current;
    const host = fx?.parentElement;
    if (!fx || !host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = window.devicePixelRatio || 1;
    let renderer: Renderer | null = null;
    let program: Program | null = null;
    let mesh: Mesh | null = null;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let failed = false;

    const sizeRef = { w: 1, h: 1 };
    let hostRadius = 8;
    let pointerAngle: number | null = null;
    let proximityT = 0;
    let angle = 2.4;
    let idleAngle = 2.4;
    let bright = 0;
    let last = performance.now();

    const lineC = new Color();
    const baseC = new Color();

    const resize = () => {
      if (!renderer || !program) return;
      // Fractional size + explicit center keep the SDF pinned to the exact
      // CSS border, instead of drifting up to a pixel from offsetWidth rounding.
      const rect = host.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      sizeRef.w = w;
      sizeRef.h = h;
      hostRadius = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 8;
      renderer.setSize(w + PAD * 2, h + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
      program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
    };

    const update = (now: number) => {
      raf = requestAnimationFrame(update);
      if (!renderer || !program || !mesh) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = propsRef.current;

      idleAngle += p.speed * dt;
      const steer = p.followMouse && pointerAngle != null && (!p.autoAnimate || proximityT > 0);
      const target = steer ? (pointerAngle as number) : idleAngle;
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));

      // Shine fades in with pointer proximity unless autoAnimate keeps it on
      const brightTarget = p.autoAnimate ? 1 : proximityT;
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

      // Fully faded and no target — skip GPU work until the pointer returns.
      if (!p.autoAnimate && brightTarget === 0 && bright < 0.004) {
        if (bright !== 0) {
          bright = 0;
          program.uniforms.uIntensity.value = 0;
          renderer.render({ scene: mesh });
        }
        return;
      }

      lineC.set(p.lineColor);
      baseC.set(p.baseColor);
      program.uniforms.uAngle.value = angle;
      program.uniforms.uRadius.value =
        Math.min(hostRadius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr;
      program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
      program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
      program.uniforms.uIntensity.value = p.intensity * bright;
      program.uniforms.uShineSize.value = (p.shineSize * Math.PI) / 180;
      program.uniforms.uShineFade.value = (p.shineFade * Math.PI) / 180;
      program.uniforms.uThickness.value = p.thickness * dpr;
      renderer.render({ scene: mesh });
    };

    const init = () => {
      if (renderer || failed) return;
      try {
        renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        const geometry = new Triangle(gl);
        if (geometry.attributes.uv) delete geometry.attributes.uv;

        program = new Program(gl, {
          vertex: VERT,
          fragment: FRAG,
          uniforms: {
            uCenter: { value: [0, 0] },
            uHalfSize: { value: [1, 1] },
            uRadius: { value: 0 },
            uAngle: { value: 2.4 },
            uPx: { value: dpr },
            uLineColor: { value: [1, 1, 1] },
            uBaseColor: { value: [0.32, 0.32, 0.32] },
            uIntensity: { value: 0 },
            uShineSize: { value: 0.17 },
            uShineFade: { value: 0.7 },
            uThickness: { value: 1 },
            uBaseWidth: { value: dpr },
          },
        });

        mesh = new Mesh(gl, { geometry, program });
        gl.canvas.style.display = 'block';
        gl.canvas.style.width = '100%';
        gl.canvas.style.height = '100%';
        fx.appendChild(gl.canvas);

        ro = new ResizeObserver(resize);
        ro.observe(host);
        resize();

        last = performance.now();
        raf = requestAnimationFrame(update);
      } catch {
        failed = true;
        renderer = null;
        program = null;
        mesh = null;
      }
    };

    // Light angle steers toward the pointer (anywhere on the page) and falls
    // back to a slow sweep when the pointer hasn't moved yet.
    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.hypot(dx, dy);
      // Over the button itself the light settles on the diagonal (framing the
      // corners) and gently sways with the cursor position within the button.
      if (dist === 0) {
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (cy - e.clientY) / (rect.height / 2);
        pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
      } else {
        pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
      }
      const t = Math.max(0, 1 - dist / Math.max(propsRef.current.proximity, 1));
      proximityT = t * t * (3 - 2 * t);
      if (proximityT > 0) init();
    };
    window.addEventListener('pointermove', onPointerMove);
    if (propsRef.current.autoAnimate) init();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      if (renderer) {
        const gl = renderer.gl;
        if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  return (
    <span
      ref={fxRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: -PAD,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
