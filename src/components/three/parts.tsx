"use client";

import type { ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { SceneLabel } from "./SceneLabel";
import type { ComponentId } from "@/lib/sim/types";

/* Shared picking and labelling helpers for all mechanism models. */

export interface PickProps {
  id: ComponentId;
  children: ReactNode;
  onSelect: (id: ComponentId) => void;
  onHover: (id: ComponentId | null) => void;
}

export function Pick({ id, children, onSelect, onHover }: PickProps) {
  return (
    <group
      userData={{ component: id }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > 4) return; // ignore orbit drags
        onSelect(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(id);
      }}
      onPointerOut={() => onHover(null)}
    >
      {children}
    </group>
  );
}

export function Label({ children, position }: { children: ReactNode; position: [number, number, number] }) {
  return <SceneLabel position={position}>{children}</SceneLabel>;
}


export type PickHandlers = Pick<PickProps, "onSelect" | "onHover">;
