import { encode } from "@toon-format/toon";

export function formatData(data: unknown): string {
    return encode(data);
}
