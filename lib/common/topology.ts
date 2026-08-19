/**
 * Shared surface topology helpers.
 *
 * Keep user-facing labels and validation in one place so different pages can
 * reuse consistent topology naming and parsing.
 */

export type SurfaceTopology = "bounded" | "wrap" | "mobius" | "klein";

export const SURFACE_TOPOLOGIES: ReadonlyArray<SurfaceTopology> = [
    "bounded",
    "wrap",
    "mobius",
    "klein",
];

export function isSurfaceTopology(value: string): value is SurfaceTopology {
    return SURFACE_TOPOLOGIES.includes(value as SurfaceTopology);
}

export function surfaceTopologyLabel(topology: SurfaceTopology): string {
    switch (topology) {
        case "wrap":
            return "Torus (wrap)";
        case "mobius":
            return "Möbius strip";
        case "klein":
            return "Klein bottle";
        case "bounded":
            return "Bounded";
    }
}

