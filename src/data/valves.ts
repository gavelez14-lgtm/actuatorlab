/**
 * Quarter-turn valve library. The actuator-to-valve interface in the 3D model
 * is a single rotation (shaft angle + coupling offset), so additional valve
 * geometries can be added as new components that consume the same rotation.
 */
export interface ValveType {
  id: "ball" | "butterfly" | "plug";
  name: string;
  status: "interactive" | "planned";
  closure: string;
  description: string;
  torqueNote: string;
}

export const VALVES: ValveType[] = [
  {
    id: "ball",
    name: "Ball valve",
    status: "interactive",
    closure: "A ball with a through-bore rotates 90° against seats.",
    description: "Open when the bore is aligned with the pipe; closed when the solid side faces the seats. Shown sectioned in the simulator.",
    torqueNote: "Seat friction typically makes break-out from closed the highest torque point.",
  },
  {
    id: "butterfly",
    name: "Butterfly valve",
    status: "planned",
    closure: "A disc on a shaft rotates 90° in the flow stream.",
    description: "Compact and light. The disc stays in the flow path when open, so it always causes some pressure loss.",
    torqueNote: "Includes seating torque and a dynamic (fluid) torque that depends on flow and disc angle.",
  },
  {
    id: "plug",
    name: "Plug valve",
    status: "planned",
    closure: "A tapered or cylindrical plug with a port rotates 90° in the body.",
    description: "Robust shut-off. Large sealing surface area makes friction an important part of the torque requirement.",
    torqueNote: "Often high and relatively uniform friction torque across the stroke.",
  },
];
