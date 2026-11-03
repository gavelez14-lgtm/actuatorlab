import * as THREE from "three";

/**
 * A helical compression spring whose length can change every frame without
 * reallocating. Vertices are rewritten in place; normals are computed
 * analytically from the tube frame, so no computeVertexNormals() per frame.
 *
 * The helix runs along -X from x = 0 to x = -length, centred on the X axis.
 */
export class HelixSpring {
  readonly geometry = new THREE.BufferGeometry();
  private readonly pos: Float32Array;
  private readonly nrm: Float32Array;
  private readonly segs: number;
  private readonly radial: number;
  private lastLength = -1;

  constructor(
    private readonly turns: number,
    private readonly coilRadius: number,
    private readonly wireRadius: number,
    segmentsPerTurn = 28,
    radialSegments = 8,
  ) {
    this.segs = Math.round(turns * segmentsPerTurn) + 2 * segmentsPerTurn; // + closed end coils
    this.radial = radialSegments;
    const vcount = (this.segs + 1) * (this.radial + 1);
    this.pos = new Float32Array(vcount * 3);
    this.nrm = new Float32Array(vcount * 3);
    const idx: number[] = [];
    for (let i = 0; i < this.segs; i++) {
      for (let j = 0; j < this.radial; j++) {
        const a = i * (this.radial + 1) + j;
        const b = (i + 1) * (this.radial + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    this.geometry.setIndex(idx);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
  }

  /** Rebuild for a new free length. Cheap; skipped if unchanged. */
  setLength(length: number) {
    if (Math.abs(length - this.lastLength) < 1e-5) return;
    this.lastLength = length;
    const { segs, radial, coilRadius: R, wireRadius: r } = this;
    // Closed-and-ground style ends: one dead coil at each end with zero pitch.
    const endTurns = 1;
    const totalTurns = this.turns + 2 * endTurns;
    const deadLen = 2 * r; // each dead coil occupies one wire diameter
    const activeLen = Math.max(0, length - 2 * deadLen - 2 * r);
    const N = new THREE.Vector3();
    const T = new THREE.Vector3();
    const B = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const turn = u * totalTurns;
      const theta = turn * Math.PI * 2;
      // axial position (piecewise: dead coil, active, dead coil)
      let x: number;
      let dx: number; // dx/dturn
      if (turn < endTurns) {
        x = r + deadLen * (turn / endTurns);
        dx = deadLen / endTurns;
      } else if (turn > totalTurns - endTurns) {
        const t = (turn - (totalTurns - endTurns)) / endTurns;
        x = r + deadLen + activeLen + deadLen * t;
        dx = deadLen / endTurns;
      } else {
        const t = (turn - endTurns) / this.turns;
        x = r + deadLen + activeLen * t;
        dx = activeLen / this.turns;
      }
      const cx = -x;
      const cy = R * Math.cos(theta);
      const cz = R * Math.sin(theta);
      // Tangent of the helix (with respect to turn).
      T.set(-dx, -R * Math.sin(theta) * Math.PI * 2, R * Math.cos(theta) * Math.PI * 2).normalize();
      N.set(0, -Math.cos(theta), -Math.sin(theta)); // toward axis, perpendicular to T
      B.crossVectors(T, N).normalize();
      for (let j = 0; j <= radial; j++) {
        const phi = (j / radial) * Math.PI * 2;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const nx = c * N.x + s * B.x;
        const ny = c * N.y + s * B.y;
        const nz = c * N.z + s * B.z;
        this.pos[k] = cx + r * nx;
        this.pos[k + 1] = cy + r * ny;
        this.pos[k + 2] = cz + r * nz;
        this.nrm[k] = nx;
        this.nrm[k + 1] = ny;
        this.nrm[k + 2] = nz;
        k += 3;
      }
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  dispose() {
    this.geometry.dispose();
  }
}
