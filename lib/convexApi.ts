import {
    api as generatedApi,
    components,
    internal as generatedInternal,
} from "@/convex/_generated/api";

// This admin workspace is client-only and does not include local Convex source modules,
// so the generated api type can collapse to an empty object. Runtime references still work.
export const api = generatedApi as any;
export const internal = generatedInternal as any;
export { components };
